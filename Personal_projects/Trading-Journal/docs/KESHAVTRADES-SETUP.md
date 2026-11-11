# KeshavTrades — private deployment and AI import setup

## Architecture
- Cloudflare Worker serves the static application and authenticated `POST /api/ai/import`.
- Supabase Auth and the existing `public.is_veekay()` allow-list protect data and AI import access.
- The original Scalp, Options, Swing, Futures, journal, strategy and performance features remain.
- OpenAI API keys are Cloudflare Worker secrets only. Never put them in `public/config.js`.

## 1. Create the private data project
Create a new Supabase project owned by the KeshavTrades operator. Do not reuse the source project's Supabase database or keys.

Run the SQL files in this order in Supabase SQL Editor:

1. `supabase/schema.sql` — replace the example `you@example.com` with the exact email used to sign in before running.
2. `supabase/migrate-wrapup.sql` — creates the journal entries, learnings and improvements tables.
3. `supabase/migrate-areas.sql` — depends on the improvements table and adds area-specific journaling.
4. `supabase/migrate-futures.sql`.
5. `supabase/migrate-greeks.sql`.
6. `supabase/migrate-section3-assessments.sql`.
7. `supabase/migrate-split-mom-ttm.sql`.
8. `supabase/storage.sql` — creates the private screenshots bucket.
9. `supabase/migrate-keshavtrades-ai-import.sql` — creates the private AI import staging table.

The migrations are intended to be run once in this order. Keep a copy of the SQL execution results. Create your Supabase Auth user using the same allow-listed email.

## 2. Configure the frontend
Edit `public/config.js` with the new Supabase project's Project URL and anon/public key. These are browser-visible client settings; Row Level Security is the security boundary. Never use a service-role key in the browser.

## 3. Configure Cloudflare Worker secrets
From `Personal_projects/Trading-Journal`, configure:

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
# Optional; defaults to gpt-4.1
npx wrangler secret put OPENAI_MODEL
``

Use the same new Supabase Project URL and anon/public key for the Worker secrets. The OpenAI API key is billed separately from ChatGPT subscriptions.

## 4. Make hosting private
The app has Supabase login plus an email allow-list. This protects the application data and API, but a `workers.dev` address is still publicly reachable as a URL.

For an additional network-level private gate, attach a custom domain you control to the Worker and create a Cloudflare Access self-hosted application for that hostname. Add an allow policy for your own email identity. Keep Supabase authentication enabled as a second layer. Do not describe a public `workers.dev` hostname as private-network-only.

## 5. Test and deploy
```sh
npm install
npm run check
npm test
npx wrangler deploy
``

Do not deploy until the Supabase schema, allow-list, frontend config and Worker secrets have been configured. Verify login, logout, a small CSV import and a sample image/PDF import after deployment.

## AI upload flow
The AI Import page accepts CSV, TSV, TXT, JSON, XLSX, XLS, PDF and PNG/JPG/WEBP files up to 12 MB. Excel workbooks are converted to sheet text in the browser. PDF and image contents are sent to the secured Worker endpoint. The Worker validates the signed-in Supabase user and allow-list before calling the OpenAI Responses API.

The user receives a structured preview, confidence labels, warnings and evidence-based observations. The result can be downloaded as JSON and saved to the private `ai_import_batches` staging table after explicit confirmation. The Worker does not persist the original upload or store the OpenAI Response object (`store: false`). The file is still transmitted to OpenAI for processing and remains subject to the API account's applicable data controls and abuse-monitoring retention; do not treat this as a zero-retention guarantee. Staging batches do not silently modify canonical trade rows.

## Scope and safety
- Zerodha, Groww and generic broker support currently means broker-export file imports.
- Direct broker OAuth synchronisation, live trading and order placement are not implemented.
- Do not upload broker passwords, API secrets, TOTP seeds or login credentials.
- Check partial fills, quantities, average prices, taxes/fees and net P&L against the original broker report before using the data for performance or tax calculations.
- AI observations are journaling aids, not investment advice.
