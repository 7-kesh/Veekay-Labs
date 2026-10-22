// Cloudflare Pages Function: GET /api/market?url=<encoded Yahoo chart URL>
// Fetches daily S&P 500 / NASDAQ prices from Yahoo Finance. Same origin as the app, so no CORS needed.
// Only the two symbols below are allowed, so this can't be used as an open proxy.

const ALLOWED_SYMBOLS = ['^GSPC', '^IXIC'];
const CACHE_SECONDS = 300;

function reply(body, status) {
  return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request }) {
  let symbol;
  try {
    const target = new URL(new URL(request.url).searchParams.get('url'));
    if (target.hostname !== 'query1.finance.yahoo.com') throw new Error('host');
    symbol = decodeURIComponent(target.pathname.split('/').pop());
  } catch (e) {
    return reply('{"error":"bad request"}', 400);
  }
  if (!ALLOWED_SYMBOLS.includes(symbol)) return reply('{"error":"symbol not allowed"}', 403);

  // Build the upstream URL ourselves instead of forwarding the caller's.
  const upstream = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(symbol) + '?range=1y&interval=1d';
  const res = await fetch(upstream, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
  });
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + CACHE_SECONDS },
  });
}
