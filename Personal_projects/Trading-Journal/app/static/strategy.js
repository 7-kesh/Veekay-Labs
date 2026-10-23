// Strategy page: propose a rule change, get Claude's red-flag classification, then confirm.
(function () {
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  document.querySelectorAll('.toggleEdit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var area = document.getElementById('edit-' + btn.dataset.key);
      area.hidden = !area.hidden;
    });
  });

  document.querySelectorAll('.checkBtn').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var key = btn.dataset.key;
      var area = document.getElementById('edit-' + key);
      var textarea = area.querySelector('.newText');
      var status = area.querySelector('.checkStatus');
      var out = area.querySelector('.classifyOut');
      var form = area.querySelector('.applyForm');
      status.textContent = 'Checking…'; btn.disabled = true; form.hidden = true;
      try {
        var res = await fetch('/strategy/propose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'rule_key=' + encodeURIComponent(key) + '&new_text=' + encodeURIComponent(textarea.value)
        });
        var j = await res.json();
        if (j.error) {
          out.innerHTML = '<p class="neg">' + esc(j.error) + '</p>';
        } else {
          out.innerHTML = '<p class="neg"><b>Red flag: this changes the strategy.</b> Effect: <b>' +
            esc(j.effect) + '</b>.<br>' + esc(j.explanation) + '</p>';
          form.querySelector('.hiddenNewText').value = textarea.value;
          form.querySelector('.hiddenEffect').value = j.effect;
          form.hidden = false;
        }
      } catch (e) { out.textContent = 'Could not check.'; }
      status.textContent = ''; btn.disabled = false;
    });
  });
})();
