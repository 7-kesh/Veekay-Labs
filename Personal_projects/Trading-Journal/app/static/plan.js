// Live forecast for options and swing plans. Mirrors app/calc.py; the server recomputes on save.
(function () {
  var form = document.getElementById('planForm');
  var opt = form.dataset.kind === 'options', minRR = parseFloat(form.dataset.minRr) || 2;
  var num = function (n) { var el = form.elements[n]; if (!el) return null; var v = parseFloat(String(el.value).replace(/[$,]/g, '')); return isNaN(v) ? null : v; };
  var money = function (v) { return v === null ? '–' : (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2); };
  var set = function (id, t) { document.getElementById(id).textContent = t; };

  function update() {
    var e = num('entry_price'), s = num('stop_price'), t = num('target_price'), q = num('qty') || 0;
    var bal = num('account_balance') || 0, pct = num('risk_pct') || 0, mult = opt ? 100 : 1;
    var dir = (form.querySelector('[name=direction]:checked') || {}).value;
    var sign = (!opt && dir === 'short') ? -1 : 1;
    var invest = e === null ? null : e * mult * q, budget = bal * pct / 100, loss = null, profit = null, rr = null, max = null;
    var bad = [];
    if (e !== null && s !== null) {
      var per = (e - s) * sign;
      if (per <= 0) bad.push('Stop is on the wrong side of the entry.');
      else { loss = per * mult * q; max = Math.floor(budget / (per * mult)); }
    }
    if (e !== null && t !== null) {
      var gain = (t - e) * sign;
      if (gain <= 0) bad.push('Target is on the wrong side of the entry.');
      else profit = gain * mult * q;
    }
    if (loss && profit) rr = profit / loss;
    set('fInvest', money(invest)); set('fBudget', money(budget)); set('fLoss', money(loss)); set('fProfit', money(profit));
    set('fRR', rr === null ? '–' : rr.toFixed(2) + ' : 1'); set('fMax', max === null ? '–' : String(max));
    var v = [];
    function add(ok, good, badText) { v.push('<span class="v ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ ' + good : '✗ ' + badText) + '</span>'); }
    if (invest !== null) add(invest <= bal, 'Affordable', 'Costs more than the account balance');
    if (loss !== null) add(loss <= budget, 'Within risk budget', 'Planned loss ' + money(loss) + ' is over the ' + money(budget) + ' budget');
    if (!opt && rr !== null) add(rr >= minRR, 'Meets ' + minRR + ':1', 'Below ' + minRR + ':1 reward-to-risk');
    if (!opt && v.length === 3) v.push('<span class="v ' + (v.join('').indexOf('bad') < 0 ? 'ok">QUALIFIED' : 'bad">NOT QUALIFIED') + '</span>');
    bad.forEach(function (b) { v.push('<span class="v bad">' + b + '</span>'); });
    document.getElementById('fVerdicts').innerHTML = v.join('');
  }
  form.addEventListener('input', update); form.addEventListener('change', update); update();

  // Picking what happened at the exit suggests the "exit followed" answer.
  var sc = document.getElementById('exit_scenario');
  sc.addEventListener('change', function () {
    var f = sc.options[sc.selectedIndex].dataset.followed;
    if (!f) return;
    var r = form.querySelector('[name=exit_followed][value=' + f + ']'); if (r) r.checked = true;
  });
  var t = form.elements.ticker; t.addEventListener('input', function () { t.value = t.value.toUpperCase(); });
})();
