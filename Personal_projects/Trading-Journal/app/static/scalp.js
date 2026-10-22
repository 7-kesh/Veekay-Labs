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
  }
  form.addEventListener('input', update); form.addEventListener('change', update); update();
  var t = $('ticker'); t.addEventListener('input', function () { t.value = t.value.toUpperCase(); });
})();
