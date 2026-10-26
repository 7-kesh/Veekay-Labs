// Port of app/templates/_macros.html's shots_panel + app/static/app.js's upload/review wiring.
// Shared by every trade-detail view (scalp now; options/swing can reuse this once their forms
// exist). Screenshots live in Supabase Storage; the review itself goes through the
// /api/review Pages Function so the Anthropic key never reaches the browser.
import { listAttachments, uploadAttachment, deleteAttachment, listReviews, saveReview, attachmentToBase64, getPatternDigest } from './db.js';
import { exportTrade } from './export-bundle.js';
import { getSession } from './auth.js';
import { GATE_LABELS } from './constants.js';
import { esc, localDatetime } from './format.js';
import { md } from './markdown.js';

// Screenshots are kept at original resolution (they are evidence for Claude chat, where small
// axis text and indicator colors must stay readable). Only absurdly large images are scaled
// down, as PNG, so a stray 8K capture can't blow the storage quota.
const MAX_SIDE = 3200;
function shrink(file) {
  return new Promise((resolve) => {
    if (file.type === 'image/gif') return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const long = Math.max(img.width, img.height);
      if (long <= MAX_SIDE) { URL.revokeObjectURL(url); return resolve(file); }
      const s = MAX_SIDE / long;
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); resolve(b ? new File([b], 'shot.png', { type: 'image/png' }) : file); }, 'image/png');
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

// The in-app API review is switched off: reviews now happen in Claude chat (the trade-journal
// skill) from an "Export for Claude" bundle. The code stays so it can be turned back on.
const API_REVIEW_ENABLED = false;

function renderReviewOut(out, rev) {
  if (!rev) { out.innerHTML = ''; return; }
  out.innerHTML = `<div class="muted">Latest review, ${esc(localDatetime(rev.created_at))} (${esc(rev.model)})</div>
    <div class="md">${md(rev.text_body)}</div>`;
  const stored = rev.proposed_json;
  if (stored && stored.gates) {
    const g = document.createElement('div');
    g.className = 'gaterow';
    g.innerHTML = Object.entries(GATE_LABELS).map(([k, label]) => {
      const r = stored.gates[k]; if (!r) return '';
      const cls = r.result === 'pass' ? 'ok' : (r.result === 'insufficient_evidence' ? 'warn' : 'neg');
      return `<span class="gatechip ${cls}" title="${esc(r.evidence)}">${esc(label)}</span>`;
    }).join('');
    out.appendChild(g);
  }
  if (stored && stored.proposed) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn applyProposedBtn'; btn.style.marginTop = '8px';
    btn.textContent = 'Fill in Claude’s suggestion';
    btn.dataset.proposed = JSON.stringify(stored.proposed);
    out.appendChild(btn);
  }
}

