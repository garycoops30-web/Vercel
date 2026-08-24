# CooperAI site

This folder is ready to deploy to Vercel as-is.

## What's in here
- `index.html` — the site, including Cooper's chat widget and the lead capture form. The chat now calls `/api/chat` instead of the AI API directly (your API key never touches the browser).
- `api/chat.js` — serverless function that talks to Anthropic and logs every conversation to Supabase.
- `api/lead.js` — serverless function that saves captured leads to Supabase and (once configured) emails you a notification via Resend.
- `package.json` — the one dependency (`@supabase/supabase-js`) Vercel needs to install.

## Supabase (already set up)
Project: `cooperai`, URL: `https://espwealndiqbjikzvpvz.supabase.co`
Tables: `conversations` (every chat, logged live) and `leads` (captured contact details).

## Deploy steps
1. **Push this folder to a GitHub repo** (or drag-and-drop deploy directly on vercel.com — either works).
2. **Import the project into Vercel** and set these environment variables in the Vercel project settings:
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `SUPABASE_URL` — `https://espwealndiqbjikzvpvz.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard → Project Settings → API → service_role key (keep this secret, never put it in the HTML)
   - `RESEND_API_KEY` — leave blank until your domain (`cooper-ai.co.za`) is verified with Resend
   - `RESEND_FROM_EMAIL` — e.g. `cooper@cooper-ai.co.za`
   - `LEAD_NOTIFICATION_EMAIL` — the inbox you want lead alerts sent to
3. **Deploy.** Vercel auto-detects the `/api` folder as serverless functions — no extra config needed.
4. **Connect your domain** once `cooper-ai.co.za` is registered — Vercel's project settings → Domains walks you through the DNS.

## What still needs to happen before this is "live-ready"
- Set up a Resend account and verify `cooper-ai.co.za` once the domain is registered — that's what unlocks real lead-notification emails.
- Optionally connect HubSpot's free tier to read from the `leads` table for a proper pipeline view.
- Swap the embedded (base64) mascot image for a hosted image file — it currently bloats the page size. Any static file in this folder (e.g. `/public/cooper.png`) referenced as `<img src="/cooper.png">` would work once you're off the demo file.
