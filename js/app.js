/* app.js — router, sidebar chrome, event reactions, settings. Loaded last. */
(function () {
  'use strict';

  var current = null;

  function parseHash() {
    var raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    var qi = raw.indexOf('?');
    var name = (qi < 0 ? raw : raw.slice(0, qi)) || 'dashboard';
    var params = {};
    if (qi >= 0) {
      raw.slice(qi + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    return { name: name, params: params };
  }

  function route() {
    var r = parseHash();
    var view = VIEWS[r.name] || VIEWS.dashboard;

    if (current && current.unmount) { try { current.unmount(); } catch (e) {} }
    current = view;

    var host = document.getElementById('view');
    host.innerHTML = view.render(r.params);
    window.scrollTo(0, 0);
    if (view.mount) view.mount(r.params);

    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === r.name);
    });
    refreshChrome();
  }

  function refreshChrome() {
    var lvl = STORE.levelInfo();
    var s = STORE.s;

    document.getElementById('level-box').innerHTML =
      '<div class="lvl-row"><span class="lvl-name">' + lvl.title + '</span>' +
      '<span class="lvl-num">' + lvl.level + '/' + STORE.LEVELS.length + '</span></div>' +
      '<div class="xpbar"><i style="width:' + lvl.pct + '%"></i></div>' +
      '<div class="lvl-xp">' + lvl.xp.toLocaleString() + ' XP' +
      (lvl.max ? '' : ', ' + (lvl.need - lvl.into) + ' to go') + '</div>';

    document.getElementById('streak-box').innerHTML =
      '<div class="streak-row' + (s.streak.count > 0 ? ' live' : '') + '">' +
      '<b>' + s.streak.count + '</b><span>day streak</span></div>';

    var due = STORE.dueCount();
    document.getElementById('nav-due').textContent = due > 0 ? (due > 99 ? '99+' : due) : '';
  }

  /* ---------- reactions to store events ---------- */

  STORE.on(function (type, payload) {
    if (type === 'badge') {
      UI.confetti(120);
      UI.toast(payload.em, payload.name, payload.desc, true);
    }
    if (type === 'levelup') {
      UI.confetti(160);
      UI.toast('&#11088;', 'Level ' + payload.level + ' &mdash; ' + payload.title, 'Keep going.', true);
    }
    if (type === 'quest') {
      UI.toast('&#9989;', 'Quest complete', payload.label + '  +' + payload.xp + ' XP');
    }
    if (type === 'questbonus') {
      UI.confetti(120);
      UI.toast('&#127942;', 'All daily quests cleared', 'Bonus +120 XP', true);
    }
    if (type === 'streak' && payload.count > 1) {
      UI.toast('&#128293;', payload.count + ' day streak', 'Back again tomorrow.');
    }
    if (type === 'badge' || type === 'levelup' || type === 'quest' || type === 'questbonus') {
      setTimeout(refreshChrome, 50);
    }
  });

  /* ---------- settings modal ---------- */

  function openSettings() {
    var s = STORE.s;
    UI.modal(
      '<h3>Settings</h3>' +
      '<div style="margin-bottom:16px">' +
      '<label class="muted" style="font-size:13px;display:block;margin-bottom:6px">Cards per flashcard session</label>' +
      '<input id="set-session" type="number" min="5" max="200" value="' + s.settings.sessionSize + '" ' +
      'style="width:100%;padding:9px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--mono)">' +
      '</div>' +
      '<div style="margin-bottom:20px">' +
      '<label class="muted" style="font-size:13px;display:block;margin-bottom:6px">Questions per quiz round</label>' +
      '<input id="set-quiz" type="number" min="3" max="50" value="' + s.settings.quizSize + '" ' +
      'style="width:100%;padding:9px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--mono)">' +
      '</div>' +

      '<div class="sec-title" style="margin-top:0">Your progress</div>' +
      '<p class="muted" style="font-size:13px;margin-top:0;line-height:1.6">This site is fully static, so there is no server and ' +
      'nothing is sent anywhere. Your progress is saved in this browser\'s local storage, which means it is ' +
      '<strong>per browser and per device</strong> and is wiped if you clear site data. ' +
      'Download a backup file to move it to another machine.</p>' +
      '<div class="btn-row" style="margin-bottom:20px">' +
      '<button class="btn" id="set-download">Download backup</button>' +
      '<input type="file" id="set-file" accept=".json,application/json" style="display:none">' +
      '<button class="btn" id="set-upload">Restore from file</button>' +
      '<button class="btn ghost" id="set-export">Copy as text</button>' +
      '<button class="btn ghost" id="set-import">Paste text</button>' +
      '</div>' +
      '<textarea id="set-io" placeholder="Paste a backup here, then press Import" ' +
      'style="display:none;width:100%;height:120px;padding:11px;border-radius:9px;border:1px solid var(--border);background:#0d1117;color:var(--text);font-family:var(--mono);font-size:11.5px;resize:vertical"></textarea>' +

      '<div class="spread" style="margin-top:22px;padding-top:18px;border-top:1px solid var(--border)">' +
      '<button class="btn ghost tiny" id="set-reset" style="color:var(--red)">Reset all progress</button>' +
      '<button class="btn primary" id="set-save">Save</button>' +
      '</div>'
    );

    document.getElementById('set-save').addEventListener('click', function () {
      var a = parseInt(document.getElementById('set-session').value, 10);
      var b = parseInt(document.getElementById('set-quiz').value, 10);
      if (a >= 5) STORE.s.settings.sessionSize = a;
      if (b >= 3) STORE.s.settings.quizSize = b;
      STORE.saveNow();
      UI.closeModal();
      UI.toast('&#9881;&#65039;', 'Settings saved', '');
    });

    document.getElementById('set-download').addEventListener('click', function () {
      var blob = new Blob([STORE.exportJSON()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ios-interview-prep-' + STORE.todayKey() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      UI.toast('&#128190;', 'Backup downloaded', 'Keep it somewhere safe.');
    });

    document.getElementById('set-upload').addEventListener('click', function () {
      document.getElementById('set-file').click();
    });

    document.getElementById('set-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          STORE.importJSON(reader.result);
          UI.closeModal();
          route();
          UI.toast('&#9989;', 'Progress restored', file.name);
        } catch (err) {
          UI.toast('&#9888;&#65039;', 'Restore failed', err.message);
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('set-export').addEventListener('click', function () {
      var ta = document.getElementById('set-io');
      ta.style.display = 'block';
      ta.value = STORE.exportJSON();
      ta.select();
      try {
        document.execCommand('copy');
        UI.toast('&#128203;', 'Copied to clipboard', 'Paste it somewhere safe.');
      } catch (e) {
        UI.toast('&#128203;', 'Backup ready', 'Copy the text below.');
      }
    });

    document.getElementById('set-import').addEventListener('click', function () {
      var ta = document.getElementById('set-io');
      if (ta.style.display === 'none') {
        ta.style.display = 'block';
        ta.value = '';
        ta.focus();
        return;
      }
      try {
        STORE.importJSON(ta.value);
        UI.closeModal();
        route();
        UI.toast('&#9989;', 'Progress imported', '');
      } catch (e) {
        UI.toast('&#9888;&#65039;', 'Import failed', e.message);
      }
    });

    document.getElementById('set-reset').addEventListener('click', function () {
      if (this.dataset.armed) {
        STORE.reset();
        UI.closeModal();
        route();
        UI.toast('&#128465;&#65039;', 'Progress reset', 'Starting fresh.');
      } else {
        this.dataset.armed = '1';
        this.textContent = 'Tap again to confirm';
      }
    });
  }

  /* ---------- boot ---------- */

  // With no build step the app is 18 separate script tags. If one fails to
  // arrive, the page would otherwise render confidently wrong numbers.
  // Check the content actually loaded and say so plainly if it did not.
  var EXPECT = { topics: 30, challenges: 25, mocks: 18, badges: 39 };

  function contentIsComplete() {
    return IPREP.topics.length >= EXPECT.topics &&
           IPREP.challenges.length >= EXPECT.challenges &&
           IPREP.mocks.length >= EXPECT.mocks &&
           IPREP.badges.length >= EXPECT.badges;
  }

  function showLoadFailure() {
    var missing = [];
    if (IPREP.topics.length < EXPECT.topics)
      missing.push((EXPECT.topics - IPREP.topics.length) + ' topics');
    if (IPREP.challenges.length < EXPECT.challenges)
      missing.push((EXPECT.challenges - IPREP.challenges.length) + ' coding challenges');
    if (IPREP.mocks.length < EXPECT.mocks)
      missing.push((EXPECT.mocks - IPREP.mocks.length) + ' mock prompts');
    if (IPREP.badges.length < EXPECT.badges)
      missing.push('the badge set');

    document.getElementById('view').innerHTML =
      '<div class="empty"><h3>Some content did not load</h3>' +
      '<p>Missing ' + missing.join(', ') + '. Your saved progress is untouched. ' +
      'Reload to fetch the rest.</p>' +
      '<div class="btn-row" style="justify-content:center;margin-top:20px">' +
      '<button class="btn primary" id="reload-now">Reload</button></div></div>';
    document.getElementById('reload-now').addEventListener('click', function () {
      location.reload();
    });
    console.warn('[iprep] incomplete content load:', missing.join(', '));
  }

  function boot() {
    if (!contentIsComplete()) {
      document.getElementById('btn-settings').addEventListener('click', openSettings);
      showLoadFailure();
      return;
    }

    // "Comeback" detection before anything writes today's entry.
    var last = STORE.s.streak.last;
    if (last) {
      var gap = Math.round((new Date(STORE.todayKey() + 'T00:00:00') - new Date(last + 'T00:00:00')) / 86400000);
      if (gap >= 3) STORE.emit('flag', 'comeback');
    }

    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('modal').addEventListener('click', function (e) {
      if (e.target.id === 'modal') UI.closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') UI.closeModal();
    });

    window.addEventListener('hashchange', route);
    STORE.checkBadges();
    route();

    console.log('%ciOS Interview Prep', 'font-weight:700;font-size:14px',
      '\n' + IPREP.topics.length + ' topics · ' + IPREP.allCards().length + ' cards · ' +
      IPREP.allQuiz().length + ' quiz questions · ' + IPREP.challenges.length + ' challenges · ' +
      IPREP.mocks.length + ' mock prompts · ' + IPREP.badges.length + ' badges');
  }

  window.APP = { route: route, refreshChrome: refreshChrome };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
