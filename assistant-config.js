/* Settings for assistant.html. This file is public (the site is static), so NEVER put a secret key in it.

   How the assistant reaches Gemini, in order of preference:
   1. proxyUrl: the address of your own small proxy (see worker/README.md). The proxy holds the Gemini key as a
      secret, so nothing sensitive is in the page and teachers paste nothing.
   2. geminiKey: leave EMPTY. Anything here is readable by every visitor (and GitHub will refuse to publish real keys).
   3. If both are empty, each teacher pastes their own free key from aistudio.google.com/apikey. */
window.CIC_ASSISTANT = {
    proxyUrl: '',      // e.g. 'https://cic-gemini-proxy.your-name.workers.dev'
    geminiKey: '',
    // Tried in order; the next is used if one is unavailable or out of free quota.
    models: ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
    minSecondsBetween: 8,   // pause between generations, per browser
    maxPerDay: 40           // generations per browser per day
};
