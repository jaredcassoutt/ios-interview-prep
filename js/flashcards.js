/* flashcards.js — spaced repetition session */
window.VIEWS = window.VIEWS || {};

(function () {
  var session = null;

  VIEWS.flashcards = {
    render: function (p) {
      session = build(p);
      if (!session.queue.length) {
        return '<div class="page-head"><h1>Flashcards</h1></div>' +
          '<div class="empty"><h3>Nothing matches that filter</h3>' +
          '<p>Try a different topic or difficulty.</p>' +
          '<div class="btn-row" style="justify-content:center;margin-top:16px">' +
          '<a class="btn" href="#/flashcards">All topics</a>' +
          '<a class="btn" href="#/topics">Browse topics</a></div></div>';
      }
      return '<div class="fc-stage"><div id="fc-slot"></div></div>';
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
    var size = STORE.s.settings.sessionSize;
    return { queue: all.slice(0, Math.max(size, 1)), i: 0, revealed: false, done: 0, opts: opts };
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
    h += '<div class="fc-meta">';
    h += '<span class="dom-dot" style="background:' + d.color + '"></span>';
    h += '<span class="dim" style="font-size:12.5px">' + UI.esc(t.title) + '</span>';
    h += '<span class="pill ' + c.d + '">' + c.d + '</span>';
    if (st) h += '<span class="pill">next in ' + UI.relDays(st.due) + '</span>';
    else h += '<span class="pill accent">new</span>';
    h += '<span class="prog">' + (session.i + 1) + ' / ' + session.queue.length + '</span>';
    h += '</div>';

    h += '<div class="fc-card">';
    h += '<div class="fc-q">' + UI.esc(c.q) + '</div>';
    if (session.revealed) {
      h += '<div class="fc-divider"></div>';
      h += '<div class="fc-a">' + answerHTML(c.a) + '</div>';
    } else {
      h += '<div class="fc-hint">Think it through, then press <span class="kbd">Space</span> to reveal</div>';
    }
    h += '</div>';

    if (session.revealed) {
      h += '<div class="fc-grades">';
      h += grade(0, 'Again', '1');
      h += grade(1, 'Hard', '2');
      h += grade(2, 'Good', '3');
      h += grade(3, 'Easy', '4');
      h += '</div>';
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

  function grade(g, label, key) {
    var preview = ['<10m', '', '', ''][g];
    var names = ['Forgot it', 'Struggled', 'Got it', 'Too easy'];
    return '<div class="grade g' + g + '" data-grade="' + g + '"><b>' + label + '</b><span>' + key + ' &middot; ' + names[g] + '</span></div>';
  }

  // Answers use a small markup subset: **bold**, `code`, - bullets, and ``` fenced Swift.
  function answerHTML(a) {
    var parts = String(a).split('```');
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) out += '<pre class="code">' + UI.swift(parts[i].replace(/^\n/, '').replace(/\n$/, '')) + '</pre>';
      else out += UI.rich(parts[i]);
    }
    return out;
  }

  function reveal() {
    session.revealed = true;
    draw();
  }

  function answer(g) {
    if (!session.revealed) return;
    var c = session.queue[session.i];
    STORE.grade(c, g);
    session.done++;
    if (g === 0) session.queue.push(c);   // failed cards come back this session
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
      '<div style="font-size:44px;margin-bottom:8px">&#127881;</div>' +
      '<h3>Session complete</h3>' +
      '<p>' + session.done + ' review' + (session.done === 1 ? '' : 's') + ' logged. ' +
      (due > 0 ? due + ' still due.' : 'Nothing else due right now.') + '</p>' +
      '<div class="btn-row" style="justify-content:center;margin-top:18px">' +
      (due > 0 ? '<button class="btn primary" id="fc-again">Another ' + Math.min(due, STORE.s.settings.sessionSize) + '</button>' : '') +
      '<a class="btn" href="#/quiz">Quiz round</a>' +
      '<a class="btn ghost" href="#/dashboard">Dashboard</a>' +
      '</div></div>';
  }

  function wireSummary() {
    var b = document.getElementById('fc-again');
    if (b) b.addEventListener('click', function () {
      session = build(session.opts);
      draw();
    });
  }
})();
