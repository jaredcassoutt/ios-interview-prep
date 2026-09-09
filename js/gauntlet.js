/* gauntlet.js — rapid-fire boss run: 3 lives, a shrinking clock, and a combo multiplier */
window.VIEWS = window.VIEWS || {};

(function () {
  var g = null, raf = null;

  var LENGTH = 25;
  var PER_QUESTION = 15000;   // ms
  var TIERS = [
    { combo: 12, mult: 4,   label: 'UNSTOPPABLE', color: '#ff4d6d' },
    { combo: 8,  mult: 3,   label: 'ON FIRE',     color: '#ff8a4c' },
    { combo: 5,  mult: 2,   label: 'HEATING UP',  color: '#ffc247' },
    { combo: 3,  mult: 1.5, label: 'COMBO',       color: '#3ddc97' },
    { combo: 0,  mult: 1,   label: '',            color: '#5b8cff' }
  ];

  function tier(combo) {
    for (var i = 0; i < TIERS.length; i++) if (combo >= TIERS[i].combo) return TIERS[i];
    return TIERS[TIERS.length - 1];
  }

  VIEWS.gauntlet = {
    render: function () {
      return '<div class="stage"><div id="gt-slot">' + intro() + '</div></div>';
    },
    mount: function () {
      wireIntro();
      document.addEventListener('keydown', keys);
    },
    unmount: function () {
      document.removeEventListener('keydown', keys);
      cancelAnimationFrame(raf);
      g = null;
    }
  };

  /* ---------- intro ---------- */

  function intro() {
    var best = STORE.s.gauntlet || { score: 0, streak: 0, runs: 0, cleared: 0 };
    var h = '<div class="gt-intro">';
    h += '<div class="gt-mark">&#128128;</div>';
    h += '<h1 class="gt-title">The Gauntlet</h1>';
    h += '<p class="gt-sub">' + LENGTH + ' questions. Three lives. Fifteen seconds each.<br>' +
         'Consecutive correct answers build a multiplier. One wrong answer resets it.</p>';

    h += '<div class="grid g3 mt2" style="max-width:520px;margin:24px auto">';
    h += gstat('Best score', best.score.toLocaleString());
    h += gstat('Best combo', best.streak);
    h += gstat('Runs cleared', best.cleared + ' / ' + best.runs);
    h += '</div>';

    h += '<div class="btn-row" style="justify-content:center;margin-top:8px">';
    h += '<button class="btn primary" id="gt-start" style="padding:13px 30px;font-size:15px">Enter the Gauntlet</button>';
    h += '<a class="btn ghost" href="#/dashboard">Not today</a>';
    h += '</div>';
    h += '<p class="dim center" style="margin-top:22px;font-size:12px">Answer with <span class="kbd">A</span>&thinsp;' +
         '<span class="kbd">B</span>&thinsp;<span class="kbd">C</span>&thinsp;<span class="kbd">D</span> or ' +
         '<span class="kbd">1</span>&ndash;<span class="kbd">4</span>. No going back.</p>';
    h += '</div>';
    return h;

    function gstat(k, v) {
      return '<div class="stat center"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
    }
  }

  function wireIntro() {
    var b = document.getElementById('gt-start');
    if (b) b.addEventListener('click', start);
  }

  /* ---------- run ---------- */

  function start() {
    var pool = IPREP.allQuiz().slice();
    STORE.shuffle(pool);
    // Spread across domains so it never becomes one-topic trivia.
    var byDomain = {}, ordered = [];
    pool.forEach(function (q) { (byDomain[q.domain] = byDomain[q.domain] || []).push(q); });
    var doms = Object.keys(byDomain);
    for (var i = 0; ordered.length < LENGTH; i++) {
      var d = doms[i % doms.length];
      if (byDomain[d] && byDomain[d].length) ordered.push(byDomain[d].shift());
      if (i > 400) break;
    }

    g = {
      items: ordered.slice(0, LENGTH), i: 0, lives: 3, score: 0, combo: 0,
      bestCombo: 0, right: 0, locked: false, picked: -1,
      deadline: Date.now() + PER_QUESTION, over: false
    };
    STORE.resetQuizStreak();
    draw();
    loop();
  }

  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function step() {
      if (!g || g.over) return;
      if (!g.locked) {
        var left = g.deadline - Date.now();
        var bar = document.getElementById('gt-fuse');
        if (bar) {
          var pct = Math.max(0, left / PER_QUESTION);
          bar.style.width = (pct * 100) + '%';
          bar.style.background = pct > 0.5 ? 'var(--green)' : pct > 0.25 ? 'var(--yellow)' : 'var(--red)';
        }
        var num = document.getElementById('gt-secs');
        if (num) num.textContent = Math.max(0, left / 1000).toFixed(1);
        if (left <= 0) { timeout(); return; }
      }
      raf = requestAnimationFrame(step);
    });
  }

  function draw() {
    var slot = document.getElementById('gt-slot');
    if (!slot || !g) return;
    if (g.over) return;
    if (g.i >= g.items.length || g.lives <= 0) { finish(); return; }

    var item = g.items[g.i];
    var t = tier(g.combo);
    var dom = IPREP.domainOf(item.domain);

    var h = '';
    h += '<div class="gt-hud">';
    h += '<div class="gt-lives">';
    for (var i = 0; i < 3; i++) h += '<span class="pip' + (i < g.lives ? '' : ' dead') + '"></span>';
    h += '</div>';
    h += '<div class="gt-score" id="gt-score">' + Math.round(g.score).toLocaleString() + '</div>';
    h += '<div class="gt-combo" style="' + (g.combo >= 3 ? 'color:' + t.color : '') + '">' +
         (g.combo >= 2 ? '&times;' + t.mult + ' <em>' + (t.label || '') + '</em>' :
          '<span class="dim">no combo</span>') + '</div>';
    h += '<div class="gt-count">' + (g.i + 1) + ' / ' + g.items.length + '</div>';
    h += '</div>';

    h += '<div class="fuse"><i id="gt-fuse" style="width:100%"></i></div>';
    h += '<div class="gt-secs"><span id="gt-secs">15.0</span>s</div>';

    h += '<div class="stage-head" style="margin-top:14px">';
    h += '<span class="spine" style="background:' + dom.color + '"></span>';
    h += '<span class="where">' + dom.short + '</span>';
    h += '<span class="pill ' + item.d + '">' + item.d + '</span>';
    h += '</div>';

    h += '<h2 class="qz-q">' + UI.line(item.q) + '</h2>';
    item.choices.forEach(function (c, idx) {
      var cls = 'choice';
      if (g.locked) {
        cls += ' locked';
        if (idx === item.correct) cls += ' correct';
        else if (idx === g.picked) cls += ' wrong';
      }
      h += '<div class="' + cls + '" data-pick="' + idx + '">' +
           '<span class="key">' + 'ABCD'[idx] + '</span><span>' + UI.line(c) + '</span></div>';
    });

    if (g.locked) {
      h += '<div class="why">' + UI.rich(item.why) + '</div>';
      h += '<div class="btn-row mt" style="justify-content:flex-end">' +
           '<button class="btn primary" id="gt-next">Next <span class="kbd" style="margin-left:6px">&#8629;</span></button></div>';
    }

    slot.innerHTML = h;

    if (!g.locked) {
      slot.querySelectorAll('[data-pick]').forEach(function (el) {
        el.addEventListener('click', function () { pick(parseInt(el.getAttribute('data-pick'), 10)); });
      });
    } else {
      document.getElementById('gt-next').addEventListener('click', next);
    }
  }

  function pick(idx) {
    if (!g || g.locked || g.over) return;
    var item = g.items[g.i];
    g.locked = true;
    g.picked = idx;
    var right = idx === item.correct;

    if (right) {
      var t = tier(g.combo);
      var gained = Math.round((100 + Math.max(0, (g.deadline - Date.now()) / 100)) * t.mult);
      g.score += gained;
      g.combo++;
      g.right++;
      if (g.combo > g.bestCombo) g.bestCombo = g.combo;
      flash('good');
      if (g.combo === 3 || g.combo === 5 || g.combo === 8 || g.combo === 12) {
        var nt = tier(g.combo);
        UI.toast('&#128293;', nt.label, 'Multiplier now ' + nt.mult + '×');
        UI.confetti(35, [nt.color]);
      }
    } else {
      g.lives--;
      g.combo = 0;
      flash('bad');
    }
    STORE.answerQuiz(item, right);
    draw();
  }

  function timeout() {
    if (!g || g.locked || g.over) return;
    g.locked = true;
    g.picked = -1;
    g.lives--;
    g.combo = 0;
    flash('bad');
    STORE.answerQuiz(g.items[g.i], false);
    draw();
  }

  function next() {
    if (!g) return;
    g.i++;
    g.locked = false;
    g.picked = -1;
    g.deadline = Date.now() + PER_QUESTION;
    if (g.i >= g.items.length || g.lives <= 0) { finish(); return; }
    draw();
    loop();
  }

  function flash(kind) {
    var el = document.createElement('div');
    el.className = 'gt-flash ' + kind;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 420);
  }

  function finish() {
    g.over = true;
    cancelAnimationFrame(raf);

    var cleared = g.lives > 0;
    var best = STORE.s.gauntlet || { score: 0, streak: 0, runs: 0, cleared: 0 };
    var newRecord = g.score > best.score;

    STORE.recordGauntlet(g.score, g.bestCombo, cleared);

    if (cleared) UI.confetti(180);
    else if (newRecord) UI.confetti(110);

    var slot = document.getElementById('gt-slot');
    var acc = Math.round(g.right / Math.max(1, g.i + (g.lives <= 0 ? 1 : 0)) * 100);

    var h = '<div class="gt-intro">';
    h += '<div class="gt-mark">' + (cleared ? '&#127942;' : '&#128128;') + '</div>';
    h += '<h1 class="gt-title">' + (cleared ? 'Gauntlet cleared' : 'Out of lives') + '</h1>';
    h += '<p class="gt-sub">' + (cleared
      ? 'All ' + g.items.length + ' survived. That is interview stamina.'
      : 'You made it to question ' + (g.i + 1) + ' of ' + g.items.length + '.') +
      (newRecord ? '<br><strong style="color:var(--yellow)">New personal best.</strong>' : '') + '</p>';

    h += '<div class="grid g4 mt2" style="max-width:660px;margin:24px auto">';
    h += '<div class="stat center"><div class="k">Score</div><div class="v">' + Math.round(g.score).toLocaleString() + '</div><div class="s">best ' + Math.max(best.score, g.score).toLocaleString() + '</div></div>';
    h += '<div class="stat center"><div class="k">Best combo</div><div class="v">' + g.bestCombo + '</div><div class="s">×' + tier(g.bestCombo).mult + ' peak</div></div>';
    h += '<div class="stat center"><div class="k">Accuracy</div><div class="v">' + acc + '%</div><div class="s">' + g.right + ' correct</div></div>';
    h += '<div class="stat center"><div class="k">Lives left</div><div class="v">' + Math.max(0, g.lives) + '</div><div class="s">of 3</div></div>';
    h += '</div>';

    h += '<div class="btn-row" style="justify-content:center">';
    h += '<button class="btn primary" id="gt-again">Run it back</button>';
    h += '<a class="btn" href="#/flashcards">Study the gaps</a>';
    h += '<a class="btn ghost" href="#/dashboard">Dashboard</a>';
    h += '</div></div>';

    slot.innerHTML = h;
    document.getElementById('gt-again').addEventListener('click', start);
    APP.refreshChrome();
  }

  function keys(e) {
    if (!g || g.over || e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (!g.locked) {
      var idx = 'ABCD'.indexOf(e.key.toUpperCase());
      if (idx < 0 && e.key >= '1' && e.key <= '4') idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < g.items[g.i].choices.length) { e.preventDefault(); pick(idx); }
    } else if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault(); next();
    }
  }
})();
