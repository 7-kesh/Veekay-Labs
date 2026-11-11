# KeshavTrades

A private trading and investment journal for Indian markets. The workspace is organised into four areas: Intraday, Swing, Investing and MF / ETFs. It includes trade planning and review, portfolio analytics, weekly reviews, and AI-assisted broker-statement imports. The Investing area tracks long-term equity holdings, while MF / ETFs provides dedicated mutual-fund and ETF transaction and portfolio tracking.

## Architecture
- Frontend: static JavaScript application in `public/`; host it on a static hosting provider of your choice.
- Authentication, database and private storage: Supabase.
- AI import backend: Supabase Edge Function `ai-import` (no Cloudflare Worker required).
- OpenAI API key: Supabase Edge Function secret only.

## AI imports
The KeshavTrades AI Import page accepts Zerodha, Groww and generic broker exports (CSV/TSV/TXT/JSON/XLSX/XLS), PDFs and trade screenshots. OpenAI extracts a structured preview; users explicitly confirm before saving a private import batch. Imported batches are staging records and do not silently modify the trade ledger.

## First-time setup
1. Use the configured Supabase project and ensure the signed-in email is present in `public.allowed_emails`.
2. Set `public/config.js` with the Supabase Project URL and publishable key. These are browser-visible settings; RLS is the security boundary.
3. Add `OPENAI_API_KEY` as a Supabase Edge Function secret. Optional `OPENAI_MODEL` defaults to `gpt-4.1`.
4. Deploy the `ai-import` Edge Function from `supabase/functions/ai-import/index.ts`.
5. Host the `public/` directory on a static hosting provider. Supabase Edge Functions provide the API, not static website hosting.
6. Create your Supabase Auth user using the allow-listed email, then test login, a small CSV import and a sample PDF/image import.

See [KESHAVTRADES-SETUP.md](docs/KESHAVTRADES-SETUP.md) for exact deployment and secret setup steps.

## Privacy and scope
The app requires Supabase authentication and an email allow-list. The Edge Function validates the signed-in user and allow-list before calling OpenAI. The static frontend may be publicly reachable at its hosting URL, but journal data and AI import operations remain protected by Supabase Auth and Row Level Security. OpenAI API keys stay server-side. Uploaded source files are processed for extraction and are not stored as permanent files by the import endpoint; the structured result is stored only after confirmation. The OpenAI API processes the submitted content under the API account's applicable data controls and abuse-monitoring retention; this is not a zero-retention guarantee. Broker CSV import is supported; direct Zerodha/Groww OAuth or order execution is not included. Never upload passwords, API secrets, TOTP seeds or broker login credentials.

## Development
- Frontend: static JavaScript modules in `public/`
- Backend: Supabase Edge Function in `supabase/functions/ai-import/`
- Database and row-level security: `supabase/`
- Tests: `npm test`


## Investing and MF / ETFs
- Investing records equity buy/sell transactions and calculates open units and average cost.
- MF / ETFs records mutual fund and ETF purchases/redemptions, including SIP-style recurring buys.
- Latest market prices or NAVs are entered manually; there is no live market-data feed or automatic broker sync.
- New investment and fund data is owner-scoped by Supabase Row Level Security.
