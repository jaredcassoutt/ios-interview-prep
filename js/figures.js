/* figures.js — inline SVG diagrams for card answers.
   No images, no libraries. Everything inherits the palette via CSS vars,
   and animation is CSS so prefers-reduced-motion can switch it off. */
(function () {
  'use strict';

  var reg = {};
  function def(id, caption, build) { reg[id] = { caption: caption, build: build }; }

  function render(id) {
    var f = reg[id];
    if (!f) return '';
    return '<figure class="fig">' +
           '<div class="fig-body">' + f.build() + '</div>' +
           '<figcaption>' + f.caption + '</figcaption>' +
           '</figure>';
  }
  function has(id) { return !!reg[id]; }
  function ids() { return Object.keys(reg); }

  /* tiny helpers ------------------------------------------------------ */
  function lbl(x, y, t, cls) {
    return '<text x="' + x + '" y="' + y + '" class="f-lbl ' + (cls || '') + '">' + t + '</text>';
  }
  function mono(x, y, t, cls) {
    return '<text x="' + x + '" y="' + y + '" class="f-mono ' + (cls || '') + '">' + t + '</text>';
  }
  function box(x, y, w, h, cls, r) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
           '" rx="' + (r == null ? 4 : r) + '" class="' + cls + '"/>';
  }
  function svg(vb, inner, extra) {
    return '<svg viewBox="' + vb + '" class="f-svg" ' + (extra || '') +
           ' xmlns="http://www.w3.org/2000/svg">' + defs() + inner + '</svg>';
  }
  function defs() {
    return '<defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">' +
           '<path d="M0 0 L8 4 L0 8 z" class="f-arrowhead"/></marker></defs>';
  }
  function arrow(x1, y1, x2, y2, cls) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
           '" class="f-arrow ' + (cls || '') + '" marker-end="url(#ah)"/>';
  }

  /* ================= UIKit ================= */

  def('frame-vs-bounds',
      'Rotate the view and its <b>frame</b> changes, because a frame is the axis-aligned box that contains it in the superview. Its <b>bounds</b> never move: they are the view\'s own coordinate space.',
      function () {
        return svg('0 0 340 170',
          // superview
          box(14, 20, 150, 130, 'f-surface') +
          lbl(20, 15, 'superview space') +
          // animated frame box
          '<rect x="59" y="65" width="60" height="40" class="f-frame anim-frame"/>' +
          // rotating view
          '<g class="anim-spin" transform-origin="89 85">' +
            box(59, 65, 60, 40, 'f-fill-uikit') +
          '</g>' +
          mono(20, 165, 'frame = bounding box') +

          // divider
          '<line x1="176" y1="20" x2="176" y2="150" class="f-rule"/>' +

          // bounds panel
          box(190, 20, 136, 130, 'f-surface') +
          lbl(196, 15, 'its own space') +
          box(228, 65, 60, 40, 'f-fill-uikit') +
          // origin marker
          '<circle cx="228" cy="65" r="3" class="f-dot-uikit"/>' +
          mono(234, 62, '(0,0)') +
          '<line x1="228" y1="105" x2="288" y2="105" class="f-dim"/>' +
          mono(196, 165, 'bounds = constant')
        );
      });

  def('layout-pass',
      'One frame, five stages. Anything slow in your part of it, layout or drawing, misses the 16.7ms budget and drops a frame.',
      function () {
        var stages = [
          ['Event',   'touch',  'f-fill-dim'],
          ['Layout',  'frames', 'f-fill-uikit'],
          ['Display', 'pixels', 'f-fill-uikit'],
          ['Commit',  'IPC',    'f-fill-dim'],
          ['GPU',     'vsync',  'f-fill-dim']
        ];
        var out = '', x = 10;
        stages.forEach(function (s, i) {
          out += '<g class="anim-stage" style="animation-delay:' + (i * 0.55) + 's">';
          out += box(x, 34, 58, 34, s[2] + ' f-stage');
          out += lbl(x + 29, 55, s[0], 'f-center');
          out += '</g>';
          out += mono(x + 29, 84, s[1], 'f-center f-tiny');
          if (i < stages.length - 1) out += arrow(x + 60, 51, x + 62, 51);
          x += 65;
        });
        out += '<line x1="10" y1="100" x2="330" y2="100" class="f-rule"/>';
        out += '<line x1="140" y1="30" x2="140" y2="100" class="f-rule f-dashed"/>';
        out += mono(10, 116, 'your code') + mono(150, 116, 'the system');
        out += mono(330, 116, '16.7ms budget', 'f-end');
        return svg('0 0 340 124', out);
      });

  def('cell-reuse',
      'A table keeps a small pool. A row scrolling off the top is handed straight back for the row arriving at the bottom, so ten thousand rows cost about a dozen cell objects.',
      function () {
        var out = '', i;
        out += box(14, 20, 112, 132, 'f-surface') + lbl(20, 15, 'on screen');
        // resting rows, so the list reads as a list at any moment
        for (i = 0; i < 4; i++) out += box(22, 28 + i * 32, 96, 24, 'f-fill-dim');
        // the rows that travel
        for (i = 0; i < 4; i++) {
          out += '<g class="anim-scroll" style="animation-delay:' + (i * -1) + 's">' +
                 box(22, 28 + i * 32, 96, 24, 'f-fill-uikit') + '</g>';
        }
        out += arrow(132, 46, 168, 46);
        out += mono(134, 38, 'off', 'f-tiny');
        out += arrow(168, 126, 132, 126);
        out += mono(134, 118, 'reused', 'f-tiny');

        out += box(176, 20, 150, 66, 'f-surface f-dashed') + lbl(182, 15, 'reuse pool');
        out += box(184, 32, 64, 22, 'f-fill-dim') + box(254, 32, 64, 22, 'f-fill-dim');
        out += mono(192, 47, 'cell') + mono(262, 47, 'cell');
        out += mono(184, 74, 'about a dozen, total', 'f-tiny');
        out += mono(176, 112, 'prepareForReuse()', 'f-tiny');
        out += mono(176, 128, 'resets stale state', 'f-tiny');
        return svg('0 0 340 160', out);
      });

  def('compositional-vs-flow',
      '<b>Flow</b> lays out one uniform run of cells and wraps. <b>Compositional</b> nests items in groups in sections, so a carousel, a grid and a list live on one screen without a custom layout subclass.',
      function () {
        var out = '';
        // flow
        out += lbl(14, 14, 'UICollectionViewFlowLayout');
        var fx = 14, fy = 24;
        for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
          out += box(fx + c * 33, fy + r * 33, 28, 28, 'f-fill-dim');
        }
        out += mono(14, 138, 'one uniform run, wrapped', 'f-tiny');

        out += '<line x1="166" y1="8" x2="166" y2="140" class="f-rule"/>';

        // compositional
        out += lbl(180, 14, 'Compositional');
        out += box(180, 24, 146, 34, 'f-fill-uikit');
        out += mono(186, 44, 'section: carousel', 'f-tiny f-on-fill');
        out += box(180, 62, 71, 32, 'f-fill-uikit-soft') + box(255, 62, 71, 32, 'f-fill-uikit-soft');
        out += mono(186, 82, 'group', 'f-tiny');
        out += mono(261, 82, 'group', 'f-tiny');
        out += box(180, 98, 146, 14, 'f-fill-dim') + box(180, 116, 146, 14, 'f-fill-dim');
        out += mono(180, 138, 'sections > groups > items', 'f-tiny');
        return svg('0 0 340 144', out);
      });

  def('hit-test',
      'Hit testing walks <b>down</b> the tree, topmost sibling first, and each view is skipped entirely if <code>point(inside:)</code> is false. The responder chain then travels back <b>up</b> from whatever was found.',
      function () {
        var out = '';
        out += box(14, 16, 300, 120, 'f-surface') + mono(20, 32, 'window');
        out += box(34, 40, 260, 88, 'f-outline') + mono(40, 56, 'UIViewController.view');
        out += box(54, 64, 110, 56, 'f-outline') + mono(60, 80, 'container');
        out += box(186, 64, 88, 56, 'f-fill-uikit') + mono(192, 80, 'button', 'f-on-fill');
        // descending arrows
        out += arrow(120, 24, 120, 38, 'f-down');
        out += arrow(230, 52, 230, 62, 'f-down');
        out += '<circle cx="230" cy="96" r="5" class="f-touch anim-pulse"/>';
        out += mono(14, 152, 'down: hitTest finds the target');
        out += mono(200, 152, 'up: the chain handles it');
        out += arrow(300, 96, 300, 40, 'f-up');
        return svg('0 0 340 158', out);
      });

  /* ================= Concurrency ================= */

  def('serial-vs-concurrent',
      'A <b>serial</b> queue runs one block at a time in order. A <b>concurrent</b> queue may run many at once, and the finish order is not the submission order.',
      function () {
        var out = '';
        out += lbl(14, 14, 'serial');
        out += box(14, 22, 300, 30, 'f-lane');
        for (var i = 0; i < 4; i++) {
          out += '<g class="anim-serial" style="animation-delay:' + (i * 1.1) + 's">' +
                 box(18, 27, 46, 20, 'f-fill-conc') + '</g>';
        }
        out += mono(14, 66, 'one at a time, FIFO', 'f-tiny');

        out += lbl(14, 92, 'concurrent');
        for (var l = 0; l < 3; l++) {
          out += box(14, 100 + l * 26, 300, 20, 'f-lane');
          out += '<g class="anim-conc" style="animation-delay:' + (l * 0.25) + 's">' +
                 box(18, 103 + l * 26, 46, 14, 'f-fill-conc') + '</g>';
        }
        out += mono(14, 190, 'many at once, finish order undefined', 'f-tiny');
        return svg('0 0 340 196', out);
      });

  def('sync-vs-async',
      '<code>sync</code> and <code>async</code> describe whether <b>the caller waits</b>. They are a separate question from whether the queue is serial or concurrent.',
      function () {
        var out = '';
        out += lbl(14, 14, 'async');
        out += box(14, 22, 140, 18, 'f-fill-dim') + mono(20, 35, 'caller keeps going');
        out += arrow(90, 44, 90, 58, 'f-down');
        out += box(60, 60, 120, 18, 'f-fill-conc') + mono(66, 73, 'work runs later', 'f-on-fill');

        out += '<line x1="196" y1="8" x2="196" y2="92" class="f-rule"/>';

        out += lbl(210, 14, 'sync');
        out += box(210, 22, 116, 18, 'f-fill-dim f-hatched') + mono(216, 35, 'caller blocked');
        out += arrow(268, 44, 268, 58, 'f-down');
        out += box(240, 60, 86, 18, 'f-fill-conc') + mono(246, 73, 'work runs', 'f-on-fill');
        out += '<line x1="14" y1="96" x2="326" y2="96" class="f-rule"/>';
        out += mono(14, 114, 'sync onto a queue you are already on = deadlock', 'f-warn f-tiny');
        return svg('0 0 340 122', out);
      });

  def('barrier',
      'A barrier waits for every block already on the concurrent queue to finish, runs alone, then lets concurrency resume. That is how you get many readers and one exclusive writer.',
      function () {
        var out = '';
        for (var l = 0; l < 3; l++) out += box(14, 26 + l * 28, 300, 20, 'f-lane');
        // readers before
        for (var i = 0; i < 3; i++) out += box(20, 29 + i * 28, 74, 14, 'f-fill-found');
        out += mono(20, 18, 'concurrent reads');
        // barrier
        out += box(112, 26, 62, 76, 'f-fill-conc');
        out += mono(118, 68, 'barrier', 'f-on-fill');
        // readers after
        for (var j = 0; j < 3; j++) out += box(192, 29 + j * 28, 74, 14, 'f-fill-found');
        out += mono(192, 122, 'reads resume', 'f-tiny');
        out += mono(20, 122, 'reads finish first', 'f-tiny');
        out += mono(14, 142, 'ignored on the global queues', 'f-warn f-tiny');
        return svg('0 0 340 148', out);
      });

  /* ================= Language ================= */

  def('value-vs-reference',
      'Copying a <b>value</b> gives you an independent box; nobody can observe your edits. Copying a <b>reference</b> copies only the pointer, so both names see the same object mutate.',
      function () {
        var out = '';
        out += lbl(14, 14, 'struct');
        out += mono(14, 36, 'var a') + mono(14, 78, 'var b = a');
        out += box(70, 22, 52, 22, 'f-fill-lang') + mono(78, 37, '1', 'f-on-fill');
        out += box(70, 64, 52, 22, 'f-fill-lang') + mono(78, 79, '2', 'f-on-fill');
        out += mono(14, 104, 'independent', 'f-tiny f-good');

        out += '<line x1="156" y1="8" x2="156" y2="112" class="f-rule"/>';

        out += lbl(172, 14, 'class');
        out += mono(172, 36, 'let a') + mono(172, 90, 'let b = a');
        out += arrow(210, 30, 258, 48);
        out += arrow(214, 86, 258, 60);
        out += box(262, 40, 60, 24, 'f-fill-lang') + mono(270, 56, 'obj', 'f-on-fill');
        out += mono(172, 104, 'one shared object', 'f-tiny f-warn');
        return svg('0 0 340 112', out);
      });

  def('cow',
      'Copying is O(1): both structs point at one buffer. The deep copy is deferred until someone <b>writes</b> to a buffer that is not uniquely referenced.',
      function () {
        var out = '';
        out += mono(14, 26, 'var a') + mono(14, 62, 'var b = a');
        out += arrow(56, 22, 118, 40) + arrow(60, 58, 118, 46);
        out += box(122, 30, 78, 26, 'f-fill-lang') + mono(130, 47, 'buffer', 'f-on-fill');
        out += mono(122, 74, 'shared, refcount 2', 'f-tiny');

        out += arrow(214, 44, 240, 44);
        out += mono(206, 34, 'b[0] = x', 'f-tiny f-warn');

        out += box(250, 12, 78, 26, 'f-fill-lang') + mono(258, 29, 'a buffer', 'f-on-fill');
        out += '<g class="anim-fork">' + box(250, 52, 78, 26, 'f-fill-lang') +
               mono(258, 69, 'b copy', 'f-on-fill') + '</g>';
        out += mono(250, 94, 'forked on write', 'f-tiny f-good');
        return svg('0 0 340 100', out);
      });

  def('retain-cycle',
      'Two strong references pointing at each other means neither count ever reaches zero. ARC only counts references, it never walks the graph, so the pair simply leaks until one edge becomes <code>weak</code>.',
      function () {
        var out = '';
        out += box(24, 34, 92, 40, 'f-fill-lang') + mono(32, 58, 'Controller', 'f-on-fill');
        out += box(180, 34, 92, 40, 'f-fill-lang') + mono(188, 58, 'ViewModel', 'f-on-fill');
        out += '<path d="M116 46 L180 46" class="f-arrow" marker-end="url(#ah)"/>';
        out += '<path d="M180 62 L116 62" class="f-arrow anim-cycle" marker-end="url(#ah)"/>';
        out += mono(126, 40, 'strong', 'f-tiny');
        out += mono(126, 76, 'strong', 'f-tiny f-warn');
        out += mono(24, 104, 'refcount never hits zero', 'f-warn f-tiny');
        out += mono(180, 104, 'make one edge weak', 'f-good f-tiny');
        return svg('0 0 300 112', out);
      });

  window.FIG = { render: render, has: has, ids: ids, def: def,
                 _h: { lbl: lbl, mono: mono, box: box, svg: svg, arrow: arrow } };
})();
