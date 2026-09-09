/* topics.js — browse all 30 topics, drill into one */
window.VIEWS = window.VIEWS || {};

(function () {
  VIEWS.topics = {
    render: function (p) { return p.id ? detail(p.id) : list(p); },
    mount: function () {
      document.querySelectorAll('[data-goto]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          location.hash = el.getAttribute('data-goto');
        });
      });
    }
  };

  function list(p) {
    var only = p.domain || null;
    var h = '<div class="page-head"><h1>Topics</h1>' +
      '<p>Thirty topics across six domains. Mastery is derived from how far out each card is scheduled, ' +
      'so it only rises as you keep getting cards right over time.</p></div>';

    h += '<div class="filters">';
    h += '<span class="chip' + (!only ? ' on' : '') + '" data-goto="#/topics">All</span>';
    Object.keys(IPREP.DOMAINS).forEach(function (id) {
      h += '<span class="chip' + (only === id ? ' on' : '') + '" data-goto="#/topics?domain=' + id + '">' +
           IPREP.DOMAINS[id].short + '</span>';
    });
    h += '</div>';

    Object.keys(IPREP.DOMAINS).forEach(function (dId) {
      if (only && only !== dId) return;
      var d = IPREP.DOMAINS[dId];
      var ts = IPREP.topicsIn(dId);
      h += '<div class="sec">' + d.name + '</div>';
      h += '<div class="card" style="padding:6px">';
      ts.forEach(function (t) {
        var m = STORE.topicMastery(t.id);
        var newCards = t.cards.filter(function (c) { return !STORE.cardState(c.key); }).length;
        h += '<div class="trow" data-goto="#/topics?id=' + t.id + '" style="--spine:' + d.color + '">';
        
        h += '<span class="tname" style="padding-left:11px">' + UI.esc(t.title) +
             '<span class="dim" style="font-size:11.5px"> &nbsp;' + t.cards.length + ' cards &middot; ' +
             t.quiz.length + ' quiz' + (newCards ? ' &middot; ' + newCards + ' new' : '') + '</span></span>';
        h += '<span class="tbar"><i style="width:' + (m * 100) + '%;background:' + d.color + '"></i></span>';
        h += '<span class="tpct">' + Math.round(m * 100) + '%</span>';
        h += '</div>';
      });
      h += '</div>';
    });
    return h;
  }

  function detail(id) {
    var t = IPREP.topic(id);
    if (!t) return '<div class="empty"><h3>Topic not found</h3></div>';
    var d = IPREP.domainOf(t.domain);
    var m = STORE.topicMastery(id);

    var h = '<div class="spread" style="margin-bottom:16px">';
    h += '<a class="btn ghost tiny" href="#/topics">&larr; All topics</a>';
    h += '<span class="pill" style="background:' + d.color + '22;color:' + d.color + '">' + d.name + '</span>';
    h += '</div>';

    h += '<div class="page-head"><h1>' + UI.esc(t.title) + '</h1><p>' + UI.esc(t.summary) + '</p></div>';

    h += '<div class="grid g4" style="margin-bottom:20px">';
    h += '<div class="stat"><div class="k">Mastery</div><div class="v">' + Math.round(m * 100) + '%</div>' +
         '<div class="s">' + masteryLabel(m) + '</div></div>';
    h += '<div class="stat"><div class="k">Cards</div><div class="v">' + t.cards.length + '</div>' +
         '<div class="s">' + t.cards.filter(function (c) { return STORE.cardState(c.key); }).length + ' seen</div></div>';
    h += '<div class="stat"><div class="k">Quiz</div><div class="v">' + t.quiz.length + '</div><div class="s">questions</div></div>';
    var rel = IPREP.challenges.filter(function (c) { return c.topic === id; });
    h += '<div class="stat"><div class="k">Challenges</div><div class="v">' + rel.length + '</div><div class="s">linked</div></div>';
    h += '</div>';

    h += '<div class="btn-row" style="margin-bottom:8px">';
    h += '<a class="btn primary" href="#/flashcards?topic=' + id + '">Study these cards</a>';
    h += '<a class="btn" href="#/quiz?topic=' + id + '">Quiz this topic</a>';
    rel.forEach(function (c) {
      h += '<a class="btn ghost" href="#/code?id=' + c.id + '">' + UI.esc(c.title) + '</a>';
    });
    h += '</div>';

    h += '<div class="sec">Every card in this topic</div>';
    h += '<div class="card" style="padding:8px">';
    t.cards.forEach(function (c) {
      var st = STORE.cardState(c.key);
      h += '<div class="trow" style="cursor:default">';
      h += '<span class="pill ' + c.d + '">' + c.d[0].toUpperCase() + '</span>';
      h += '<span class="tname" style="white-space:normal">' + UI.line(c.q) + '</span>';
      h += '<span class="tpct">' + (st ? UI.relDays(st.due) : 'new') + '</span>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  function masteryLabel(m) {
    if (m === 0) return 'Not started';
    if (m < 0.25) return 'Just introduced';
    if (m < 0.5) return 'Getting familiar';
    if (m < 0.75) return 'Solid recall';
    if (m < 0.9) return 'Nearly there';
    return 'Interview ready';
  }
})();
