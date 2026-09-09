/* flashcards.js — spaced repetition session */
window.VIEWS = window.VIEWS || {};

(function () {
  var session = null;

  VIEWS.flashcards = {
    render: function (p) {
      session = build(p);
      if (!session.queue.length) {
        return '<div class="empty"><h3>Nothing matches that filter</h3>' +
          '<p>No cards are due for this topic or difficulty right now.</p>' +
          '<div class="btn-row" style="justify-content:center;margin-top:18px">' +
          '<a class="btn primary" href="#/flashcards">Review everything due</a>' +
          '<a class="btn" href="#/topics">Browse topics</a></div></div>';
      }
      return '<div class="stage"><div id="fc-slot"></div></div>';
    },
    mount: function () {
      if (!session || !session.queue.length) return;
      draw();
      document.addEventListener('keydown', keys);
    },
    unmount: function () { document.removeEventListener('keydown', keys); }
  };

  function build(p) {
    var opts = { topic: p.topic || null, domain: p.domain || null, diff: p.diff || 'all' };
    var all = STORE.dueCards(opts);
    return { queue: all.slice(0, Math.max(STORE.s.settings.sessionSize, 1)),
             i: 0, revealed: false, done: 0, opts: opts };
  }

  function draw() {
    var slot = document.getElementById('fc-slot');
    if (!slot) return;
    if (session.i >= session.queue.length) { slot.innerHTML = summary(); wireSummary(); return; }

    var c = session.queue[session.i];
    var t = IPREP.topic(c.topic);
    var d = IPREP.domainOf(c.domain);
    var st = STORE.cardState(c.key);

    var h = '';
    h += '<div class="stage-head">';
    h += '<span class="spine" style="background:' + d.color + '"></span>';
    h += '<span class="where">' + UI.esc(t.title) + '</span>';
    h += '<span class="pill ' + c.d + '">' + c.d + '</span>';
    h += '<span class="pill">' + (st ? 'seen ' + st.r + '&times;' : 'new') + '</span>';
    h += '<span class="count">' + (session.i + 1) + ' / ' + session.queue.length + '</span>';
    h += '</div>';

    h += '<article class="fc">';
    h += '<h2 class="fc-q">' + UI.line(c.q) + '</h2>';
    if (session.revealed) {
      h += '<div class="fc-rule"></div>';
      h += '<div class="fc-a">' + answerHTML(c.a) + '</div>';
    } else {
      h += '<p class="fc-prompt">Answer it in your head first. ' +
           '<span class="kbd">Space</span> reveals.</p>';
    }
    h += '</article>';

    if (session.revealed) {
      var iv = STORE.previewIntervals(c);
      h += '<div class="grades">';
      h += grade(0, 'Again', 'minutes');
      h += grade(1, 'Hard', fmtDays(iv[1]));
      h += grade(2, 'Good', fmtDays(iv[2]));
      h += grade(3, 'Easy', fmtDays(iv[3]));
      h += '</div>';
      h += '<p class="dim center" style="margin-top:12px;font-size:11.5px">Keys ' +
           '<span class="kbd">1</span> <span class="kbd">2</span> ' +
           '<span class="kbd">3</span> <span class="kbd">4</span></p>';
    } else {
      h += '<div class="btn-row mt" style="justify-content:center">' +
           '<button class="btn primary" id="fc-reveal">Reveal answer</button></div>';
    }

    h += '<div class="center mt2"><a class="btn ghost tiny" href="#/dashboard">End session</a></div>';
    slot.innerHTML = h;

    var rev = document.getElementById('fc-reveal');
    if (rev) rev.addEventListener('click', reveal);
    slot.querySelectorAll('[data-grade]').forEach(function (el) {
      el.addEventListener('click', function () { answer(parseInt(el.getAttribute('data-grade'), 10)); });
    });
  }

  function fmtDays(d) {
    if (d < 1) return 'today';
    if (d < 2) return '1 day';
    if (d < 30) return Math.round(d) + ' days';
    if (d < 365) return Math.round(d / 30) + ' mo';
    return '1 yr';
  }

  function grade(g, label, when) {
    return '<button class="grade g' + g + '" data-grade="' + g + '">' +
           '<b>' + label + '</b><span>' + when + '</span></button>';
  }

  // Answer markup subset: **bold**, `code`, - bullets, ``` fenced Swift.
  function answerHTML(a) {
    var parts = String(a).split('```');
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        out += '<pre class="code" style="margin:14px 0">' +
               UI.swift(parts[i].replace(/^\n/, '').replace(/\n$/, '')) + '</pre>';
      } else {
        out += UI.rich(parts[i]);
      }
    }
    return out;
  }

  function reveal() { session.revealed = true; draw(); }

  function answer(g) {
    if (!session.revealed) return;
    var c = session.queue[session.i];
    STORE.grade(c, g);
    session.done++;
    if (g === 0) session.queue.push(c);   // failed cards return this session
    session.i++;
    session.revealed = false;
    draw();
  }

  function keys(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (!session || session.i >= session.queue.length) return;
    if (!session.revealed) {
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); reveal(); }
      return;
    }
    if (e.key >= '1' && e.key <= '4') { e.preventDefault(); answer(parseInt(e.key, 10) - 1); }
    if (e.code === 'Space') { e.preventDefault(); answer(2); }
  }

  function summary() {
    var due = STORE.dueCount();
    return '<div class="empty">' +
      '<h3>Session done</h3>' +
      '<p>' + session.done + ' card' + (session.done === 1 ? '' : 's') + ' reviewed. ' +
      (due > 0 ? due + ' still due today.' : 'Nothing else is due today.') + '</p>' +
      '<div class="btn-row" style="justify-content:center;margin-top:20px">' +
      (due > 0 ? '<button class="btn primary" id="fc-again">Review ' +
        Math.min(due, STORE.s.settings.sessionSize) + ' more</button>' : '') +
      '<a class="btn" href="#/quiz">Switch to quiz</a>' +
      '<a class="btn ghost" href="#/dashboard">Overview</a>' +
      '</div></div>';
  }

  function wireSummary() {
    var b = document.getElementById('fc-again');
    if (b) b.addEventListener('click', function () { session = build(session.opts); draw(); });
  }
})();
