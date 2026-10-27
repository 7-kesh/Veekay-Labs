// Single Worker entry point (Cloudflare Workers, deployed with `npx wrangler deploy`). It only serves
// the static site in public/ through the ASSETS binding (wrangler.jsonc's assets.directory). The
// Claude-backed /api/review and /api/classify-change routes were removed 2026-10-27 - the app no
// longer calls Claude; reviews happen in Claude chat from the export zip.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
