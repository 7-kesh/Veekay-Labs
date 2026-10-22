// Piggy Payday market proxy (Cloudflare Worker)
// Fetches daily S&P 500 / NASDAQ prices from Yahoo Finance and adds the CORS header
// browsers need. Only the two symbols below are allowed, so this can't be used as an open proxy.

const ALLOWED_SYMBOLS = ['^GSPC', '^IXIC'];
const CACHE_SECONDS = 300;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function reply(body, status) {
  return new Response(body, { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'GET') return reply('{"error":"method not allowed"}', 405);

    // The app sends ?url=<encoded Yahoo chart URL>; we only read the symbol out of it.
    let symbol;
    try {
      const target = new URL(new URL(request.url).searchParams.get('url'));
      if (target.hostname !== 'query1.finance.yahoo.com') throw new Error('host');
      symbol = decodeURIComponent(target.pathname.split('/').pop());
    } catch (e) {
      return reply('{"error":"bad request"}', 400);
    }
    if (!ALLOWED_SYMBOLS.includes(symbol)) return reply('{"error":"symbol not allowed"}', 403);

    // We build the upstream URL ourselves instead of forwarding the caller's.
    const upstream = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(symbol) + '?range=1y&interval=1d';
    const res = await fetch(upstream, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    });
    return new Response(res.body, {
      status: res.status,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + CACHE_SECONDS },
    });
  },
};
