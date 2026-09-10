/* figure-map.js — attach diagrams to cards by matching question text.
   Kept out of the content files so the mapping is readable in one place.
   Runs after all data files, before any view renders. */
(function () {
  'use strict';

  var MAP = [
    ['frame-vs-bounds',        'difference between `frame` and `bounds`'],
    ['layout-pass',            'full frame lifecycle from a touch to pixels'],
    ['cell-reuse',             'Why does cell reuse exist'],
    ['compositional-vs-flow',  'compositional layout and why did it replace flow'],
    ['hit-test',               'Describe hit testing, precisely'],
    ['serial-vs-concurrent',   'Serial versus concurrent queue, and sync versus async'],
    ['sync-vs-async',          'why does `DispatchQueue.main.sync` from the main thread hang'],
    ['barrier',                'What is a barrier block, and on which queues'],
    ['value-vs-reference',     'core semantic difference between a struct and a class'],
    ['cow',                    'Explain copy-on-write and why Swift collections'],
    ['retain-cycle',           'What is a retain cycle, and why does ARC not catch it'],
    ['weak-strong',            'Difference between `weak` and `unowned`'],
    ['array-vs-set',           'reach for a Set instead of an Array'],
    ['dict-buckets',           'Complexity of Dictionary operations'],
    ['swiftui-proposal',       'SwiftUI layout algorithm in three steps'],
    ['swiftui-identity',       'Why does `@State` reset unexpectedly'],
    ['observable-invalidation','Why is `@Observable` more efficient'],
    ['list-vs-lazyvstack',     'use `List` versus `LazyVStack`'],
    ['modifier-order',         'Why does modifier order matter'],
    ['mvc-vs-mvvm',            'Why does Apple MVC turn into Massive View Controller'],
    ['pagination',             'Compare pagination strategies for a mobile feed'],
    ['image-memory',           'How much memory does an image actually use'],
    ['offscreen-render',       'What is offscreen rendering and which properties']
  ];

  var attached = {};
  IPREP.allCards().forEach(function (card) {
    var haystack = card.q + ' \u0000 ' + (card.alias || '');
    for (var i = 0; i < MAP.length; i++) {
      if (haystack.indexOf(MAP[i][1]) >= 0) {
        card.fig = MAP[i][0];
        attached[MAP[i][0]] = (attached[MAP[i][0]] || 0) + 1;
        return;
      }
    }
  });

  // Surface a stale mapping rather than silently dropping a diagram.
  MAP.forEach(function (m) {
    if (!attached[m[0]]) console.warn('[figures] no card matched:', m[0], '/', m[1]);
    else if (attached[m[0]] > 1) console.warn('[figures] matched', attached[m[0]], 'cards:', m[0]);
    if (!FIG.has(m[0])) console.warn('[figures] no such figure:', m[0]);
  });
})();
