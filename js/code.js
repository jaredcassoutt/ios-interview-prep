/* code.js — coding challenge list and workspace */
window.VIEWS = window.VIEWS || {};

(function () {
  var state = null, timer = null;

  VIEWS.code = {
    render: function (p) {
      return p.id ? detail(p.id) : list(p);
    },
    mount: function (p) {
      if (p.id) mountDetail(p.id); else mountList();
    },
    unmount: function () { clearInterval(timer); }
  };

  /* ---------- list ---------- */

  function list(p) {
    var diff = p.diff || 'all';
    var items = IPREP.challenges.filter(function (c) { return diff === 'all' || c.d === diff; });
    var doneCount = IPREP.challenges.filter(function (c) { return STORE.s.challenges[c.id]; }).length;

    var h = '<div class="page-head"><h1>Coding challenges</h1>' +
      '<p>Write it before you look. Every solution comes with a note on what the interviewer is actually assessing. ' +
      doneCount + ' of ' + IPREP.challenges.length + ' complete.</p></div>';

    h += '<div class="filters">';
    ['all', 'easy', 'medium', 'hard'].forEach(function (d) {
      h += '<span class="chip' + (diff === d ? ' on' : '') + '" data-diff="' + d + '">' + d + '</span>';
    });
    h += '</div>';

    h += '<div class="grid">';
    items.forEach(function (c) {
      var done = STORE.s.challenges[c.id];
      var dom = IPREP.domainOf(c.domain);
      h += '<div class="row" data-goto="#/code?id=' + c.id + '" style="--spine:' + dom.color + '">';
      
      h += '<div class="row-body"><b>' + UI.esc(c.title) + '</b>';
      h += '<span>' + dom.short + ' &middot; ' + c.minutes + ' min' +
           (done && done.noHints ? ' &middot; solved with no hints' : '') + '</span></div>';
      h += '<span class="pill ' + c.d + '">' + c.d + '</span>';
      h += done ? '<span class="row-done">&#10003;</span>' : '<span class="chev">&rsaquo;</span>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  function mountList() {
    document.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function () { location.hash = el.getAttribute('data-goto'); });
    });
    document.querySelectorAll('[data-diff]').forEach(function (el) {
      el.addEventListener('click', function () {
        location.hash = '#/code?diff=' + el.getAttribute('data-diff');
      });
    });
  }

  /* ---------- detail ---------- */

  function detail(id) {
    var c = IPREP.challenges.filter(function (x) { return x.id === id; })[0];
    if (!c) return '<div class="empty"><h3>Challenge not found</h3></div>';

    var saved = localStorage.getItem('iprep.code.' + id);
    var done = STORE.s.challenges[id];
    var dom = IPREP.domainOf(c.domain);
    state = { id: id, hintsShown: 0, solutionShown: false, started: Date.now() };

    var h = '';
    h += '<div class="spread" style="margin-bottom:16px">';
    h += '<a class="btn ghost tiny" href="#/code">&larr; All challenges</a>';
    h += '<span class="clock" id="ch-timer">0:00 / ' + c.minutes + ':00</span>';
    h += '</div>';

    h += '<div class="page-head"><h1>' + UI.esc(c.title) + '</h1>';
    h += '<p><span class="pill ' + c.d + '">' + c.d + '</span> <span class="pill" style="background:' +
         dom.color + '22;color:' + dom.color + '">' + dom.short + '</span>' +
         (done ? ' <span class="pill" style="background:var(--green-soft);color:var(--green)">completed</span>' : '') + '</p>';
    h += '</div>';

    h += '<div class="card" style="margin-bottom:18px">' + UI.rich(c.prompt) + '</div>';

    h += '<div class="sec">Your answer</div>';
    h += '<div class="editor"><pre id="ch-hl"></pre><textarea id="ch-ed" spellcheck="false"></textarea></div>';
    h += '<div class="dim" style="font-size:11.5px;margin-top:7px">Saved locally as you type. Tab inserts four spaces.</div>';

    h += '<div class="btn-row mt2">';
    h += '<button class="btn" id="ch-hint">Reveal a hint (' + c.hints.length + ' left)</button>';
    h += '<button class="btn" id="ch-solution">Show solution</button>';
    h += '<button class="btn primary" id="ch-done">Mark complete</button>';
    h += '<button class="btn ghost" id="ch-reset">Reset editor</button>';
    h += '</div>';

    h += '<div id="ch-hints" class="mt2"></div>';
    h += '<div id="ch-solution-box" class="mt2"></div>';

    // stash for handlers
    state.c = c;
    state.saved = saved !== null ? saved : c.starter;
    return h;
  }

  function mountDetail(id) {
    var c = state && state.c;
    if (!c) return;

    var ed = document.getElementById('ch-ed');
    var hl = document.getElementById('ch-hl');
    if (!ed) return;

    ed.value = state.saved;
    sync();

    ed.addEventListener('input', function () {
      sync();
      try { localStorage.setItem('iprep.code.' + id, ed.value); } catch (e) {}
    });
    ed.addEventListener('scroll', function () {
      hl.scrollTop = ed.scrollTop;
      hl.scrollLeft = ed.scrollLeft;
    });
    ed.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = ed.selectionStart, t = ed.selectionEnd;
        ed.value = ed.value.slice(0, s) + '    ' + ed.value.slice(t);
        ed.selectionStart = ed.selectionEnd = s + 4;
        sync();
      }
    });

    function sync() {
      hl.innerHTML = UI.swift(ed.value + '\n');
      hl.style.minHeight = '300px';
    }

    /* timer */
    timer = setInterval(function () {
      var el = document.getElementById('ch-timer');
      if (!el) return;
      var s = (Date.now() - state.started) / 1000;
      el.textContent = UI.fmtTime(s) + ' / ' + c.minutes + ':00';
      el.className = 'clock' + (s > c.minutes * 60 ? ' danger' : s > c.minutes * 45 ? ' warn' : '');
    }, 500);

    /* hints */
    document.getElementById('ch-hint').addEventListener('click', function () {
      if (state.hintsShown >= c.hints.length) return;
      state.hintsShown++;
      var box = document.getElementById('ch-hints');
      var h = '<div class="sec" style="margin-top:0">Hints</div>';
      for (var i = 0; i < state.hintsShown; i++) {
        h += '<div class="note hint"><b>Hint ' + (i + 1) + '.</b> ' + UI.esc(c.hints[i]) + '</div>';
      }
      box.innerHTML = h;
      var left = c.hints.length - state.hintsShown;
      this.textContent = left ? 'Reveal a hint (' + left + ' left)' : 'No hints left';
      this.disabled = !left;
    });

    /* solution */
    document.getElementById('ch-solution').addEventListener('click', function () {
      state.solutionShown = true;
      var box = document.getElementById('ch-solution-box');
      box.innerHTML =
        '<div class="sec" style="margin-top:0">Reference solution</div>' +
        '<pre class="code">' + UI.swift(c.solution) + '</pre>' +
        '<div class="sec">What the interviewer is checking</div>' +
        '<div class="note check">' + UI.rich(c.checking) + '</div>';
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.disabled = true;
      this.textContent = 'Solution shown';
    });

    /* complete */
    document.getElementById('ch-done').addEventListener('click', function () {
      STORE.completeChallenge(id, state.hintsShown > 0);
      UI.confetti(70);
      UI.toast('&#10003;', 'Challenge complete', state.hintsShown === 0 ? 'No hints used. +60 XP' : '+60 XP');
      this.textContent = 'Completed';
      this.disabled = true;
      APP.refreshChrome();
    });

    /* reset */
    document.getElementById('ch-reset').addEventListener('click', function () {
      ed.value = c.starter;
      sync();
      try { localStorage.setItem('iprep.code.' + id, ed.value); } catch (e) {}
    });
  }
})();
