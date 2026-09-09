/* core.js — global registry. Loaded first, no dependencies.
   Content files call IPREP.addTopic/addChallenge/addMock/addBadge. */
(function () {
  'use strict';

  var DOMAINS = {
    language:     { name: 'Language Fundamentals',      color: '#5b8cff', short: 'Language' },
    foundation:   { name: 'Foundation Data Structures', color: '#3ddc97', short: 'Foundation' },
    uikit:        { name: 'UI & View Hierarchy',        color: '#ffc247', short: 'UIKit' },
    concurrency:  { name: 'Concurrency & Threading',    color: '#ff6b6b', short: 'Concurrency' },
    architecture: { name: 'Architecture & Design',      color: '#b085ff', short: 'Architecture' },
    performance:  { name: 'Performance & Network',      color: '#ff8a4c', short: 'Performance' }
  };

  // Stable 32-bit hash so card identity survives content edits/reordering.
  function hash(str) {
    var h = 5381, i = str.length;
    while (i) h = (h * 33) ^ str.charCodeAt(--i);
    return (h >>> 0).toString(36);
  }

  var IPREP = {
    DOMAINS: DOMAINS,
    topics: [],
    challenges: [],
    mocks: [],
    badges: [],
    _topicById: {},

    hash: hash,

    addTopic: function (t) {
      t.cards = t.cards || [];
      t.quiz = t.quiz || [];
      t.cards.forEach(function (c) {
        c.topic = t.id;
        c.domain = t.domain;
        c.d = c.d || 'medium';
        c.key = 'c' + hash(c.q);
      });
      t.quiz.forEach(function (q) {
        q.topic = t.id;
        q.domain = t.domain;
        q.d = q.d || 'medium';
        q.key = 'q' + hash(q.q);
      });
      this.topics.push(t);
      this._topicById[t.id] = t;
    },

    addChallenge: function (c) {
      c.hints = c.hints || [];
      c.d = c.d || 'medium';
      this.challenges.push(c);
    },

    addMock: function (m) {
      m.rubric = m.rubric || [];
      m.followups = m.followups || [];
      m.d = m.d || 'medium';
      this.mocks.push(m);
    },

    addBadge: function (b) { this.badges.push(b); },

    topic: function (id) { return this._topicById[id]; },

    allCards: function () {
      return this.topics.reduce(function (a, t) { return a.concat(t.cards); }, []);
    },
    allQuiz: function () {
      return this.topics.reduce(function (a, t) { return a.concat(t.quiz); }, []);
    },
    topicsIn: function (domain) {
      return this.topics.filter(function (t) { return t.domain === domain; });
    },
    domainOf: function (id) { return DOMAINS[id] || { name: id, color: '#888', short: id }; }
  };

  window.IPREP = IPREP;
})();
