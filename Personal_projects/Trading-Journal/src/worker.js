// Single Worker entry point (Cloudflare Workers Builds, not Pages - this project's deploy
// method, confirmed by its *.workers.dev URL and "Build command / Deploy command" settings
// rather than Pages' "Build output directory"). Routes /api/* to the Claude-backed handlers;
// everything else falls through to the static site in public/ via the ASSETS binding
// (wrangler.jsonc's assets.directory).
import { handleReview } from './routes/review.js';
import { handleClassifyChange } from './routes/classifyChange.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/api/review') return handleReview(request, env);
    if (request.method === 'POST' && url.pathname === '/api/classify-change') return handleClassifyChange(request, env);
    return env.ASSETS.fetch(request);
  },
};
