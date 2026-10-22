# Piggy Payday (Cloudflare Pages + Supabase)

```
public/index.html        the app (single page)
public/cloud.js          Supabase data layer + email-code sign-in screen
public/config.js         YOUR Supabase URL + anon key go here
functions/api/market.js  Cloudflare Pages Function: live S&P 500 / NASDAQ prices
supabase/schema.sql      tables, security rules, live sync   (run first)
supabase/seed.sql        your existing balances + history     (run second)
```

## One-time setup

### 1. Supabase
1. https://supabase.com/dashboard -> **New project** (name it `piggy-payday`, pick a region near you, save the DB password somewhere).
2. **SQL Editor** -> New query -> paste `supabase/schema.sql`.
   **Before running**, replace `you@example.com` with the email(s) allowed to sign in. Run it.
3. New query -> paste `supabase/seed.sql` -> Run. (Copies your 3 banks and 17 transactions.)
4. *(Optional)* Sign-in works with the default email: tap the link in it. To also show a typeable code, edit **both** the **Magic link** and **Confirm signup** templates (Authentication -> Emails -> Templates) to include the code:
   ```html
   <h2>Your Piggy Payday code</h2>
   <p>Enter this code: <b>{{ .Token }}</b></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a>.</p>
   ```
5. **Project Settings -> API**: copy the **Project URL** and the **anon public** key into `public/config.js`.

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
- The anon key in `config.js` is public by design. Security comes from the database rule in `schema.sql`: only emails in `allowed_emails` can read or write.
- To add someone: `insert into public.allowed_emails values ('their@email.com');` in the SQL editor.
- If Supabase isn't configured the app still runs, saving in that browser only.
- Market data: Yahoo Finance via `/api/market`, cached 5 minutes. If it's unreachable the app shows the simulated "Practice market".
