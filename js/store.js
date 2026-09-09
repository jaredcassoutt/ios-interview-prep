/* store.js — persistence, SM-2 scheduling, XP/levels, streaks, daily quests, badges. */
(function () {
  'use strict';

  var KEY = 'iprep.v1';
  var DAY = 86400000;

  var LEVELS = [
    'Curious Beginner', 'Xcode Tourist', 'Junior iOS Dev', 'iOS Developer',
    'Retain Cycle Slayer', 'Senior iOS Engineer', 'Concurrency Wrangler',
    'Staff Engineer', 'Architecture Nerd', 'Principal Engineer',
    'Distinguished Engineer', 'Interview Final Boss'
  ];

  // Cumulative XP needed to *reach* each level index (0-based).
  var THRESH = (function () {
    var out = [0], acc = 0;
    for (var i = 1; i < LEVELS.length; i++) { acc += 150 + (i - 1) * 110; out.push(acc); }
    return out;
  })();

  var QUEST_POOL = [
    { id: 'cards20',  g: 'cards', label: 'Review 20 flashcards',           target: 20, xp: 50, m: function (d) { return d.cards; } },
    { id: 'cards40',  g: 'cards', label: 'Review 40 flashcards',           target: 40, xp: 95, m: function (d) { return d.cards; } },
    { id: 'good15',   g: 'cards', label: 'Rate 15 cards Good or Easy',     target: 15, xp: 60, m: function (d) { return d.good; } },
    { id: 'hard5',    g: 'cards', label: 'Survive 5 hard cards',           target: 5,  xp: 65, m: function (d) { return d.hard; } },
    { id: 'quiz10',   g: 'quiz',  label: 'Nail 10 quiz questions',         target: 10, xp: 55, m: function (d) { return d.quizRight; } },
    { id: 'qstreak5', g: 'quiz',  label: '5 quiz answers right in a row',  target: 5,  xp: 60, m: function (d) { return d.bestQuizStreak; } },
    { id: 'chal1',    g: 'code',  label: 'Finish a coding challenge',      target: 1,  xp: 75, m: function (d) { return d.challenges; } },
    { id: 'mock1',    g: 'mock',  label: 'Answer a mock interview prompt', target: 1,  xp: 65, m: function (d) { return d.mocks; } },
    { id: 'dom3',     g: 'mix',   label: 'Study 3 different domains',      target: 3,  xp: 60, m: function (d) { return d.domains.length; } }
  ];

  function todayKey(t) {
    var d = new Date(t || Date.now());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayDiff(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / DAY);
  }

  function blankDay() {
    return { cards: 0, good: 0, hard: 0, quizQ: 0, quizRight: 0, bestQuizStreak: 0,
             challenges: 0, mocks: 0, domains: [], quests: {}, bonus: false, xp: 0 };
  }

  function blank() {
    return {
      v: 1, cards: {}, quiz: {}, challenges: {}, mocks: {}, badges: {},
      xp: 0, streak: { count: 0, last: null }, days: {}, firstSeen: todayKey(),
      totals: { cards: 0, quizQ: 0, quizRight: 0, hardCards: 0, challenges: 0, mocks: 0, noHintWins: 0 },
      gauntlet: { score: 0, streak: 0, runs: 0, cleared: 0 },
      settings: { sessionSize: 25, quizSize: 10 }
    };
  }

  var S = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      var p = JSON.parse(raw);
      var b = blank();
      for (var k in b) if (!(k in p)) p[k] = b[k];
      for (var gk in b.gauntlet) if (!(gk in p.gauntlet)) p.gauntlet[gk] = b.gauntlet[gk];
      for (var t in b.totals) if (!(t in p.totals)) p.totals[t] = 0;
      for (var s in b.settings) if (!(s in p.settings)) p.settings[s] = b.settings[s];
      return p;
    } catch (e) { return blank(); }
  }

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    }, 120);
  }
  function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function day() {
    var k = todayKey();
    if (!S.days[k]) { S.days[k] = blankDay(); rollQuests(k); }
    if (!S.days[k].quests || !Object.keys(S.days[k].quests).length) rollQuests(k);
    return S.days[k];
  }

  // Deterministic 3-quest pick for a given date.
  function rollQuests(k) {
    var seed = IPREP.hash(k + '|quests');
    var n = parseInt(seed.slice(0, 6), 36);
    // Pick 3, at most one per group, so you never get two overlapping card quests.
    var pool = QUEST_POOL.slice(), chosen = [], usedGroups = {};
    while (chosen.length < 3 && pool.length) {
      n = (n * 1103515245 + 12345) >>> 0;
      var pick = pool.splice(n % pool.length, 1)[0];
      if (usedGroups[pick.g]) continue;
      usedGroups[pick.g] = true;
      chosen.push(pick);
    }
    S.days[k].quests = {};
    chosen.forEach(function (q) { S.days[k].quests[q.id] = false; });
  }

  function questDefs() {
    var d = day();
    return Object.keys(d.quests).map(function (id) {
      var def = QUEST_POOL.filter(function (q) { return q.id === id; })[0];
      var prog = Math.min(def.target, def.m(d));
      return { id: id, label: def.label, target: def.target, xp: def.xp, progress: prog, done: prog >= def.target };
    });
  }

  /* ---------- events + XP ---------- */
  var listeners = [];
  function on(fn) { listeners.push(fn); }
  function emit(type, payload) { listeners.forEach(function (f) { f(type, payload); }); }

  function levelInfo() {
    var i = 0;
    while (i < THRESH.length - 1 && S.xp >= THRESH[i + 1]) i++;
    var floor = THRESH[i];
    var ceil = i < THRESH.length - 1 ? THRESH[i + 1] : floor + 1;
    return {
      index: i, level: i + 1, title: LEVELS[i],
      xp: S.xp, into: S.xp - floor, need: ceil - floor,
      pct: i < THRESH.length - 1 ? Math.min(100, ((S.xp - floor) / (ceil - floor)) * 100) : 100,
      max: i === THRESH.length - 1
    };
  }

  function addXP(n, why) {
    var before = levelInfo().level;
    S.xp += n;
    day().xp += n;
    var after = levelInfo();
    if (after.level > before) emit('levelup', after);
    emit('xp', { n: n, why: why });
    save();
  }

  function touchStreak() {
    var k = todayKey();
    if (S.streak.last === k) return;
    if (S.streak.last && dayDiff(S.streak.last, k) === 1) S.streak.count++;
    else S.streak.count = 1;
    S.streak.last = k;
    emit('streak', S.streak);
  }

  function touchDomain(dom) {
    var d = day();
    if (dom && d.domains.indexOf(dom) < 0) d.domains.push(dom);
  }

  function checkQuests() {
    var d = day(), fired = [];
    questDefs().forEach(function (q) {
      if (q.done && !d.quests[q.id]) { d.quests[q.id] = true; fired.push(q); }
    });
    fired.forEach(function (q) { addXP(q.xp, 'quest'); emit('quest', q); });
    var all = questDefs().every(function (q) { return q.done; });
    if (all && !d.bonus) { d.bonus = true; addXP(120, 'quest-bonus'); emit('questbonus', null); }
    if (fired.length || all) save();
  }

  function after(dom) {
    touchStreak();
    touchDomain(dom);
    checkQuests();
    checkBadges();
    save();
  }

  /* ---------- SM-2 flashcard scheduling ---------- */
  function cardState(key) {
    return S.cards[key] || null;
  }

  function grade(card, g) { // g: 0 again, 1 hard, 2 good, 3 easy
    var st = S.cards[card.key] || { e: 2.5, i: 0, due: 0, r: 0, l: 0 };
    var now = Date.now();

    if (g === 0) {
      st.e = Math.max(1.3, st.e - 0.2);
      st.r = 0; st.l++; st.i = 0;
      st.due = now + 6 * 60000;            // back in ~6 minutes
    } else if (g === 1) {
      st.e = Math.max(1.3, st.e - 0.15);
      st.i = st.r === 0 ? 1 : Math.max(1, st.i * 1.2);
      st.r++;
      st.due = now + st.i * DAY;
    } else if (g === 2) {
      st.i = st.r === 0 ? 1 : (st.r === 1 ? 3 : st.i * st.e);
      st.r++;
      st.due = now + st.i * DAY;
    } else {
      st.e = Math.min(2.8, st.e + 0.15);
      st.i = st.r === 0 ? 3 : st.i * st.e * 1.3;
      st.r++;
      st.due = now + st.i * DAY;
    }
    st.i = Math.min(st.i, 365);
    st.last = now;
    S.cards[card.key] = st;

    var d = day();
    d.cards++;
    S.totals.cards++;
    if (g >= 2) d.good++;
    if (card.d === 'hard') { d.hard++; S.totals.hardCards++; }
    addXP(g === 0 ? 2 : (g === 1 ? 3 : 5), 'card');
    after(card.domain);
    return st;
  }

  function dueCards(opts) {
    opts = opts || {};
    var now = Date.now();
    var pool = IPREP.allCards().filter(function (c) {
      if (opts.topic && c.topic !== opts.topic) return false;
      if (opts.domain && c.domain !== opts.domain) return false;
      if (opts.diff && opts.diff !== 'all' && c.d !== opts.diff) return false;
      return true;
    });
    var due = [], fresh = [];
    pool.forEach(function (c) {
      var st = S.cards[c.key];
      if (!st) fresh.push(c);
      else if (st.due <= now) due.push(c);
    });
    due.sort(function (a, b) { return S.cards[a.key].due - S.cards[b.key].due; });
    shuffle(fresh);
    return due.concat(fresh);
  }

  function dueCount() {
    var now = Date.now(), n = 0;
    IPREP.allCards().forEach(function (c) {
      var st = S.cards[c.key];
      if (!st || st.due <= now) n++;
    });
    return n;
  }

  function topicMastery(topicId) {
    var t = IPREP.topic(topicId);
    if (!t || !t.cards.length) return 0;
    var sum = 0;
    t.cards.forEach(function (c) {
      var st = S.cards[c.key];
      if (!st) return;
      sum += Math.min(1, st.i / 21);
    });
    return sum / t.cards.length;
  }

  function overallMastery() {
    var all = IPREP.allCards();
    if (!all.length) return 0;
    var sum = 0;
    all.forEach(function (c) {
      var st = S.cards[c.key];
      if (st) sum += Math.min(1, st.i / 21);
    });
    return sum / all.length;
  }

  function seenTopics() {
    return IPREP.topics.filter(function (t) {
      return t.cards.some(function (c) { return S.cards[c.key]; });
    }).length;
  }

  /* ---------- quiz ---------- */
  var quizStreak = 0;
  function answerQuiz(q, correct) {
    var rec = S.quiz[q.key] || { right: 0, wrong: 0 };
    var d = day();
    d.quizQ++; S.totals.quizQ++;
    if (correct) {
      rec.right++; d.quizRight++; S.totals.quizRight++;
      quizStreak++;
      if (quizStreak > d.bestQuizStreak) d.bestQuizStreak = quizStreak;
      addXP(6, 'quiz');
    } else {
      rec.wrong++; quizStreak = 0;
      addXP(1, 'quiz');
    }
    rec.last = Date.now();
    S.quiz[q.key] = rec;
    after(q.domain);
  }
  function finishQuiz(score, total, seconds) {
    S.lastQuiz = { score: score, total: total, seconds: seconds, at: Date.now() };
    if (total >= 8) {
      var pct = score / total;
      if (pct === 1) emit('flag', 'perfectQuiz');
      if (pct >= 0.8) emit('flag', 'goodQuiz');
      if (pct >= 0.8 && seconds / total < 6) emit('flag', 'fastQuiz');
    }
    S.quizRounds = (S.quizRounds || 0) + 1;
    addXP(Math.round(score * 2), 'quiz-round');
    after(null);
  }

  /* ---------- gauntlet ---------- */
  function recordGauntlet(score, bestCombo, cleared) {
    var g = S.gauntlet;
    g.runs++;
    if (cleared) g.cleared++;
    if (score > g.score) g.score = Math.round(score);
    if (bestCombo > g.streak) g.streak = bestCombo;
    addXP(Math.round(score / 20), 'gauntlet');
    if (cleared) emit('flag', 'gauntletCleared');
    if (bestCombo >= 10) emit('flag', 'gauntletCombo10');
    after(null);
  }

  /* ---------- challenges & mock ---------- */
  function completeChallenge(id, usedHints) {
    var was = S.challenges[id] && S.challenges[id].done;
    S.challenges[id] = { done: true, at: Date.now(), noHints: !usedHints || (S.challenges[id] && S.challenges[id].noHints) };
    if (!was) {
      day().challenges++; S.totals.challenges++;
      if (!usedHints) S.totals.noHintWins++;
      addXP(60, 'challenge');
    }
    var ch = IPREP.challenges.filter(function (c) { return c.id === id; })[0];
    after(ch && ch.domain);
  }
  function completeMock(id, hits, total) {
    var was = S.mocks[id] && S.mocks[id].done;
    S.mocks[id] = { done: true, at: Date.now(), hits: hits, total: total };
    if (!was) { day().mocks++; S.totals.mocks++; addXP(50, 'mock'); }
    var m = IPREP.mocks.filter(function (x) { return x.id === id; })[0];
    after(m && m.domain);
  }

  /* ---------- badges ---------- */
  var flags = {};
  on(function (type, p) { if (type === 'flag') { flags[p] = true; save(); checkBadges(); } });

  function checkBadges() {
    var ctx = {
      S: S, day: day(), flags: flags,
      totals: S.totals, streak: S.streak.count,
      mastery: overallMastery, topicMastery: topicMastery,
      seenTopics: seenTopics(), hour: new Date().getHours(),
      domainMastered: function (dom) {
        var ts = IPREP.topicsIn(dom);
        return ts.length > 0 && ts.every(function (t) { return topicMastery(t.id) >= 0.8; });
      },
      masteredTopics: function () {
        return IPREP.topics.filter(function (t) { return topicMastery(t.id) >= 0.9; }).length;
      },
      fullQuestDays: function () {
        return Object.keys(S.days).filter(function (k) { return S.days[k].bonus; }).length;
      }
    };
    IPREP.badges.forEach(function (b) {
      if (S.badges[b.id]) return;
      var ok = false;
      try { ok = b.check(ctx); } catch (e) { ok = false; }
      if (ok) {
        S.badges[b.id] = Date.now();
        addXP(b.xp || 40, 'badge');
        emit('badge', b);
        save();
      }
    });
  }

  function badgeCount() { return Object.keys(S.badges).length; }

  /* ---------- misc ---------- */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function reset() { S = blank(); saveNow(); }
  function exportJSON() { return JSON.stringify(S, null, 2); }
  function importJSON(txt) {
    var p = JSON.parse(txt);
    if (!p || typeof p !== 'object' || !('cards' in p)) throw new Error('Not an iOS Interview Prep backup.');
    S = p; saveNow(); return true;
  }

  function activeDays() { return Object.keys(S.days).filter(function (k) { return S.days[k].cards || S.days[k].quizQ || S.days[k].challenges || S.days[k].mocks; }).length; }

  function last14() { return lastN(14); }

  function lastN(n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var k = todayKey(Date.now() - i * DAY);
      var d = S.days[k];
      out.push({ k: k, n: d ? d.cards + d.quizQ : 0 });
    }
    // Mark the trailing unbroken run so the UI can show the streak itself.
    var inRun = true;
    for (var j = out.length - 1; j >= 0; j--) {
      if (inRun && out[j].n > 0) out[j].run = true;
      else if (out[j].n === 0 && j !== out.length - 1) inRun = false;
      else if (out[j].n === 0) { /* today may be empty without breaking it */ }
    }
    return out;
  }

  /// What each grade would schedule, in days, without committing anything.
  function previewIntervals(card) {
    var st = S.cards[card.key] || { e: 2.5, i: 0, due: 0, r: 0, l: 0 };
    function project(g) {
      var e = st.e, i = st.i, r = st.r;
      if (g === 0) return 0;
      if (g === 1) return Math.min(365, r === 0 ? 1 : Math.max(1, i * 1.2));
      if (g === 2) return Math.min(365, r === 0 ? 1 : (r === 1 ? 3 : i * e));
      return Math.min(365, r === 0 ? 3 : i * Math.min(2.8, e + 0.15) * 1.3);
    }
    return [0, 1, 2, 3].map(project);
  }

  window.STORE = {
    get s() { return S; },
    save: save, saveNow: saveNow, reset: reset,
    exportJSON: exportJSON, importJSON: importJSON,
    on: on, emit: emit,
    todayKey: todayKey, day: day, questDefs: questDefs,
    levelInfo: levelInfo, LEVELS: LEVELS, addXP: addXP,
    grade: grade, cardState: cardState, dueCards: dueCards, dueCount: dueCount,
    topicMastery: topicMastery, overallMastery: overallMastery, seenTopics: seenTopics,
    answerQuiz: answerQuiz, finishQuiz: finishQuiz,
    resetQuizStreak: function () { quizStreak = 0; },
    completeChallenge: completeChallenge, completeMock: completeMock,
    recordGauntlet: recordGauntlet,
    checkBadges: checkBadges, badgeCount: badgeCount,
    shuffle: shuffle, activeDays: activeDays, last14: last14, lastN: lastN,
    previewIntervals: previewIntervals
  };
})();
