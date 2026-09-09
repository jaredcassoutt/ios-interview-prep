/* dashboard.js — readiness x-ray, quests, streak track */
window.VIEWS = window.VIEWS || {};

VIEWS.dashboard = {
  render: function () {
    var due = STORE.dueCount();
    var s = STORE.s;
    var quests = STORE.questDefs();
    var sessionSize = Math.min(due, s.settings.sessionSize);

    var h = '';

    /* ---- hero: how ready are you, per domain ---- */
    h += '<section class="hero">';
    h += '<div class="hero-top">';
    h += '<div class="hero-lede">';

    if (due > 0) {
      h += '<div class="hero-count">' + due + ' <small>card' + (due === 1 ? '' : 's') + ' due</small></div>';
      h += '<p class="hero-sub">' + subline(s) + '</p>';
    } else {
      h += '<div class="hero-count">All clear <small>for now</small></div>';
      h += '<p class="hero-sub">Nothing is scheduled. Run a quiz, take a coding challenge, ' +
           'or push into the Gauntlet to keep the streak alive.</p>';
    }
    h += '</div>';

    h += '<div class="hero-actions">';
    h += '<a class="btn primary" href="#/flashcards">' +
         (due > 0 ? 'Review ' + sessionSize + ' cards' : 'Study anyway') + '</a>';
    h += '<a class="btn" href="#/quiz">Quiz</a>';
    h += '<a class="btn" href="#/gauntlet">Gauntlet</a>';
    h += '</div>';
    h += '</div>';

    /* the x-ray itself */
    var doms = Object.keys(IPREP.DOMAINS).map(function (id) {
      var ts = IPREP.topicsIn(id);
      var m = ts.reduce(function (a, t) { return a + STORE.topicMastery(t.id); }, 0) / (ts.length || 1);
      return { id: id, d: IPREP.DOMAINS[id], m: m, topics: ts.length };
    });
    var weakestDomain = doms.slice().sort(function (a, b) { return a.m - b.m; })[0];

    h += '<div class="xray-label"><span>Readiness by domain</span><span>' +
         (weakestDomain.m < 0.15
           ? 'Barely started'
           : 'Weakest: ' + weakestDomain.d.short) + '</span></div>';
    h += '<div class="xray">';
    doms.forEach(function (x) {
      h += '<button class="xcol" data-goto="#/topics?domain=' + x.id + '" ' +
           'aria-label="' + UI.esc(x.d.name) + ', ' + Math.round(x.m * 100) + ' percent">';
      h += '<div class="xtrack"><div class="xfill" style="height:' +
           Math.max(2, x.m * 100) + '%;background:' + x.d.color + '"></div></div>';
      h += '<div class="xmeta">' +
           '<span class="xpct" style="color:' + (x.m > 0 ? x.d.color : 'var(--dim)') + '">' +
           Math.round(x.m * 100) + '<span style="font-size:10px;opacity:.55">%</span></span>' +
           '<span class="xname">' + x.d.short + '</span></div>';
      h += '</button>';
    });
    h += '</div>';
    h += '</section>';

    /* ---- quests ---- */
    h += '<div class="sec">Today</div>';
    h += '<div class="grid g3">';
    quests.forEach(function (q) {
      h += '<div class="quest' + (q.done ? ' done' : '') + '">';
      h += '<div class="qbox">&#10003;</div>';
      h += '<div class="qbody"><b>' + UI.esc(q.label) + '</b>';
      h += '<div class="qbar"><i style="width:' + (q.progress / q.target * 100) + '%"></i></div></div>';
      h += '<div class="qxp">' + (q.done ? '+' + q.xp : q.progress + '/' + q.target) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    if (STORE.day().bonus) {
      h += '<p class="dim" style="margin-top:11px;font-size:12.5px">All three cleared. Bonus 120 XP banked.</p>';
    }

    /* ---- numbers + streak track ---- */
    h += '<div class="sec">Progress</div>';
    h += '<div class="grid g4">';
    h += stat('Streak', s.streak.count + (s.streak.count === 1 ? ' day' : ' days'), streakNote(s.streak.count));
    h += stat('Cards reviewed', s.totals.cards, STORE.activeDays() + ' active day' + (STORE.activeDays() === 1 ? '' : 's'));
    h += stat('Quiz accuracy', accuracy(), s.totals.quizQ + ' answered');
    h += stat('Badges', STORE.badgeCount() + ' of ' + IPREP.badges.length, s.xp.toLocaleString() + ' XP total');
    h += '</div>';

    var days = STORE.lastN(28);
    var total = days.reduce(function (a, d) { return a + d.n; }, 0);
    var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.n; })));
    h += '<div class="card" style="margin-top:12px">';
    h += '<div class="track">';
    days.forEach(function (d) {
      var cls = d.n === 0 ? 'tday' : (d.run ? 'tday run' : 'tday on');
      h += '<div class="' + cls + '" style="height:' + (d.n === 0 ? 4 : Math.max(6, d.n / max * 46)) +
           'px" title="' + d.k + ': ' + d.n + '"></div>';
    });
    h += '</div>';
    h += '<div class="track-foot"><span>Four weeks back</span>' +
         '<span>' + (total > 0 ? total.toLocaleString() + ' reviews' : 'No reviews yet') + '</span>' +
         '<span>Today</span></div>';
    h += '</div>';

    /* ---- weakest topics ---- */
    var scored = IPREP.topics.map(function (t) {
      return { t: t, m: STORE.topicMastery(t.id) };
    }).sort(function (a, b) { return a.m - b.m; });

    // Take the weakest from each domain in turn, so the list spans the
    // syllabus instead of stacking six rows from one domain at a tie.
    var buckets = {}, weak = [];
    scored.forEach(function (x) { (buckets[x.t.domain] = buckets[x.t.domain] || []).push(x); });
    var keys = Object.keys(buckets);
    for (var pass = 0; weak.length < 6 && pass < 6; pass++) {
      keys.forEach(function (k) {
        if (weak.length < 6 && buckets[k][pass]) weak.push(buckets[k][pass]);
      });
    }
    weak.sort(function (a, b) { return a.m - b.m; });

    h += '<div class="sec">Weakest topics</div>';
    h += '<div class="card" style="padding:7px">';
    weak.forEach(function (w) {
      var d = IPREP.domainOf(w.t.domain);
      h += '<div class="trow" data-goto="#/flashcards?topic=' + w.t.id + '" style="--spine:' + d.color + '">';
      h += '<span class="tname" style="padding-left:11px">' + UI.esc(w.t.title) + '</span>';
      h += '<span class="tmeta">' + d.short + '</span>';
      h += '<span class="tbar"><i style="width:' + Math.max(2, w.m * 100) + '%;background:' + d.color + '"></i></span>';
      h += '<span class="tpct">' + Math.round(w.m * 100) + '%</span>';
      h += '</div>';
    });
    h += '</div>';

    return h;

    function stat(k, v, sub) {
      return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="s">' + sub + '</div></div>';
    }
  },

  mount: function () {
    document.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function () { location.hash = el.getAttribute('data-goto'); });
    });
  }
};

function subline(s) {
  if (s.totals.cards === 0) {
    return 'Start anywhere. Rate each card honestly and the scheduler will decide what comes back and when.';
  }
  if (s.streak.count === 0) {
    return 'You missed a day. Short sessions beat long ones, so clear what is due and rebuild the streak.';
  }
  return 'Spaced repetition rewards short daily sessions over long weekly ones.';
}

function streakNote(n) {
  if (n === 0) return 'Start one today';
  if (n < 3) return 'Keep it going';
  if (n < 7) return 'Building';
  if (n < 14) return 'Solid habit';
  if (n < 30) return 'Hard to break now';
  return 'Unbroken';
}

function accuracy() {
  var t = STORE.s.totals;
  return t.quizQ ? Math.round(t.quizRight / t.quizQ * 100) + '%' : '—';
}
