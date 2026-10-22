# Piggy Payday (Cloudflare Pages + Supabase)

```
public/index.html        the app (single page)
public/cloud.js          Supabase data layer + email-code sign-in screen
public/config.js         YOUR Supabase URL + anon key go here
functions/api/market.js  Cloudflare Pages Function: live S&P 500 / NASDAQ prices
supabase/schema.sql         tables, read-only access rules, live sync   (run 1st)
supabase/atomic-writes.sql  safe money-move functions; blocks direct writes (run 2nd, safe to re-run)
supabase/seed.sql           your existing balances + history             (run 3rd)
```

## One-time setup

### 1. Supabase
1. https://supabase.com/dashboard -> **New project** (name it `piggy-payday`, pick a region near you, save the DB password somewhere).
2. **SQL Editor** -> New query -> paste `supabase/schema.sql`.
   **Before running**, replace `you@example.com` with the email(s) allowed to sign in. Run it.
3. New query -> paste `supabase/atomic-writes.sql` -> Run.
4. New query -> paste `supabase/seed.sql` -> Run. (Copies your 3 banks and 17 transactions.)
5. *(Optional)* Sign-in works with the default email: tap the link in it. To also show a typeable code, edit **both** the **Magic link** and **Confirm signup** templates (Authentication -> Emails -> Templates) to include the code:
   ```html
   <h2>Your Piggy Payday code</h2>
   <p>Enter this code: <b>{{ .Token }}</b></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a>.</p>
   ```
6. **Project Settings -> API**: copy the **Project URL** and the **anon public** key into `public/config.js`.

### 2. Cloudflare Pages
From this folder:
```
npx wrangler login
npx wrangler pages deploy public --project-name piggy-payday
```
The first deploy asks to create the project (production branch: `main`). It prints your URL, e.g. `https://piggy-payday.pages.dev`.

### 3. Back in Supabase
**Authentication -> URL Configuration**: set **Site URL** to your Pages URL (so the email link lands on the app).

Open the URL, enter your email, type the code. Phones/tablets stay signed in.

## Updating later
Edit files, re-run the `wrangler pages deploy` line.

## Notes
- The anon key in `config.js` is public by design. Security comes from the database rules: only emails in `allowed_emails` can read, and all writes go through the checked functions in `atomic-writes.sql` (see Security model below).
- To add someone: `insert into public.allowed_emails values ('their@email.com');` in the SQL editor.
- If Supabase isn't configured the app still runs, saving in that browser only.
- Market data: Yahoo Finance via `/api/market`, cached 5 minutes. If it's unreachable the app shows the simulated "Practice market".

## Security model
- **Reads:** only emails in `allowed_emails` (checked by `is_family()`).
- **Writes:** nobody can write to `docs` directly (not even a signed-in user with a modified page). The only way to change money is the functions `piggy_deposit`, `piggy_withdraw`, `piggy_invest`, `piggy_sell` in `atomic-writes.sql`. Each one locks the rows it touches and does the whole step in one transaction, so two devices can't overwrite each other, a half-finished step can't happen, and the database refuses to go below $0.
- **Known limits:** everyone on the allow-list has full control (no parent/kid roles yet), and the database can't verify live market prices, so `piggy_invest`/`piggy_sell` trust the level the app sends (they reject only absurd values).
- **Harden Supabase (dashboard):**
  - *Authentication -> Sign In / Providers -> turn OFF "Allow new users to sign up".* First add each person under Authentication -> Users -> Add user.
  - *Authentication -> Rate Limits:* keep the email limit low (a family needs only a few sign-in emails an hour).
  - Verify signups are off: `curl -s https://<project>.supabase.co/auth/v1/settings -H "apikey: <anon key>"` should show `"disable_signup": true`.

## Backups
The free Supabase plan has no automatic backups, and an unused project pauses after about a week (data is kept; click Restore in the dashboard).
- In the app (when signed in), tap **Download a backup** at the bottom for a JSON file.
- To restore, paste the file's contents between the quotes below in the SQL Editor:
  ```sql
  insert into public.docs (collection, id, data)
  select d->>'collection', d->>'id', d->'data'
  from jsonb_array_elements('<PASTE THE WHOLE FILE CONTENTS HERE>'::jsonb->'docs') d
  on conflict (collection, id) do update set data = excluded.data;
  ```