// opts: { kind, refId (null if not saved yet), ensureRefId: async () => {id, tradeData},
//         tradeData, rulesText, model, onApplyProposed(proposed) }
// ensureRefId is called lazily on the first upload/review action when refId starts out null -
// it should save a draft trade from the current form and return its id, so screenshots and
// review are usable before the user ever clicks Save (Veekay's "always enable" request).
export async function mountReviewPanel(container, opts) {
  let refId = opts.refId || null;
  let tradeData = opts.tradeData;
  async function ensureRefId() {
    if (refId) return refId;
    const r = await opts.ensureRefId();
    refId = r.id; tradeData = r.tradeData;
    return refId;
  }

  const shots = refId ? await listAttachments(opts.kind, refId) : [];
  const revs = refId ? await listReviews(opts.kind, refId) : [];

  container.innerHTML = `
    <section class="card" id="review">
      <h2>Screenshots and review</h2>
      <div class="drop" id="drop" tabindex="0">Paste a screenshot (Ctrl/Cmd+V), drop images here, or <label class="link">choose files<input type="file" id="pick" accept="image/*" multiple hidden></label></div>
      <div class="thumbs" id="thumbs">${shots.map(s => `<figure data-aid="${s.id}"><a href="${esc(s.url)}" target="_blank"><img src="${esc(s.url)}" alt="screenshot"></a><button type="button" class="x" title="Remove">×</button></figure>`).join('')}</div>
      <div class="row">
        <button type="button" class="btn primary" id="exportBundle">Export for Claude</button>
        ${API_REVIEW_ENABLED ? '<button type="button" class="btn" id="runReview">Review with Claude</button>' : ''}
        <span class="muted" id="reviewStatus">Exports the last saved version of this trade with its screenshots (.zip).</span>
      </div>
      <div id="reviewOut" class="review"></div>
      ${revs.length > 1 ? `<details><summary>${revs.length - 1} earlier review(s)</summary>
        ${revs.slice(1).map(r => `<div class="muted">${esc(localDatetime(r.created_at))} (${esc(r.model)})</div><div class="md">${md(r.text_body)}</div>`).join('')}
      </details>` : ''}
    </section>
  `;

  const out = container.querySelector('#reviewOut');
  renderReviewOut(out, revs[0]);

  const drop = container.querySelector('#drop'), thumbs = container.querySelector('#thumbs'), status = container.querySelector('#reviewStatus');

  async function upload(files) {
    files = Array.from(files).filter(f => f.type.indexOf('image/') === 0);
    if (!files.length) return;
    status.textContent = 'Uploading…';
    const id = await ensureRefId();
    for (const f of files) {
      const shrunk = await shrink(f);
      const res = await uploadAttachment(opts.kind, id, shrunk);
      if (res) {
        const fig = document.createElement('figure'); fig.dataset.aid = res.id;
        fig.innerHTML = `<a href="${esc(res.url)}" target="_blank"><img src="${esc(res.url)}" alt="screenshot"></a><button type="button" class="x" title="Remove">×</button>`;
        thumbs.appendChild(fig);
      }
    }
    status.textContent = '';
  }
  document.addEventListener('paste', function pasteHandler(e) {
    if (!document.body.contains(container)) { document.removeEventListener('paste', pasteHandler); return; }
    const fs = Array.from((e.clipboardData && e.clipboardData.files) || []);
    if (fs.length) { e.preventDefault(); upload(fs); }
  });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => upload(e.dataTransfer.files));
  container.querySelector('#pick').addEventListener('change', e => { upload(e.target.files); e.target.value = ''; });
  thumbs.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('x')) return;
    const fig = e.target.closest('figure');
    await deleteAttachment(fig.dataset.aid);
    fig.remove();
  });

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.applyProposedBtn');
    if (btn && opts.onApplyProposed) opts.onApplyProposed(JSON.parse(btn.dataset.proposed));
  });

  container.querySelector('#exportBundle').addEventListener('click', async function () {
    this.disabled = true;
    status.textContent = 'Building export…';
    try {
      const id = await ensureRefId();
      const name = await exportTrade(opts.kind, id);
      status.textContent = `Downloaded ${name}`;
    } catch (err) {
      status.textContent = '';
      out.innerHTML = `<p class="neg">${esc(err.message || String(err))}</p>`;
    }
    this.disabled = false;
  });

  const runBtn = container.querySelector('#runReview');
  if (runBtn) runBtn.addEventListener('click', async function () {
    status.textContent = 'Reviewing… this takes up to a minute.';
    this.disabled = true;
    try {
      const session = await getSession();
      if (!session) throw new Error('Not signed in.');
      const id = await ensureRefId();
      const currentShots = await listAttachments(opts.kind, id);
      const images = [];
      for (const s of currentShots.slice(0, 8)) images.push(await attachmentToBase64(s.filename));
      // Scalp only, for now - options/swing don't have the gate/violation taxonomy this draws on.
      const historyDigest = (opts.kind === 'scalp' && tradeData)
        ? await getPatternDigest({ setup: tradeData.setup, excludeId: id })
        : '';
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ kind: opts.kind, trade: tradeData, rulesText: opts.rulesText, images, model: opts.model, historyDigest }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error([j.error, j.reason].filter(Boolean).join(': ') || 'Review failed.');
      await saveReview(opts.kind, id, opts.model, j.text, j.gates, j.proposed);
      renderReviewOut(out, { created_at: new Date().toISOString(), model: opts.model, text_body: j.text, proposed_json: { gates: j.gates, proposed: j.proposed } });
    } catch (err) {
      out.innerHTML = `<p class="neg">${esc(err.message || String(err))}</p>`;
    }
    status.textContent = ''; this.disabled = false;
  });
}
