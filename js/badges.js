/* badges.js — achievement gallery */
window.VIEWS = window.VIEWS || {};

VIEWS.badges = {
  render: function () {
    var got = STORE.badgeCount();
    var lvl = STORE.levelInfo();

    var h = '<div class="page-head"><h1>Badges</h1>' +
      '<p>' + got + ' of ' + IPREP.badges.length + ' unlocked. Every badge is worth XP, and XP moves you up the ladder ' +
      'from Curious Beginner to Interview Final Boss.</p></div>';

    /* level ladder */
    h += '<div class="card" style="margin-bottom:22px">';
    h += '<div class="spread" style="margin-bottom:12px">';
    h += '<div><div style="font-size:17px;font-weight:720;letter-spacing:-.025em">' + lvl.title + '</div>' +
         '<div class="dim" style="font-size:12px">Level ' + lvl.level + ' of ' + STORE.LEVELS.length + '</div></div>';
    h += '<div style="text-align:right;font-family:var(--mono);font-size:12.5px" class="muted">' +
         lvl.xp + ' XP' + (lvl.max ? '' : ' &middot; ' + (lvl.need - lvl.into) + ' to next') + '</div>';
    h += '</div>';
    h += '<div class="xpbar"><i style="width:' + lvl.pct + '%"></i></div>';
    h += '<div style="display:flex;gap:5px;margin-top:14px;flex-wrap:wrap">';
    STORE.LEVELS.forEach(function (name, i) {
      var on = i <= lvl.index;
      h += '<span class="pill" style="' + (on ? 'background:var(--accent-soft);color:#bdd1ff' : '') + '">' + name + '</span>';
    });
    h += '</div></div>';

    /* badges */
    var unlocked = IPREP.badges.filter(function (b) { return STORE.s.badges[b.id]; });
    var locked = IPREP.badges.filter(function (b) { return !STORE.s.badges[b.id]; });

    if (unlocked.length) {
      h += '<div class="sec-title">Unlocked</div><div class="grid g4">';
      unlocked.forEach(function (b) { h += card(b, true); });
      h += '</div>';
    }
    h += '<div class="sec-title">Still locked</div><div class="grid g4">';
    locked.forEach(function (b) { h += card(b, false); });
    h += '</div>';

    return h;

    function card(b, on) {
      var when = on ? new Date(STORE.s.badges[b.id]).toLocaleDateString() : '';
      return '<div class="badge ' + (on ? 'unlocked' : 'locked') + '">' +
        '<span class="em">' + b.em + '</span>' +
        '<b>' + UI.esc(b.name) + '</b>' +
        '<span>' + UI.esc(b.desc) + '</span>' +
        (on ? '<span class="when">' + when + ' &middot; +' + (b.xp || 40) + ' XP</span>'
            : '<span class="when">+' + (b.xp || 40) + ' XP</span>') +
        '</div>';
    }
  },
  mount: function () {}
};
