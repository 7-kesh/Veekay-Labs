# Venara Inc — website

A one-page React site (Vite) covering Venara Inc's AI product consulting offer and the founder profile. It has no backend. The build is purely static, so it runs on Vercel's free tier.

## Structure
| File | What it holds |
|---|---|
| `src/content.js` | **All copy**: services, founder bio, timeline, engagements, contact email. Edit text here. |
| `src/App.jsx` | Page sections as React components |
| `src/styles.css` | Styling (light and dark mode, responsive) |
| `public/favicon.svg` | Tab icon |

## Run locally
```
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## Deploy to Vercel (free)
1. Push this folder to a GitHub repo, e.g. `venara-site`:
   ```
   git init && git add . && git commit -m "Venara site"
   gh repo create venara-site --private --source=. --push
   ```
2. In vercel.com, click Add New → Project and import the repo. Vercel detects **Vite** automatically (build command `npm run build`, output `dist`). Click Deploy.
3. Every push to `main` then redeploys automatically.
4. Custom domain: go to Project → Settings → Domains, add `venara.xyz` (or your domain), and set the DNS records Vercel shows.

## Before going live
- [ ] Replace `CONTACT_EMAIL` in `src/content.js` with a Venara domain address.
- [ ] Confirm the engagement lengths (2–4 wks / 6–12 wks / retainer).
- [ ] Optional: add a headshot to the Founder section.
