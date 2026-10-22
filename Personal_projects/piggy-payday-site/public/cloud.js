// Supabase backend for Piggy Payday. Presents the same small db API the app was written against
// (collection / doc / get / set / update / add / orderBy / limit / onSnapshot), stored in one
// "docs" table. Includes the email-code sign-in screen.
(function(){
  "use strict";

  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var POLL_MS = 30000;

  function newId(){
    var s = '';
    while (s.length < 20) s += Math.random().toString(36).slice(2);
    return s.slice(0, 20);
  }

  function makeDb(sb){
    var listeners = {}; // collection -> [refetch fns], so our own writes show up instantly

    function notify(name){ (listeners[name] || []).forEach(function(fn){ fn(); }); }
    function wrap(row){ return { id: row.id, exists: true, data: function(){ return row.data; } }; }
    function check(r){ if (r.error) throw r.error; return r; }

    function Doc(name, id){ this.name = name; this.id = id; }
    Doc.prototype.get = function(){
      var self = this;
      return sb.from('docs').select('data').eq('collection', this.name).eq('id', this.id).maybeSingle()
        .then(check).then(function(r){
          var row = r.data;
          return { id: self.id, exists: !!row, data: function(){ return row ? row.data : undefined; } };
        });
    };
    Doc.prototype.set = function(data){
      var self = this;
      return sb.from('docs')
        .upsert({ collection: this.name, id: this.id, data: data, updated_at: new Date().toISOString() }, { onConflict: 'collection,id' })
        .then(check).then(function(){ notify(self.name); });
    };
    Doc.prototype.update = function(patch){
      var self = this;
      return this.get().then(function(snap){
        var merged = Object.assign({}, snap.exists ? snap.data() : {}, patch);
        return self.set(merged);
      });
    };

    function Coll(name, order, lim){ this.name = name; this.order = order || null; this.lim = lim || null; }
    Coll.prototype.doc = function(id){ return new Doc(this.name, id); };
    Coll.prototype.orderBy = function(field, dir){ return new Coll(this.name, { field: field, desc: dir === 'desc' }, this.lim); };
    Coll.prototype.limit = function(n){ return new Coll(this.name, this.order, n); };
    Coll.prototype.add = function(data){
      var id = newId(), self = this;
      return new Doc(this.name, id).set(data).then(function(){ return new Doc(self.name, id); });
    };
    Coll.prototype._fetch = function(){
      var q = sb.from('docs').select('id,data').eq('collection', this.name);
      if (this.order) q = q.order('data->>' + this.order.field, { ascending: !this.order.desc });
      if (this.lim) q = q.limit(this.lim);
      return q.then(check).then(function(r){ return { docs: r.data.map(wrap) }; });
    };
    Coll.prototype.onSnapshot = function(ok, fail){
      var self = this, stopped = false;
      function run(){
        self._fetch().then(function(snap){ if (!stopped) ok(snap); }, function(e){ if (!stopped && fail) fail(e); });
      }
      (listeners[this.name] = listeners[this.name] || []).push(run);
      run();
      var channel = null;
      try{
        channel = sb.channel('docs-' + this.name + '-' + newId())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'collection=eq.' + this.name }, run)
          .subscribe();
      } catch(e){}
      var timer = setInterval(run, POLL_MS); // safety net if realtime drops
      return function(){
        stopped = true; clearInterval(timer);
        listeners[self.name] = (listeners[self.name] || []).filter(function(f){ return f !== run; });
        if (channel) try{ sb.removeChannel(channel); }catch(e){}
      };
    };

    return { collection: function(name){ return new Coll(name); } };
  }

  // ---------- sign-in screen ----------
  function showLogin(sb){
    return new Promise(function(resolve){
      var ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML =
        '<div class="modal">' +
          '<h3>Piggy Payday</h3>' +
          '<p class="sub" id="loginSub">Sign in with your email. We’ll send you a sign-in link.</p>' +
          '<div class="field" id="emailField"><label for="loginEmail">Email</label>' +
            '<input type="text" id="loginEmail" inputmode="email" autocomplete="email" placeholder="you@example.com"></div>' +
          '<div class="field" id="codeField" hidden><label for="loginCode">6-digit code</label>' +
            '<input type="text" id="loginCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"></div>' +
          '<p class="error-text" id="loginError" hidden></p>' +
          '<div class="modal-actions"><button class="btn-confirm" id="loginBtn" type="button">Send code</button></div>' +
        '</div>';
      document.body.appendChild(ov);
      var emailEl = ov.querySelector('#loginEmail'), codeEl = ov.querySelector('#loginCode');
      var btn = ov.querySelector('#loginBtn'), err = ov.querySelector('#loginError');
      var step = 'email';

      function fail(msg){ err.textContent = msg; err.hidden = false; btn.disabled = false; }
      function done(){ ov.remove(); resolve(); }

      // If the person tapped the email link instead of typing the code, the session appears on its own.
      sb.auth.onAuthStateChange(function(ev, session){ if (session && ov.parentNode) done(); });

      btn.addEventListener('click', function(){
        err.hidden = true;
        var email = emailEl.value.trim();
        btn.disabled = true;
        if (step === 'email'){
          if (!email){ return fail('Enter your email.'); }
          sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } }).then(function(r){
            if (r.error) return fail(r.error.message);
            step = 'code';
            ov.querySelector('#loginSub').textContent = 'Check ' + email + ' and tap the sign-in link in the email. If the email shows a code instead, enter it below.';
            ov.querySelector('#emailField').hidden = true;
            ov.querySelector('#codeField').hidden = false;
            btn.textContent = 'Sign in'; btn.disabled = false; codeEl.focus();
          });
        } else {
          var code = codeEl.value.trim();
          if (!code){ return fail('Enter the code from the email.'); }
          sb.auth.verifyOtp({ email: email, token: code, type: 'email' }).then(function(r){
            if (r.error) return fail('That code didn’t work. Check it and try again.');
            done();
          });
        }
      });
    });
  }

  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function(){ rej(new Error('load failed')); };
      document.head.appendChild(s);
    });
  }

  // Resolves to a db object, or null when Supabase isn't configured (app then saves in this browser only).
  function start(){
    var cfg = window.PIGGY_CONFIG;
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return Promise.resolve(null);
    var sb;
    return loadScript(SUPABASE_CDN).then(function(){
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      return sb.auth.getSession();
    }).then(function(r){
      return r.data && r.data.session ? null : showLogin(sb);
    }).then(function(){ return makeDb(sb); });
  }

  window.PiggyCloud = { start: start, _makeDb: makeDb };
})();
