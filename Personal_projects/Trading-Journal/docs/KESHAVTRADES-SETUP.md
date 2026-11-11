# KeshavTrades — Supabase deployment and AI import setup

## Architecture
- Static frontend: host the `public/` directory on a static hosting provider.
- Supabase Auth, Postgres, RLS and private Storage protect the journal.
- Supabase Edge Function `ai-import` handles authenticated `POST` requests and calls the OpenAI Responses API.
- No Cloudflare Worker or Cloudflare Access is required.

## 1. Supabase project and database
The configured project already contains the KeshavTrades schema, RLS policies, private storage and AI import staging table. Confirm the email you use to sign in is present in `public.allowed_emails`. The currently allow-listed account is the one supplied by the operator.

Create your Supabase Auth user using the same allow-listed email. Allow-list membership does not itself create an Auth user.

## 2. Configure the frontend
The repository's `public/config.js` contains the Supabase Project URL and publishable key. These values are intended for browser use. Never put a Supabase secret/service-role key or OpenAI API key in frontend code.

## 3. Add the OpenAI secret
In the Supabase Dashboard, open **Project → Edge Functions → Secrets** (or **Edge Function Secrets**), and add:

- Name: `OPENAI_API_KEY`
- Value: your OpenAI API key

Optional:
- Name: `OPENAI_MODEL`
- Value: `gpt-4.1`

Do not paste the OpenAI key into chat, GitHub, SQL, or `public/config.js`. OpenAI API usage is billed separately from a ChatGPT subscription.

The function reads the Supabase project URL and publishable/anon key from the Supabase-provided Edge Function environment. It verifies the caller's Supabase user session and then checks `public.is_veekay()` against the allow-list before sending content to OpenAI.

## 4. Deploy the Edge Function
From the project directory, with the Supabase CLI linked to the correct project:

```sh
supabase functions deploy ai-import
```

The function source is `supabase/functions/ai-import/index.ts`. It uses JWT verification at the Supabase Edge Function gateway and performs the email allow-list check again inside the handler.

If using the Supabase Dashboard deployment flow instead, deploy the same function source and ensure JWT verification is enabled.

## 5. Host the frontend
Deploy the contents of `public/` to a static hosting provider of your choice. Set the published directory to `public`; no build step is required. Supabase Edge Functions host the backend endpoint but do not serve the static frontend.

The AI import page calls the Edge Function using the Supabase client, so it does not depend on a same-origin `/api/ai/import` route.

## 6. Verify
1. Sign in with the allow-listed Supabase Auth account.
2. Confirm an unlisted account cannot use the AI import endpoint.
3. Import a small CSV and inspect the extracted preview.
4. Test a PDF and an image statement.
5. Save a batch only after reviewing it; verify it appears in `ai_import_batches`.
6. Confirm no rows were silently inserted into the canonical trade ledger.

## AI upload flow
The AI Import page accepts CSV, TSV, TXT, JSON, XLSX, XLS, PDF and PNG/JPG/WEBP files up to 12 MB. Excel workbooks are converted to sheet text in the browser. PDF and image contents are sent to the authenticated Supabase Edge Function. The function validates the signed-in Supabase user and allow-list before calling the OpenAI Responses API.

The user receives a structured preview, confidence labels, warnings and evidence-based observations. The result can be downloaded as JSON and saved to the private `ai_import_batches` staging table after explicit confirmation. The function does not persist the original upload or store the OpenAI Response object (`store: false`). The file is transmitted to OpenAI for processing and remains subject to the API account's applicable data controls and abuse-monitoring retention; do not treat this as a zero-retention guarantee. Staging batches do not silently modify canonical trade rows.

## Scope and safety
- Zerodha, Groww and generic broker support currently means broker-export file imports.
- Direct broker OAuth synchronisation, live trading and order placement are not implemented.
- Do not upload broker passwords, API secrets, TOTP seeds or login credentials.
- Check partial fills, quantities, average prices, taxes/fees and net P&L against the original broker report before using the data for performance or tax calculations.
- AI observations are journaling aids, not investment advice.
