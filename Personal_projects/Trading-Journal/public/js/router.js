// Tiny hash router. Routes are registered as {pattern: 'scalp/:id', render: async (params, el) => ...}.
const routes = [];
let mountEl = null;

export function register(pattern, render) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:[^/]+/g, m => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
  routes.push({ re, keys, render });
}

export function mount(el) {
  mountEl = el;
  window.addEventListener('hashchange', dispatch);
}

export function navigate(path) {
  window.location.hash = '#/' + path;
}

export async function dispatch() {
  if (!mountEl) return;
  const path = (window.location.hash || '#/stats/portfolio').slice(2);
  const [route, qs] = path.split('?');
  const params = {};
  if (qs) for (const [k, v] of new URLSearchParams(qs)) params[k] = v;
  for (const r of routes) {
    const m = r.re.exec(route);
    if (!m) continue;
    r.keys.forEach((k, i) => { params[k] = m[i + 1]; });
    mountEl.innerHTML = '<p class="muted">Loading…</p>';
    try {
      await r.render(params, mountEl);
    } catch (err) {
      console.error(err);
      mountEl.innerHTML = `<p class="neg">${String(err.message || err)}</p>`;
    }
    return;
  }
  mountEl.innerHTML = '<p class="neg">Not found.</p>';
}
