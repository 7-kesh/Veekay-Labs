// Port of app/templates/_macros.html's shots_panel + app/static/app.js's upload/review wiring.
// Shared by every trade-detail view (scalp now; options/swing can reuse this once their forms
// exist). Screenshots live in Supabase Storage; the review itself goes through the
// /api/review Pages Function so the Anthropic key never reaches the browser.
import { listAttachments, uploadAttachment, deleteAttachment, listReviews, saveReview, attachmentToBase64 } from './db.js';
import { getSession } from './auth.js';
import { GATE_LABELS } from './constants.js';
import { esc } from './format.js';
import { md } from './markdown.js';

function shrink(file) {
  return new Promise((resolve) => {
    if (file.type === 'image/gif') return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1200, s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); resolve(b ? new File([b], 'shot.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.78);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

function renderReviewOut(out, rev) {
  if (!rev) { out.innerHTML = ''; return; }
  out.innerHTML = `<div class="muted">Latest review, ${esc(String(rev.created_at).replace('T', ' ').slice(0, 19))} (${esc(rev.model)})</div>
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

// opts: { kind, refId, tradeData, rulesText, model, onApplyProposed(proposed) }
export async function mountReviewPanel(container, opts) {
  const shots = await listAttachments(opts.kind, opts.refId);
  const revs = await listReviews(opts.kind, opts.refId);

  container.innerHTML = `
    <section class="card" id="review">
      <h2>Screenshots and review</h2>
      <div class="drop" id="drop" tabindex="0">Paste a screenshot (Ctrl/Cmd+V), drop images here, or <label class="link">choose files<input type="file" id="pick" accept="image/*" multiple hidden></label></div>
      <div class="thumbs" id="thumbs">${shots.map(s => `<figure data-aid="${s.id}"><a href="${esc(s.url)}" target="_blank"><img src="${esc(s.url)}" alt="screenshot"></a><button type="button" class="x" title="Remove">×</button></figure>`).join('')}</div>
      <div class="row">
        <button type="button" class="btn primary" id="runReview">Review with Claude</button>
        <span class="muted" id="reviewStatus"></span>
      </div>
      <div id="reviewOut" class="review"></div>
      ${revs.length > 1 ? `<details><summary>${revs.length - 1} earlier review(s)</summary>
        ${revs.slice(1).map(r => `<div class="muted">${esc(String(r.created_at).replace('T', ' ').slice(0, 19))} (${esc(r.model)})</div><div class="md">${md(r.text_body)}</div>`).join('')}
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
    for (const f of files) {
      const shrunk = await shrink(f);
      const res = await uploadAttachment(opts.kind, opts.refId, shrunk);
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

  container.querySelector('#runReview').addEventListener('click', async function () {
    status.textContent = 'Reviewing… this takes up to a minute.';
    this.disabled = true;
    try {
      const session = await getSession();
      if (!session) throw new Error('Not signed in.');
      const currentShots = await listAttachments(opts.kind, opts.refId);
      const images = [];
      for (const s of currentShots.slice(0, 8)) images.push(await attachmentToBase64(s.filename));
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ kind: opts.kind, trade: opts.tradeData, rulesText: opts.rulesText, images, model: opts.model }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error([j.error, j.reason].filter(Boolean).join(': ') || 'Review failed.');
      await saveReview(opts.kind, opts.refId, opts.model, j.text, j.gates, j.proposed);
      renderReviewOut(out, { created_at: new Date().toISOString(), model: opts.model, text_body: j.text, proposed_json: { gates: j.gates, proposed: j.proposed } });
    } catch (err) {
      out.innerHTML = `<p class="neg">${esc(err.message || String(err))}</p>`;
    }
    status.textContent = ''; this.disabled = false;
  });
}
