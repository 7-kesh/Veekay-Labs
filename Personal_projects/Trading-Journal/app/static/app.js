// Shared: screenshot upload (paste / drop / pick), Claude review, tiny markdown renderer.
(function () {
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>'); }
  function md(src) {
    var lines = src.split('\n'), out = [], i = 0;
    while (i < lines.length) {
      var l = lines[i];
      if (/^\s*\|/.test(l)) {
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        rows = rows.filter(function (r) { return !/^\s*\|[\s:|-]+\|?\s*$/.test(r); });
        out.push('<table class="dense">' + rows.map(function (r, k) {
          var cells = r.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
          var tag = k === 0 ? 'th' : 'td';
          return '<tr>' + cells.map(function (c) { return '<' + tag + '>' + inline(c) + '</' + tag + '>'; }).join('') + '</tr>';
        }).join('') + '</table>');
        continue;
      }
      if (/^\s*[-*] /.test(l)) {
        var items = [];
        while (i < lines.length && /^\s*[-*] /.test(lines[i])) { items.push('<li>' + inline(lines[i].replace(/^\s*[-*] /, '')) + '</li>'); i++; }
        out.push('<ul>' + items.join('') + '</ul>');
        continue;
      }
      if (l.trim()) out.push('<p>' + inline(l) + '</p>');
      i++;
    }
    return out.join('');
  }
  function renderAll(root) {
    (root || document).querySelectorAll('.md[data-md]').forEach(function (el) { el.innerHTML = md(el.getAttribute('data-md')); });
  }
  renderAll();


  // In-page jump tabs: highlight the section being read.
  var jump = document.querySelectorAll('.subtabs a');
  if (jump.length && 'IntersectionObserver' in window) {
    var map = {};
    jump.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t) map[t.id] = a; });
    var seen = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      var first = Object.keys(map).filter(function (id) { return seen[id]; })[0];  // topmost visible section
      if (first) { jump.forEach(function (a) { a.classList.remove('on'); }); map[first].classList.add('on'); }
    }, { rootMargin: '-120px 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }
  // Cmd/Ctrl+Enter saves the entry form from anywhere.
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      var f = document.querySelector('form[data-quick]'); if (f) { e.preventDefault(); (f.querySelector('.actions .primary') || f).click(); }
    }
  });

  var box = document.getElementById('review');
  if (!box) return;
  var kind = box.dataset.kind, id = box.dataset.id;
  var thumbs = document.getElementById('thumbs'), status = document.getElementById('reviewStatus');

  // Shrink large screenshots in the browser so the synced folder stays small.
  function shrink(file) {
    return new Promise(function (resolve) {
      if (file.type === 'image/gif') return resolve(file);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1800, s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); resolve(b ? new File([b], 'shot.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.88);
      };
      img.onerror = function () { resolve(file); };
      img.src = url;
    });
  }
  function addThumb(r) {
    var fig = document.createElement('figure'); fig.dataset.aid = r.id;
    fig.innerHTML = '<a href="' + r.url + '" target="_blank"><img src="' + r.url + '" alt="screenshot"></a><button type="button" class="x" title="Remove">×</button>';
    thumbs.appendChild(fig);
  }
  async function upload(files) {
    files = Array.from(files).filter(function (f) { return f.type.indexOf('image/') === 0; });
    if (!files.length) return;
    status.textContent = 'Uploading…';
    var fd = new FormData();
    for (var f of files) fd.append('file', await shrink(f));
    var res = await fetch('/attach/' + kind + '/' + id, { method: 'POST', body: fd });
    (await res.json()).forEach(addThumb);
    status.textContent = '';
  }
  document.addEventListener('paste', function (e) {
    var fs = Array.from((e.clipboardData && e.clipboardData.files) || []);
    if (fs.length) { e.preventDefault(); upload(fs); }
  });
  var drop = document.getElementById('drop');
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { upload(e.dataTransfer.files); });
  document.getElementById('pick').addEventListener('change', function (e) { upload(e.target.files); e.target.value = ''; });
  thumbs.addEventListener('click', async function (e) {
    if (!e.target.classList.contains('x')) return;
    var fig = e.target.closest('figure');
    await fetch('/attachment/' + fig.dataset.aid + '/delete', { method: 'POST' });
    fig.remove();
  });

  document.getElementById('runReview').addEventListener('click', async function () {
    var out = document.getElementById('reviewOut');
    status.textContent = 'Reviewing… this takes up to a minute.';
    this.disabled = true;
    try {
      var res = await fetch('/review/' + kind + '/' + id, { method: 'POST' });
      var j = await res.json();
      if (j.error) { out.innerHTML = '<p class="neg">' + esc(j.error) + '</p>'; }
      else { out.innerHTML = '<div class="md" data-md=""></div>'; var m = out.firstChild; m.setAttribute('data-md', j.text); renderAll(out); }
    } catch (err) { out.innerHTML = '<p class="neg">' + esc(String(err)) + '</p>'; }
    status.textContent = ''; this.disabled = false;
  });
  document.getElementById('copyPacket').addEventListener('click', async function () {
    var t = await (await fetch('/packet/' + kind + '/' + id)).text();
    try { await navigator.clipboard.writeText(t); status.textContent = 'Copied. Paste it into Claude and attach the screenshots.'; }
    catch (e) { status.textContent = 'Could not copy automatically.'; }
  });
})();
