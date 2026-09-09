/* dashboard.js */
window.VIEWS = window.VIEWS || {};

VIEWS.dashboard = {
  render: function () {
    var due = STORE.dueCount();
    var lvl = STORE.levelInfo();
    var mastery = STORE.overallMastery();
    var s = STORE.s;
    var quests = STORE.questDefs();

    var hour = new Date().getHours();
    var greet = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    var h = '';

    /* hero */
    h += '<div class="hero">';
    h += '<div class="hero-main">';
    h += '<h2>' + greet + '</h2>';
    h += '<p>' + (due > 0
      ? '<strong>' + due + '</strong> card' + (due === 1 ? '' : 's') + ' ready for review. Spaced repetition works best in short daily sessions.'
      : 'Nothing due right now. Try a quiz round or a coding challenge to keep the streak alive.') + '</p>';
    h += '<div class="btn-row">';
    h += '<a class="btn primary" href="#/flashcards">' + (due > 0 ? 'Review ' + Math.min(due, s.settings.sessionSize) + ' cards' : 'Study anyway') + '</a>';
    h += '<a class="btn" href="#/quiz">Quiz round</a>';
    h += '<a class="btn" href="#/code">Code challenge</a>';
    h += '<a class="btn" href="#/gauntlet" style="border-color:rgba(255,107,107,.4)">&#128128; The Gauntlet</a>';
    h += '</div></div>';
    h += '<div class="hero-ring">' + UI.ring(mastery, 112, 9, '#5b8cff') +
         '<div class="rt"><b>' + Math.round(mastery * 100) + '%</b><span>mastery</span></div></div>';
    h += '</div>';

    /* stats */
    h += '<div class="grid g4">';
    h += stat('Streak', s.streak.count + (s.streak.count === 1 ? ' day' : ' days'), fireLabel(s.streak.count));
    h += stat('Level ' + lvl.level, lvl.title, lvl.max ? 'Maxed out' : (lvl.need - lvl.into) + ' XP to next');
    h += stat('Cards reviewed', s.totals.cards, STORE.activeDays() + ' active day' + (STORE.activeDays() === 1 ? '' : 's'));
    h += stat('Badges', STORE.badgeCount() + ' / ' + IPREP.badges.length, quizAccuracy());
    h += '</div>';

    /* quests */
    h += '<div class="sec-title">Daily quests</div>';
    h += '<div class="grid g3">';
    quests.forEach(function (q) {
      h += '<div class="quest' + (q.done ? ' done' : '') + '">';
      h += '<div class="quest-check">&#10003;</div>';
      h += '<div class="quest-body"><b>' + UI.esc(q.label) + '</b>';
      h += '<div class="bar"><i class="' + (q.done ? 'green' : '') + '" style="width:' + (q.progress / q.target * 100) + '%"></i></div>';
      h += '</div>';
      h += '<div class="quest-xp">' + (q.done ? '+' + q.xp : q.progress + '/' + q.target) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    if (STORE.day().bonus) {
      h += '<p class="dim" style="margin-top:10px;font-size:12.5px">All quests cleared today. Bonus +120 XP banked.</p>';
    }

    /* activity */
    h += '<div class="sec-title">Last 14 days</div>';
    h += '<div class="card">' + sparkline(STORE.last14()) + '</div>';

    /* domains */
    h += '<div class="sec-title">Domains</div>';
    h += '<div class="grid g2">';
    Object.keys(IPREP.DOMAINS).forEach(function (id) {
      var d = IPREP.DOMAINS[id];
      var ts = IPREP.topicsIn(id);
      var m = ts.reduce(function (a, t) { return a + STORE.topicMastery(t.id); }, 0) / (ts.length || 1);
      h += '<div class="card" style="cursor:pointer" data-goto="#/topics?domain=' + id + '">';
      h += '<div class="spread" style="margin-bottom:9px"><b style="font-size:13.5px">' + d.name + '</b>';
      h += '<span class="dim" style="font-family:var(--mono);font-size:11.5px">' + Math.round(m * 100) + '%</span></div>';
      h += '<div class="bar"><i style="width:' + (m * 100) + '%;background:' + d.color + '"></i></div>';
      h += '<div class="dim" style="font-size:11.5px;margin-top:7px">' + ts.length + ' topics</div>';
      h += '</div>';
    });
    h += '</div>';

    /* weakest */
    var weak = weakest();
    if (weak.length) {
      h += '<div class="sec-title">Worth another look</div>';
      h += '<div class="card" style="padding:6px">';
      weak.forEach(function (w) {
        var d = IPREP.domainOf(w.topic.domain);
        h += '<div class="topic-row" data-goto="#/flashcards?topic=' + w.topic.id + '">';
        h += '<span class="dom-dot" style="background:' + d.color + '"></span>';
        h += '<span class="tn">' + UI.esc(w.topic.title) + '</span>';
        h += '<span class="bar"><i style="width:' + (w.m * 100) + '%;background:' + d.color + '"></i></span>';
        h += '<span class="pct">' + Math.round(w.m * 100) + '%</span>';
        h += '</div>';
      });
      h += '</div>';
    }

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

function fireLabel(n) {
  if (n === 0) return 'Start one today';
  if (n < 3) return 'Keep it going';
  if (n < 7) return 'Building momentum';
  if (n < 14) return 'Solid habit';
  return 'Unstoppable';
}

function quizAccuracy() {
  var t = STORE.s.totals;
  if (!t.quizQ) return 'No quiz yet';
  return Math.round(t.quizRight / t.quizQ * 100) + '% quiz accuracy';
}

function weakest() {
  return IPREP.topics
    .map(function (t) { return { topic: t, m: STORE.topicMastery(t.id) }; })
    .filter(function (x) { return x.m < 0.75; })
    .sort(function (a, b) { return a.m - b.m; })
    .slice(0, 6);
}

function sparkline(days) {
  var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.n; })));
  var h = '<div style="display:flex;align-items:flex-end;gap:6px;height:74px">';
  days.forEach(function (d) {
    var pct = d.n / max;
    var col = d.n === 0 ? 'var(--surface-3)' : 'var(--accent)';
    h += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px" title="' + d.k + ': ' + d.n + '">';
    h += '<div style="width:100%;height:' + Math.max(3, pct * 56) + 'px;background:' + col + ';border-radius:4px"></div>';
    h += '<span style="font-size:9.5px;color:var(--dim);font-family:var(--mono)">' + d.k.slice(8) + '</span>';
    h += '</div>';
  });
  h += '</div>';
  var total = days.reduce(function (a, d) { return a + d.n; }, 0);
  h += '<div class="dim" style="font-size:11.5px;margin-top:11px">' + total + ' reviews in the last two weeks</div>';
  return h;
}
