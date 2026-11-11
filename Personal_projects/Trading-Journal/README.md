# KeshavTrades

A private trading journal for Indian equities and derivatives, built from the existing Trading Journal application. Supports Scalp/Intraday, Options, Swing and Futures journaling, portfolio analytics, weekly reviews and AI-assisted broker-statement imports.

## AI imports
The KeshavTrades AI Import page accepts Zerodha, Groww and generic broker exports (CSV/TSV/TXT/JSON/XLSX/XLS), PDFs and trade screenshots. OpenAI extracts a structured preview; users explicitly confirm before saving a private import batch. Imported batches are staging records and do not silently modify the trade ledger.

## First-time setup
1. Create a **new Supabase project that you own**. Do not reuse the original project's credentials or database.
2. Run `supabase/schema.sql` in the Supabase SQL Editor after replacing the example allow-list email with your own sign-in email. Run `supabase/storage.sql` and the required existing migrations, then `supabase/migrate-keshavtrades-ai-import.sql`.
3. Put your Supabase URL and anon key in `public/config.js`. These are the public client settings; database RLS is the security boundary.
4. Configure Cloudflare Worker secrets: `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. Optional `OPENAI_MODEL` defaults to `gpt-4.1`.
5. Run `npm install`, then `npm test`. Deploy only after reviewing the Supabase project, allow-list, secrets and Cloudflare account with `npm run deploy`.

See [KESHAVTRADES-SETUP.md](docs/KESHAVTRADES-SETUP.md) for the AI endpoint and import flow.

## Privacy and scope
The app requires Supabase authentication and an allow-listed account. OpenAI API keys stay server-side. Uploaded source files are processed for extraction and are not stored as permanent files by the import endpoint; the structured result is stored only after confirmation. Broker CSV import is supported; direct Zerodha/Groww OAuth or order execution is not included. Never upload passwords, API secrets, TOTP seeds or broker login credentials.

## Development
- Frontend: static JavaScript modules in `public/`
- Backend: Cloudflare Worker in `src/worker.js`
- Database and row-level security: `supabase/`
- Tests: `npm test`
