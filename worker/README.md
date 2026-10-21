# Gemini proxy for the AI Assistant (Cloudflare Workers, free plan)

The site is static and public, so a key placed in the page can be read by anyone (and GitHub blocks
real keys from being committed). This Worker keeps the key as a secret and forwards requests to Gemini.

## Set up (about 10 minutes)
1. Create a free account at https://dash.cloudflare.com and open **Workers & Pages → Create → Create Worker**.
2. Name it (e.g. `cic-gemini-proxy`), deploy, then **Edit code** and paste in the contents of `gemini-proxy.js`. Save and deploy.
3. In the Worker's **Settings → Variables and Secrets** add:
   - `GEMINI_API_KEY` (type **Secret**): your Gemini API key.
   - `ALLOWED_ORIGIN` (type **Text**): your site's origin, e.g. `https://bwclark14.github.io` (no path, no trailing slash).
4. Copy the Worker's address (e.g. `https://cic-gemini-proxy.your-name.workers.dev`).
5. Put it in `assistant-config.js` as `proxyUrl` and commit. Teachers then paste nothing.

## Keep it safe
- In Google AI Studio / Google Cloud, set a quota or budget cap on the key, and consider a key that is **not**
  tied to a service account with broad permissions. Create a plain Gemini API key if you can.
- If a key has ever been pasted into a chat, an email or a public page, rotate it and use a new one in the Worker secret.
- The Worker only accepts requests from `ALLOWED_ORIGIN`, only the three listed models, and caps size, output length and request rate.
- Update the `MODELS` list in `gemini-proxy.js` if you change the models in `assistant-config.js`.
