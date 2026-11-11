# KeshavTrades — private AI import setup

This branch rebrands the existing Trading Journal as KeshavTrades and adds an authenticated OpenAI import endpoint.

## Architecture retained
- Cloudflare Worker serves the static web app and the /api/ai/import endpoint.
- Supabase Auth and the existing public.is_veekay() allow-list protect access.
- Existing Scalp, Options, Swing, Futures, journal and performance calculations are retained.
- OpenAI API keys are server-side Worker secrets only; never put them in public/config.js.

## One-time Supabase migration
Run supabase/migrate-keshavtrades-ai-import.sql in the Supabase SQL Editor. This creates a private staging table for AI extraction batches. It deliberately does not silently insert AI guesses into the live trade ledger.

## Cloudflare Worker secrets
From this project directory, configure:
- npx wrangler secret put OPENAI_API_KEY
- npx wrangler secret put SUPABASE_URL
- npx wrangler secret put SUPABASE_ANON_KEY

Use the existing Supabase project URL and public anon key for the latter two secrets. They are used only by the Worker to validate the signed-in user's JWT against the existing is_veekay() database gate. The OpenAI key must be a server-side secret.

Optional: npx wrangler secret put OPENAI_MODEL
Default model is gpt-4.1.

## Upload flow
The AI Import page accepts CSV, TSV, TXT, JSON, XLSX, XLS, PDF and common image files up to 12 MB. Excel workbooks are converted to sheet text in the browser. PDFs and images are sent as file/image inputs. The Worker checks the Supabase session and allow-list before calling OpenAI. Extracted records are previewed, downloadable as JSON and saved to the private ai_import_batches staging table after explicit confirmation.

The import batch is not yet treated as a canonical trade ledger row: confirm matching, fees, quantities, partial fills and trade grouping before a later reconciliation/import step writes to Scalp or Options/Swing tables.

## Deployment
After the migration and Worker secrets are configured:
- npm install
- npx wrangler deploy

The existing login and Supabase email allow-list remain the access gate. Do not change the allow-list or make the Supabase storage bucket public as part of this rebrand.
