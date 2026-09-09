/* quiz.js — timed multiple choice with a wrong-answer review queue */
window.VIEWS = window.VIEWS || {};

(function () {
  var q = null, tick = null;

  VIEWS.quiz = {
    render: function (p) {
      q = build(p);
      if (!q.items.length) {
        return '<div class="page-head"><h1>Quiz</h1></div>' +
          '<div class="empty"><h3>No questions match</h3><p>Try another filter.</p>' +
          '<div class="btn-row" style="justify-content:center;margin-top:16px"><a class="btn" href="#/quiz">All topics</a></div></div>';
      }
      return '<div class="qz-stage"><div id="qz-slot"></div></div>';
    },

    mount: function () {
      if (!q || !q.items.length) return;
      STORE.resetQuizStreak();
      draw();
      document.addEventListener('keydown', keys);
      tick = setInterval(function () {
        var el = document.getElementById('qz-timer');
        if (!el || q.locked) return;
        var s = (Date.now() - q.startedAt) / 1000;
        el.textContent = UI.fmtTime(s);
        el.className = 'qz-timer' + (s > 45 ? ' danger' : s > 25 ? ' warn' : '');
      }, 250);
    },

    unmount: function () {
      document.removeEventListener('keydown', keys);
      clearInterval(tick);
    }
  };

  function build(p) {
    var pool = IPREP.allQuiz().filter(function (x) {
      if (p.topic && x.topic !== p.topic) return false;
      if (p.domain && x.domain !== p.domain) return false;
      if (p.diff && p.diff !== 'all' && x.d !== p.diff) return false;
      return true;
    });
    // Favour questions previously answered wrong.
    var wrong = [], rest = [];
    pool.forEach(function (x) {
      var r = STORE.s.quiz[x.key];
      (r && r.wrong > r.right ? wrong : rest).push(x);
    });
    STORE.shuffle(wrong); STORE.shuffle(rest);
    var n = STORE.s.settings.quizSize;
    var items = wrong.slice(0, Math.ceil(n / 2)).concat(rest).slice(0, n);
    STORE.shuffle(items);

    return { items: items, i: 0, score: 0, streak: 0, locked: false, picked: -1,
             startedAt: Date.now(), roundStart: Date.now(), missed: [], p: p };
  }

  function draw() {
    var slot = document.getElementById('qz-slot');
    if (!slot) return;
    if (q.i >= q.items.length) { finish(slot); return; }

    var item = q.items[q.i];
    var t = IPREP.topic(item.topic);
    var d = IPREP.domainOf(item.domain);

    var h = '';
    h += '<div class="fc-meta">';
    h += '<span class="dom-dot" style="background:' + d.color + '"></span>';
    h += '<span class="dim" style="font-size:12.5px">' + UI.esc(t.title) + '</span>';
    h += '<span class="pill ' + item.d + '">' + item.d + '</span>';
    var streakBadge = q.streak >= 3
      ? '<span class="pill" style="background:rgba(255,138,76,.16);color:var(--orange)">&#128293; ' + q.streak + ' in a row</span>'
      : '';
    h += streakBadge;
    h += '<span class="prog"><span id="qz-timer" class="qz-timer">0:00</span> &nbsp; ' + (q.i + 1) + ' / ' + q.items.length + ' &nbsp; ' + q.score + ' correct</span>';
    h += '</div>';

    h += '<div class="bar" style="margin-bottom:20px"><i style="width:' + (q.i / q.items.length * 100) + '%"></i></div>';
    h += '<h2 class="qz-q">' + UI.esc(item.q) + '</h2>';

    item.choices.forEach(function (c, idx) {
      var cls = 'choice';
      if (q.locked) {
        cls += ' locked';
        if (idx === item.correct) cls += ' correct';
        else if (idx === q.picked) cls += ' wrong';
      }
      h += '<div class="' + cls + '" data-pick="' + idx + '">';
      h += '<span class="key">' + 'ABCD'[idx] + '</span><span>' + UI.esc(c) + '</span></div>';
    });

    if (q.locked) {
      h += '<div class="qz-why">' + UI.rich(item.why) + '</div>';
      h += '<div class="btn-row mt" style="justify-content:flex-end">' +
           '<button class="btn primary" id="qz-next">' + (q.i === q.items.length - 1 ? 'See results' : 'Next') +
           ' <span class="kbd" style="margin-left:6px">&#8629;</span></button></div>';
    }

    h += '<div class="center mt2"><a class="btn ghost tiny" href="#/dashboard">End round</a></div>';
    slot.innerHTML = h;

    if (!q.locked) {
      slot.querySelectorAll('[data-pick]').forEach(function (el) {
        el.addEventListener('click', function () { pick(parseInt(el.getAttribute('data-pick'), 10)); });
      });
    } else {
      document.getElementById('qz-next').addEventListener('click', next);
    }
  }

  function pick(idx) {
    if (q.locked) return;
    var item = q.items[q.i];
    q.locked = true;
    q.picked = idx;
    var right = idx === item.correct;
    if (right) {
      q.score++;
      q.streak++;
      if (q.streak === 5 || q.streak === 10 || q.streak === 15) {
        UI.confetti(30, ['#ff8a4c', '#ffc247']);
        UI.toast('&#128293;', q.streak + ' in a row', 'Keep the run alive.');
      }
    } else {
      q.streak = 0;
      q.missed.push(item);
    }
    STORE.answerQuiz(item, right);
    draw();
  }

  function next() {
    q.i++;
    q.locked = false;
    q.picked = -1;
    q.startedAt = Date.now();
    draw();
  }

  function keys(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (!q || q.i >= q.items.length) return;
    if (!q.locked) {
      var k = e.key.toUpperCase();
      var idx = 'ABCD'.indexOf(k);
      if (idx < 0 && e.key >= '1' && e.key <= '4') idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < q.items[q.i].choices.length) { e.preventDefault(); pick(idx); }
    } else if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault(); next();
    }
  }

  function finish(slot) {
    var seconds = (Date.now() - q.roundStart) / 1000;
    if (!q.reported) {
      q.reported = true;
      STORE.finishQuiz(q.score, q.items.length, seconds);
    }
    var pct = Math.round(q.score / q.items.length * 100);
    var em = pct === 100 ? '&#127942;' : pct >= 80 ? '&#127881;' : pct >= 60 ? '&#128077;' : '&#128218;';
    var msg = pct === 100 ? 'Flawless round.' :
              pct >= 80 ? 'Strong. Review the misses below.' :
              pct >= 60 ? 'Getting there. The misses are your study list.' :
                          'Worth slowing down on these topics.';

    var h = '<div class="empty" style="padding-bottom:24px">';
    h += '<div style="font-size:44px;margin-bottom:6px">' + em + '</div>';
    h += '<h3>' + q.score + ' / ' + q.items.length + ' &middot; ' + pct + '%</h3>';
    h += '<p>' + msg + ' ' + UI.fmtTime(seconds) + ' total, ' + (seconds / q.items.length).toFixed(1) + 's a question.</p>';
    h += '<div class="btn-row" style="justify-content:center;margin-top:18px">';
    h += '<button class="btn primary" id="qz-again">Another round</button>';
    h += '<a class="btn" href="#/flashcards">Flashcards</a>';
    h += '<a class="btn ghost" href="#/dashboard">Dashboard</a>';
    h += '</div></div>';

    if (q.missed.length) {
      h += '<div class="sec-title">Missed &mdash; worth a flashcard pass</div>';
      q.missed.forEach(function (m) {
        var t = IPREP.topic(m.topic);
        h += '<div class="row" style="margin-bottom:9px" data-goto="#/flashcards?topic=' + m.topic + '">';
        h += '<div class="row-body"><b>' + UI.esc(m.q) + '</b><span>' + UI.esc(t.title) + '</span></div>';
        h += '<span class="dim">&rsaquo;</span></div>';
      });
    }

    slot.innerHTML = h;
    document.getElementById('qz-again').addEventListener('click', function () {
      q = build(q.p);
      STORE.resetQuizStreak();
      draw();
    });
    slot.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function () { location.hash = el.getAttribute('data-goto'); });
    });
  }
})();
