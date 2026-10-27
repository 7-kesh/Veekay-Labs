// Screenshots panel shared by the scalp, options and swing trade forms: paste / drop / pick images,
// thumbnails with remove, and the "Export for AI-Assist-Review" zip. Screenshots live in Supabase
// Storage. (The in-app Claude review that used to share this panel was removed 2026-10-27; reviews
// happen in Claude chat from the export.)
import { listAttachments, uploadAttachment, deleteAttachment } from './db.js';
import { exportTrade } from './export-bundle.js';
import { esc } from './format.js';

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

// opts: { kind, refId (null if not saved yet), ensureRefId: async () => {id, tradeData}, tradeData }
// ensureRefId is called lazily on the first upload/export action when refId starts out null - it
// should save a draft trade from the current form and return its id.
export async function mountShotsPanel(container, opts) {
  let refId = opts.refId || null;
  let pendingRef = null; // concurrent uploads must share ONE draft creation, not make one each
  async function ensureRefId() {
    if (refId) return refId;
    if (!pendingRef) {
      pendingRef = opts.ensureRefId().then(r => { refId = r.id; return refId; })
        .finally(() => { pendingRef = null; });
    }
    return pendingRef;
  }

  // Screenshots attach only to a saved trade. Creating the record as a side effect of the first
  // upload froze the page and could make duplicate records, so a new trade is saved first.
  if (!refId) {
    container.innerHTML = `<section class="card" id="review"><h2>Screenshots</h2>
      <p class="muted">Click <b>Save</b> first, then this page reopens with screenshot upload and the export button ready.</p></section>`;
    return;
  }

  const shots = await listAttachments(opts.kind, refId);

  container.innerHTML = `
    <section class="card" id="review">
      <h2>Screenshots</h2>
      <div class="drop" id="drop" tabindex="0">Paste a screenshot (Ctrl/Cmd+V), drop images here, or <label class="link">choose files<input type="file" id="pick" accept="image/*" multiple hidden></label></div>
      <div class="thumbs" id="thumbs">${shots.map(s => `<figure data-aid="${s.id}"><a href="${esc(s.url)}" target="_blank"><img src="${esc(s.url)}" alt="screenshot"></a><button type="button" class="x" title="Remove">×</button></figure>`).join('')}</div>
      <div class="row">
        <button type="button" class="btn primary" id="exportBundle">Export for AI-Assist-Review</button>
        <span class="muted" id="reviewStatus">Exports the last saved version of this trade with its screenshots (.zip).</span>
      </div>
      <div id="reviewOut" class="review"></div>
    </section>
  `;

  const out = container.querySelector('#reviewOut');

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
}
