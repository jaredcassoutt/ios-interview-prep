/* mock.js — say-it-out-loud interview prompts with a self-scored rubric */
window.VIEWS = window.VIEWS || {};

(function () {
  var st = null, timer = null;

  VIEWS.mock = {
    render: function (p) { return p.id ? detail(p.id) : list(); },
    mount: function (p) { if (p.id) mountDetail(p.id); else wireGoto(); },
    unmount: function () { clearInterval(timer); }
  };

  function list() {
    var done = IPREP.mocks.filter(function (m) { return STORE.s.mocks[m.id]; }).length;
    var h = '<div class="page-head"><h1>Mock interview</h1>' +
      '<p>Open-ended design and debugging prompts. Start the timer, answer out loud as if someone were listening, ' +
      'then score yourself against the rubric. ' + done + ' of ' + IPREP.mocks.length + ' attempted.</p></div>';

    h += '<div class="grid">';
    IPREP.mocks.forEach(function (m) {
      var rec = STORE.s.mocks[m.id];
      var dom = IPREP.domainOf(m.domain);
      h += '<div class="row" data-goto="#/mock?id=' + m.id + '">';
      h += '<span class="dom-dot" style="background:' + dom.color + '"></span>';
      h += '<div class="row-body"><b>' + UI.esc(m.title) + '</b>';
      h += '<span>' + dom.short + ' &middot; ' + m.minutes + ' min &middot; ' + m.rubric.length + ' rubric points';
      if (rec) h += ' &middot; last score ' + rec.hits + '/' + rec.total;
      h += '</span></div>';
      h += '<span class="pill ' + m.d + '">' + m.d + '</span>';
      h += rec ? '<span class="row-done">&#10003;</span>' : '<span class="dim">&rsaquo;</span>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  function detail(id) {
    var m = IPREP.mocks.filter(function (x) { return x.id === id; })[0];
    if (!m) return '<div class="empty"><h3>Prompt not found</h3></div>';
    st = { m: m, running: false, elapsed: 0, startedAt: 0, hits: {}, revealed: false };

    var dom = IPREP.domainOf(m.domain);
    var h = '';
    h += '<div class="spread" style="margin-bottom:16px">';
    h += '<a class="btn ghost tiny" href="#/mock">&larr; All prompts</a>';
    h += '<span class="pill ' + m.d + '">' + m.d + '</span>';
    h += '</div>';

    h += '<div class="page-head"><h1>' + UI.esc(m.title) + '</h1>' +
         '<p><span class="pill" style="background:' + dom.color + '22;color:' + dom.color + '">' + dom.short +
         '</span> Target: ' + m.minutes + ' minutes.</p></div>';

    h += '<div class="card" style="font-size:15.5px;line-height:1.6">' + UI.rich(m.prompt) + '</div>';

    h += '<div class="card mt2"><div class="big-timer" id="mk-timer">0:00</div>' +
         '<div class="btn-row" style="justify-content:center">' +
         '<button class="btn primary" id="mk-start">Start talking</button>' +
         '<button class="btn" id="mk-reveal">Show rubric</button>' +
         '</div>' +
         '<p class="dim center" style="margin:14px 0 0;font-size:12.5px">' +
         'Answer out loud first. Reading the rubric before you speak defeats the exercise.</p></div>';

    h += '<div id="mk-rubric" class="mt2"></div>';
    return h;
  }

  function mountDetail() {
    var m = st.m;

    document.getElementById('mk-start').addEventListener('click', function () {
      if (!st.running) {
        st.running = true;
        st.startedAt = Date.now() - st.elapsed * 1000;
        this.textContent = 'Pause';
        timer = setInterval(function () {
          st.elapsed = (Date.now() - st.startedAt) / 1000;
          var el = document.getElementById('mk-timer');
          if (!el) return;
          el.textContent = UI.fmtTime(st.elapsed);
          el.style.color = st.elapsed > m.minutes * 60 ? 'var(--red)' :
                           st.elapsed > m.minutes * 45 ? 'var(--yellow)' : 'var(--text)';
        }, 250);
      } else {
        st.running = false;
        clearInterval(timer);
        this.textContent = 'Resume';
      }
    });

    document.getElementById('mk-reveal').addEventListener('click', function () {
      st.revealed = true;
      this.disabled = true;
      renderRubric();
      document.getElementById('mk-rubric').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderRubric() {
    var m = st.m;
    var box = document.getElementById('mk-rubric');
    var hits = Object.keys(st.hits).filter(function (k) { return st.hits[k]; }).length;

    var h = '<div class="sec-title" style="margin-top:0">Rubric &mdash; tick everything you actually said</div>';
    h += '<div class="card" style="padding:8px">';
    m.rubric.forEach(function (r, i) {
      h += '<div class="rubric-item' + (st.hits[i] ? ' hit' : '') + '" data-r="' + i + '">';
      h += '<span class="rubric-box">&#10003;</span><span>' + UI.esc(r) + '</span></div>';
    });
    h += '</div>';

    h += '<div class="spread mt" style="padding:0 4px">';
    h += '<span class="muted" style="font-size:13.5px"><strong>' + hits + ' / ' + m.rubric.length +
         '</strong> covered' + (hits >= Math.ceil(m.rubric.length * 0.7) ? ' &mdash; that is a strong answer' :
         hits >= Math.ceil(m.rubric.length * 0.4) ? ' &mdash; solid, but there are gaps' :
         ' &mdash; worth another pass') + '</span>';
    h += '<button class="btn primary" id="mk-save">Log this attempt</button>';
    h += '</div>';

    h += '<div class="sec-title">Follow-ups you should expect</div>';
    h += '<div class="card"><ul class="rubric" style="margin:0;padding-left:19px">';
    m.followups.forEach(function (f) { h += '<li>' + UI.esc(f) + '</li>'; });
    h += '</ul></div>';

    box.innerHTML = h;

    box.querySelectorAll('[data-r]').forEach(function (el) {
      el.addEventListener('click', function () {
        var i = el.getAttribute('data-r');
        st.hits[i] = !st.hits[i];
        renderRubric();
      });
    });
    document.getElementById('mk-save').addEventListener('click', function () {
      var n = Object.keys(st.hits).filter(function (k) { return st.hits[k]; }).length;
      STORE.completeMock(m.id, n, m.rubric.length);
      clearInterval(timer);
      if (n >= Math.ceil(m.rubric.length * 0.7)) UI.confetti(60);
      UI.toast('&#127908;', 'Attempt logged', n + ' of ' + m.rubric.length + ' points covered. +50 XP');
      APP.refreshChrome();
      this.textContent = 'Logged';
      this.disabled = true;
    });
  }

  function wireGoto() {
    document.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function () { location.hash = el.getAttribute('data-goto'); });
    });
  }
})();
