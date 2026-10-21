/**
 * Cloudflare Worker: a tiny proxy so the Gemini API key stays secret.
 * The assistant page calls this Worker; the Worker adds the key and forwards the request to Google.
 *
 * Settings (Worker → Settings → Variables and Secrets):
 *   GEMINI_API_KEY   (Secret)  your Gemini API key
 *   ALLOWED_ORIGIN   (Text)    your site's origin, e.g. https://bwclark14.github.io  (no path, no trailing slash)
 */
const MODELS = new Set(['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
const MAX_BODY_BYTES = 60 * 1024;
const MAX_OUTPUT_TOKENS = 16000;
const WINDOW_MS = 60 * 1000, MAX_PER_WINDOW = 6;       // per visitor IP, per Worker instance (soft limit)
const hits = new Map();

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN;
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const fail = (status, message) => new Response(JSON.stringify({ error: { code: status, message, status: 'PROXY' } }),
      { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed) return fail(403, 'This proxy only serves the CIC site.');
    if (request.method !== 'POST') return fail(405, 'POST only.');
    if (!env.GEMINI_API_KEY) return fail(500, 'The proxy has no GEMINI_API_KEY set.');

    const m = new URL(request.url).pathname.match(/^\/v1beta\/models\/([\w.-]+):streamGenerateContent$/);
    if (!m || !MODELS.has(m[1])) return fail(404, 'Unknown model.');

    // soft per-IP limit
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown', now = Date.now();
    const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) return fail(429, 'Too many requests. Please wait a minute.');
    recent.push(now); hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail(413, 'Request too large.');
    let body; try { body = JSON.parse(raw); } catch (e) { return fail(400, 'Bad JSON.'); }
    body.generationConfig = { ...(body.generationConfig || {}), maxOutputTokens: Math.min(Number((body.generationConfig || {}).maxOutputTokens) || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS) };
    delete body.tools; delete body.cachedContent;           // only plain text generation is allowed

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m[1]}:streamGenerateContent?alt=sse`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(body) });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'content-type': upstream.headers.get('content-type') || 'text/event-stream', 'cache-control': 'no-store' }
    });
  }
};
