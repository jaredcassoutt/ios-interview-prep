/* figures2.js — Foundation, SwiftUI, architecture and performance diagrams. */
(function () {
  'use strict';
  var def = FIG.def, H = FIG._h;
  var lbl = H.lbl, mono = H.mono, box = H.box, svg = H.svg, arrow = H.arrow;

  /* ================= Foundation ================= */

  def('array-vs-set',
      'An array has to compare each element in turn. A set hashes the value straight to a bucket, so membership is one jump rather than n comparisons.',
      function () {
        var out = '', i;
        out += lbl(14, 14, 'Array.contains');
        for (i = 0; i < 7; i++) {
          out += box(14 + i * 30, 22, 26, 24, 'f-fill-dim');
          out += '<g class="anim-scan" style="animation-delay:' + (i * 0.28) + 's">' +
                 box(14 + i * 30, 22, 26, 24, 'f-fill-found') + '</g>';
        }
        out += mono(14, 62, 'O(n) linear scan', 'f-tiny');

        out += '<line x1="14" y1="80" x2="326" y2="80" class="f-rule"/>';

        out += lbl(14, 100, 'Set.contains');
        out += box(14, 108, 60, 24, 'f-fill-found') + mono(22, 124, 'value', 'f-on-fill');
        out += arrow(78, 120, 108, 120);
        out += mono(80, 110, 'hash', 'f-tiny');
        for (i = 0; i < 6; i++) out += box(114 + i * 34, 108, 30, 24, 'f-outline');
        out += '<g class="anim-pulse">' + box(182, 108, 30, 24, 'f-fill-found') + '</g>';
        out += mono(14, 150, 'O(1) average, one bucket', 'f-tiny');
        return svg('0 0 340 156', out);
      });

  def('dict-buckets',
      'The hash picks the bucket. Equality resolves collisions inside it. Mutate a hashed property after insertion and the entry sits in the old bucket while lookups probe the new one, so it is unreachable but still counted.',
      function () {
        var out = '';
        out += mono(14, 24, '"swift"') + arrow(70, 20, 104, 20) + mono(72, 12, 'hash', 'f-tiny');
        out += mono(14, 58, '"ios"') + arrow(70, 54, 104, 54);
        out += mono(14, 92, '"arc"') + arrow(70, 88, 104, 54);
        // fills first, then labels, so the text is never covered
        for (var i = 0; i < 4; i++) out += box(110, 6 + i * 34, 96, 26, 'f-outline');
        out += box(110, 6, 96, 26, 'f-fill-found');
        out += box(110, 40, 96, 26, 'f-fill-found');
        for (var j = 0; j < 4; j++) {
          out += mono(116, 24 + j * 34, 'bucket ' + j, 'f-tiny' + (j < 2 ? ' f-on-fill' : ''));
        }
        out += mono(216, 58, 'collision: two keys,', 'f-tiny');
        out += mono(216, 72, 'same bucket, == decides', 'f-tiny');
        out += mono(216, 24, 'one entry', 'f-tiny');
        return svg('0 0 340 150', out);
      });

  /* ================= SwiftUI ================= */

  def('swiftui-proposal',
      'Layout is a negotiation, not a command. The parent <b>proposes</b> a size, the child <b>chooses</b> its own, and the parent then <b>places</b> it. A child is free to refuse, which is why content can overflow a frame.',
      function () {
        var out = '';
        var steps = [
          ['1', 'Parent proposes', '320 x 200 available?'],
          ['2', 'Child chooses', 'I will take 140 x 44'],
          ['3', 'Parent places', 'positioned at x, y']
        ];
        steps.forEach(function (s, i) {
          var y = 12 + i * 44;
          out += '<g class="anim-stage" style="animation-delay:' + (i * 0.7) + 's">';
          out += box(14, y, 24, 24, 'f-fill-swiftui') + mono(22, y + 17, s[0], 'f-on-fill');
          out += lbl(48, y + 16, s[1]);
          out += mono(170, y + 16, s[2], 'f-tiny');
          out += '</g>';
          if (i < 2) out += arrow(26, y + 26, 26, y + 42, 'f-down');
        });
        out += mono(14, 158, 'the child decides its own size', 'f-good f-tiny');
        return svg('0 0 340 164', out);
      });

  def('swiftui-identity',
      'Each branch of an <code>if/else</code> is a different structural identity, so flipping the condition destroys the old view and its <code>@State</code>. One view whose <b>data</b> changes keeps its state.',
      function () {
        var out = '';
        out += lbl(14, 14, 'if / else');
        out += box(14, 22, 62, 36, 'f-fill-swiftui') + mono(20, 44, 'A', 'f-on-fill');
        out += arrow(82, 40, 106, 40);
        out += box(112, 22, 62, 36, 'f-outline f-dashed') + mono(118, 44, 'B', '');
        out += mono(14, 76, 'new identity, state lost', 'f-warn f-tiny');

        out += '<line x1="196" y1="8" x2="196" y2="90" class="f-rule"/>';

        out += lbl(210, 14, 'one view, new data');
        out += box(210, 22, 62, 36, 'f-fill-swiftui') + mono(216, 44, 'A', 'f-on-fill');
        out += arrow(278, 40, 296, 40);
        out += '<g class="anim-pulse">' + box(300, 22, 26, 36, 'f-fill-swiftui') + '</g>';
        out += mono(210, 76, 'same identity, state kept', 'f-good f-tiny');
        return svg('0 0 340 96', out);
      });

  def('observable-invalidation',
      '<code>ObservableObject</code> fires one signal for the whole object, so every observing view redraws. <code>@Observable</code> records which properties each view actually read, and invalidates only those.',
      function () {
        var out = '', i;
        out += lbl(14, 14, 'ObservableObject');
        out += box(14, 22, 130, 26, 'f-fill-dim') + mono(20, 39, 'objectWillChange');
        for (i = 0; i < 3; i++) {
          out += arrow(79, 52, 34 + i * 46, 70, 'f-down');
          out += '<g class="anim-flash">' + box(20 + i * 46, 74, 38, 26, 'f-fill-swiftui') + '</g>';
        }
        out += mono(14, 118, 'all three redraw', 'f-warn f-tiny');

        out += '<line x1="176" y1="8" x2="176" y2="126" class="f-rule"/>';

        out += lbl(192, 14, '@Observable');
        out += box(192, 22, 130, 26, 'f-fill-dim') + mono(198, 39, 'name changed');
        out += arrow(257, 52, 211, 70, 'f-down');
        out += '<g class="anim-flash">' + box(192, 74, 38, 26, 'f-fill-swiftui') + '</g>';
        out += box(238, 74, 38, 26, 'f-outline') + box(284, 74, 38, 26, 'f-outline');
        out += mono(192, 118, 'only the reader redraws', 'f-good f-tiny');
        return svg('0 0 340 126', out);
      });

  def('list-vs-lazyvstack',
      'Both create rows lazily. Only <code>List</code> <b>recycles</b> them, because it is a collection view underneath. A <code>LazyVStack</code> discards a row that scrolls off and rebuilds it if you scroll back.',
      function () {
        var out = '', i;
        out += lbl(14, 14, 'List');
        for (i = 0; i < 4; i++) out += box(14, 22 + i * 26, 130, 20, 'f-fill-swiftui');
        out += arrow(150, 46, 150, 22, 'f-up');
        out += arrow(150, 78, 150, 102, 'f-down');
        out += mono(14, 138, 'reused, bounded count', 'f-good f-tiny');

        out += '<line x1="180" y1="8" x2="180" y2="146" class="f-rule"/>';

        out += lbl(196, 14, 'LazyVStack');
        for (i = 0; i < 4; i++) out += box(196, 22 + i * 26, 130, 20, 'f-fill-swiftui');
        out += box(196, 126, 130, 6, 'f-fill-dim');
        out += mono(196, 152, 'discarded, then rebuilt', 'f-warn f-tiny');
        return svg('0 0 340 158', out);
      });

  def('modifier-order',
      'A modifier <b>wraps</b> the view it is applied to and returns a new view, so order is composition order. It is a tree built inside out, not properties set on an object.',
      function () {
        var out = '';
        out += mono(14, 18, '.padding().background()');
        out += box(14, 26, 130, 60, 'f-fill-swiftui');
        out += box(44, 42, 70, 28, 'f-surface') + mono(56, 60, 'Text');
        out += mono(14, 104, 'colour includes the padding', 'f-tiny');

        out += '<line x1="180" y1="8" x2="180" y2="112" class="f-rule"/>';

        out += mono(196, 18, '.background().padding()');
        out += box(196, 26, 130, 60, 'f-outline f-dashed');
        out += box(226, 42, 70, 28, 'f-fill-swiftui') + mono(238, 60, 'Text', 'f-on-fill');
        out += mono(196, 104, 'colour hugs the content', 'f-tiny');
        return svg('0 0 340 112', out);
      });

  /* ================= Architecture ================= */

  def('mvc-vs-mvvm',
      'In UIKit MVC the controller owns the view, so everything with nowhere else to go lands there. MVVM adds a plain object that the view observes and that knows nothing about the view, which is what makes it testable.',
      function () {
        var out = '';
        out += lbl(14, 14, 'UIKit MVC');
        out += box(14, 22, 130, 46, 'f-fill-arch');
        out += mono(20, 42, 'ViewController', 'f-on-fill');
        out += mono(20, 58, '+ view + logic', 'f-on-fill f-tiny');
        out += arrow(79, 72, 79, 88, 'f-down');
        out += box(40, 90, 78, 24, 'f-outline') + mono(50, 106, 'Model');
        out += mono(14, 134, 'no seam to test', 'f-warn f-tiny');

        out += '<line x1="176" y1="8" x2="176" y2="142" class="f-rule"/>';

        out += lbl(192, 14, 'MVVM');
        out += box(192, 22, 130, 24, 'f-outline') + mono(200, 38, 'View');
        out += arrow(257, 48, 257, 60, 'f-down');
        out += mono(262, 58, 'observes', 'f-tiny');
        out += box(192, 62, 130, 24, 'f-fill-arch') + mono(200, 78, 'ViewModel', 'f-on-fill');
        out += arrow(257, 88, 257, 100, 'f-down');
        out += box(192, 102, 130, 24, 'f-outline') + mono(200, 118, 'Model');
        out += mono(192, 142, 'view model knows no view', 'f-good f-tiny');
        return svg('0 0 340 148', out);
      });

  def('pagination',
      'Offsets are positions, so an insert at the top shifts everything and page two repeats a row you already saw. A cursor names <b>where you stopped</b>, so new content above it changes nothing.',
      function () {
        var out = '', i;
        out += lbl(14, 14, 'offset = 3');
        for (i = 0; i < 5; i++) out += box(14, 22 + i * 22, 130, 16, i < 3 ? 'f-fill-dim' : 'f-fill-arch');
        out += '<g class="anim-insert">' + box(14, 22, 130, 16, 'f-fill-good') + '</g>';
        out += mono(150, 34, 'new item', 'f-tiny');
        out += mono(14, 148, 'page 2 repeats a row', 'f-warn f-tiny');

        out += '<line x1="196" y1="8" x2="196" y2="156" class="f-rule"/>';

        out += lbl(210, 14, 'cursor = id:42');
        for (i = 0; i < 5; i++) out += box(210, 22 + i * 22, 116, 16, i < 3 ? 'f-fill-dim' : 'f-fill-arch');
        out += '<g class="anim-insert">' + box(210, 22, 116, 16, 'f-fill-good') + '</g>';
        out += '<line x1="204" y1="86" x2="332" y2="86" class="f-cursor"/>';
        out += mono(210, 148, 'no repeats, no gaps', 'f-good f-tiny');
        return svg('0 0 340 156', out);
      });

  /* ================= Performance ================= */

  def('image-memory',
      'A decoded bitmap costs width x height x 4 bytes no matter how small the file was. Downsampling during decode is the difference between a grid that scrolls and one that gets killed by jetsam.',
      function () {
        var out = '';
        out += lbl(14, 14, '4000 x 3000 photo');
        out += box(14, 24, 26, 18, 'f-fill-dim') + mono(48, 38, '2 MB on disk (JPEG)');
        out += box(14, 50, 300, 30, 'f-fill-perf') + mono(22, 70, '48 MB decoded in memory', 'f-on-fill');
        out += mono(14, 100, 'downsample at decode', 'f-tiny');
        out += arrow(150, 96, 178, 96);
        out += box(184, 88, 14, 12, 'f-fill-good') + mono(206, 99, '0.5 MB at 120pt @3x');
        out += mono(14, 128, 'a hundredfold, and the reason the grid survives', 'f-good f-tiny');
        return svg('0 0 340 136', out);
      });

  def('offscreen-render',
      'Normally a layer composites straight to the screen. A shadow with no <code>shadowPath</code>, or a corner radius with a mask, forces the GPU into a separate buffer first, once per frame.',
      function () {
        var out = '';
        out += lbl(14, 14, 'direct');
        out += box(14, 24, 60, 40, 'f-fill-perf');
        out += arrow(80, 44, 116, 44);
        out += box(122, 24, 60, 40, 'f-surface') + mono(128, 48, 'screen', 'f-tiny');
        out += mono(14, 84, 'one pass', 'f-good f-tiny');

        out += '<line x1="196" y1="8" x2="196" y2="130" class="f-rule"/>';

        out += lbl(210, 14, 'offscreen');
        out += box(210, 24, 46, 40, 'f-fill-perf');
        out += arrow(262, 44, 278, 44);
        out += '<g class="anim-flash">' + box(284, 24, 42, 40, 'f-outline f-dashed') + '</g>';
        out += mono(284, 78, 'buffer', 'f-tiny');
        out += arrow(305, 84, 305, 98, 'f-down');
        out += box(284, 100, 42, 22, 'f-surface') + mono(290, 115, 'screen', 'f-tiny');
        out += mono(210, 140, 'extra pass per frame', 'f-warn f-tiny');
        return svg('0 0 340 146', out);
      });

  def('weak-strong',
      'A strong reference keeps the object alive. <code>weak</code> does not, and is zeroed to nil when the object dies. <code>unowned</code> also does not, but is not zeroed, so using it afterwards traps.',
      function () {
        var out = '';
        var rows = [
          ['strong',  'keeps it alive',        'f-fill-lang',      'f-good', false],
          ['weak',    'zeroed to nil on death','f-fill-lang-soft', '',       true],
          ['unowned', 'dangles, then traps',   'f-outline',        'f-warn', true]
        ];
        rows.forEach(function (r, i) {
          var y = 16 + i * 40, mid = y + 13;
          out += box(14, y, 76, 26, r[2]);
          out += mono(22, y + 18, r[0], r[2] === 'f-outline' ? '' : 'f-on-fill');
          out += arrow(96, mid, 234, mid, r[4] ? 'f-dashed-arrow' : '');
          out += mono(102, mid - 6, r[1], 'f-tiny ' + r[3]);
        });
        out += box(244, 38, 62, 60, 'f-fill-dim') + mono(252, 72, 'object');
        out += '<line x1="14" y1="140" x2="326" y2="140" class="f-rule"/>';
        out += mono(14, 156, 'only strong participates in the retain count', 'f-tiny');
        return svg('0 0 340 164', out);
      });

})();
