// Live preview for the scalp form. The server recomputes everything on save.
(function () {
  var form = document.getElementById('scalpForm');
  var $ = function (n) { return form.elements[n]; };
  var num = function (v) { v = parseFloat(String(v).replace(/[$,]/g, '')); return isNaN(v) ? null : v; };
  var money = function (v) { return v === null ? '–' : (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2); };

  function parseExits(text, shares) {
    text = text.replace(/\([^)]*\)/g, '');
    var toks = text.split(/[;,\n]/).filter(function (t) { return t.trim(); });
    if (!toks.length || !shares) return null;
    var left = shares, fills = [];
    for (var t of toks) {
      var m = t.match(/^\s*(?:(\d+)\s*@\s*)?\$?(\d+(?:\.\d+)?)\s*(?:stop|limit|market)?\s*$/i);
      if (!m) return null;
      var q = m[1] ? parseFloat(m[1]) : left;
      fills.push([q, parseFloat(m[2])]); left -= q;
    }
    return { fills: fills, left: left };
  }
  function suggest(setup, ev, xv, viol) {
    if (setup === 'C') return 'X';
    if (ev === 'N') return 'C';
    if (ev === 'Y') return (xv === 'Y' && !viol) ? 'A' : 'B';
    return '';
  }
  function val(n) { var r = form.querySelector('[name=' + n + ']:checked'); return r ? r.value : ''; }

  function update() {
    var e = num($('entry_price').value), sh = num($('shares').value), st = num($('stop').value), cm = num($('commission').value) || 0;
    var risk = (e && sh && st && e > st) ? (e - st) * sh : null;
    var budget = parseFloat(form.dataset.risk);
    var gross = null, net = null, r = null, warn = [];
    var p = e && sh ? parseExits($('exits_text').value, sh) : null;
    if (p) {
      gross = p.fills.reduce(function (a, f) { return a + f[0] * (f[1] - e); }, 0);
      net = gross - cm;
      if (risk) r = net / risk;
      if (p.left < 0) warn.push('Exits sell more shares than you bought.');
    }
    if (st && e && st >= e) warn.push('Stop should be below the entry.');
    if (risk && risk > budget) warn.push('Planned risk is over your ' + money(budget) + ' 1R.');
    document.getElementById('cRisk').textContent = money(risk);
    document.getElementById('cGross').textContent = money(gross === null ? null : gross);
    var n = document.getElementById('cNet'); n.textContent = money(net); n.className = net === null ? '' : (net >= 0 ? 'pos' : 'neg');
    document.getElementById('cR').textContent = r === null ? '–' : r.toFixed(2) + 'R';
    document.getElementById('cWarn').textContent = warn.join(' ');
    // Imported rows have exits that cannot be parsed: expose the manual net P&L field.
    document.getElementById('manualNet').hidden = !($('exits_text').value.trim() && !p);
    var cat = suggest(val('setup'), val('entry_valid'), val('exit_valid'),
      form.querySelectorAll('[name=violations]:checked').length);
    document.getElementById('catHint').textContent = (!$('category').value && cat) ? '(auto: ' + cat + ')' : '';
    var setupC = document.getElementById('r-setupc');
    if (setupC) setupC.hidden = val('setup') !== 'C';
  }
  form.addEventListener('input', update); form.addEventListener('change', update); update();
  var t = $('ticker'); t.addEventListener('input', function () { t.value = t.value.toUpperCase(); });

  // Exit-leg row builder: a friendlier way to add "shares@price (note)" fills than typing the
  // whole semicolon-separated line by hand. One-way sync, rows -> the real exits_text textarea
  // (never the reverse) - so typing directly in the textarea to fix something always works,
  // and nothing from a complex historical entry can be silently lost or mangled.
  (function () {
    var exitsField = $('exits_text'), rowsEl = document.getElementById('exitRows'), addBtn = document.getElementById('addExit');
    if (!exitsField || !rowsEl) return;
    function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

    function parseToken(tok) {
      tok = tok.trim();
      if (!tok) return null;
      var m = tok.match(/^(?:(\d+(?:\.\d+)?)\s*@\s*)?\$?(\d+(?:\.\d+)?)\s*(.*)$/);
      if (!m) return { shares: '', price: '', note: tok };  // doesn't fit the pattern - keep it, don't drop it
      var note = m[3].trim();
      if (note.charAt(0) === '(') note = note.slice(1);
      if (note.charAt(note.length - 1) === ')') note = note.slice(0, -1);
      return { shares: m[1] || '', price: m[2], note: note };
    }
    function tokenFromRow(r) {
      var sh = r.shares.trim(), pr = r.price.trim(), note = r.note.trim();
      if (!pr) return '';
      return (sh ? sh + '@' : '') + pr + (note ? ' (' + note + ')' : '');
    }
    function addRow(shares, price, note) {
      var row = document.createElement('div');
      row.className = 'exitRow';
      row.innerHTML =
        '<input type="text" class="exShares" placeholder="shares" inputmode="numeric" value="' + escAttr(shares) + '">' +
        '<span class="exAt">@</span>' +
        '<input type="text" class="exPrice" placeholder="price" inputmode="decimal" value="' + escAttr(price) + '">' +
        '<input type="text" class="exNote" placeholder="time / note (optional)" value="' + escAttr(note) + '">' +
        '<button type="button" class="exRemove" title="Remove this exit">×</button>';
      row.querySelector('.exRemove').addEventListener('click', function () { row.remove(); syncExits(); });
      rowsEl.appendChild(row);
    }
    function syncExits() {
      var rows = Array.prototype.map.call(rowsEl.querySelectorAll('.exitRow'), function (row) {
        return { shares: row.querySelector('.exShares').value, price: row.querySelector('.exPrice').value, note: row.querySelector('.exNote').value };
      });
      exitsField.value = rows.map(tokenFromRow).filter(Boolean).join('; ');
      update();
    }
    rowsEl.addEventListener('input', syncExits);
    addBtn.addEventListener('click', function () { addRow('', '', ''); });

    var seeded = exitsField.value.split(/[;\n]/).map(parseToken).filter(Boolean);
    if (seeded.length) seeded.forEach(function (r) { addRow(r.shares, r.price, r.note); });
    else addRow('', '', '');  // a fresh trade starts with one empty row ready to fill in
  })();

  // Rule engine: checks the CURRENT form values, not what's saved - no save happens here.
  var checkBtn = document.getElementById('checkRules');
  if (checkBtn && form.dataset.id) {
    checkBtn.addEventListener('click', async function () {
      var out = document.getElementById('rulesOut');
      out.textContent = 'Checking…'; checkBtn.disabled = true;
      try {
        var res = await fetch('/scalp/' + form.dataset.id + '/check', { method: 'POST', body: new FormData(form) });
        var j = await res.json();
        out.innerHTML = j.flags.map(function (fl) {
          var cls = fl.status === 'pass' ? 'ok' : (fl.status === 'insufficient_evidence' ? 'warn' : 'neg');
          return '<div class="flagrow ' + cls + '"><b>' + fl.check.replace(/_/g, ' ') + '</b> ' + fl.message + '</div>';
        }).join('');
      } catch (e) { out.textContent = 'Could not run the checks.'; }
      checkBtn.disabled = false;
    });
  }
})();
