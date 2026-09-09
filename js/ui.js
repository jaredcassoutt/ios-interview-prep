/* ui.js — DOM helpers, Swift syntax highlighting, toasts, confetti, modals. */
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var KEYWORDS = ('func|let|var|if|else|guard|return|for|in|while|repeat|switch|case|default|break|continue|' +
    'class|struct|enum|protocol|extension|init|deinit|self|super|nil|true|false|import|typealias|associatedtype|' +
    'where|is|as|try|catch|throw|throws|rethrows|defer|async|await|actor|inout|static|final|lazy|weak|unowned|' +
    'private|fileprivate|internal|public|open|override|mutating|nonmutating|convenience|required|subscript|' +
    'get|set|willSet|didSet|some|any|Self|nonisolated|isolated|indirect|operator|precedencegroup').split('|').join('|');

  var TYPES = ('Int|UInt|Double|Float|CGFloat|String|Bool|Character|Array|Dictionary|Set|Optional|Result|Data|Date|' +
    'URL|URLSession|URLRequest|Error|Void|Any|AnyObject|NSArray|NSDictionary|NSSet|NSMutableArray|NSMutableDictionary|' +
    'NSObject|NSString|NSNumber|NSCache|NSLock|UIView|UIViewController|UITableView|UICollectionView|UILabel|UIButton|' +
    'UIImage|UIImageView|UIColor|UIScrollView|CALayer|CAAnimation|DispatchQueue|DispatchGroup|DispatchSemaphore|' +
    'DispatchWorkItem|OperationQueue|Operation|Task|TaskGroup|Thread|RunLoop|Timer|Notification|NotificationCenter|' +
    'UserDefaults|FileManager|JSONDecoder|JSONEncoder|Codable|Decodable|Encodable|Hashable|Equatable|Comparable|' +
    'Sequence|Collection|IteratorProtocol|CustomStringConvertible|Sendable|IndexPath|CGRect|CGSize|CGPoint|' +
    'NSLayoutConstraint|NSManagedObject|NSPersistentContainer|Combine|Publisher|AnyCancellable|Never').split('|').join('|');

  var RE = new RegExp(
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' +          // 1 comment
    '|("(?:\\\\.|[^"\\\\])*")' +                        // 2 string
    '|(@[A-Za-z_][A-Za-z0-9_]*)' +                      // 3 attribute
    '|\\b(' + KEYWORDS + ')\\b' +                       // 4 keyword
    '|\\b(' + TYPES + ')\\b' +                          // 5 known type
    '|\\b([A-Z][A-Za-z0-9_]*)\\b' +                     // 6 other capitalised type
    '|\\b(\\d+\\.?\\d*)\\b',                            // 7 number
    'g');

  function swift(code) {
    var src = String(code), out = '', last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      var cls = m[1] ? 'tok-com' : m[2] ? 'tok-str' : m[3] ? 'tok-attr' :
                m[4] ? 'tok-key' : m[5] ? 'tok-type' : m[6] ? 'tok-type' : 'tok-num';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    out += esc(src.slice(last));
    return out;
  }

  // Lightweight inline markup for answer text: **bold**, `code`, - bullets, \n
  function rich(s) {
    var lines = String(s).split('\n');
    var html = '', inList = false;
    lines.forEach(function (ln) {
      var t = ln.trim();
      if (t.indexOf('- ') === 0) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + inline(t.slice(2)) + '</li>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (t) html += '<p style="margin:0 0 9px">' + inline(t) + '</p>';
      }
    });
    if (inList) html += '</ul>';
    return html;
  }
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  /* ---------- toasts ---------- */
  function toast(em, title, sub, gold) {
    var host = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast' + (gold ? ' gold' : '');
    el.innerHTML = '<div class="em">' + em + '</div><div><b>' + esc(title) + '</b>' +
      (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>';
    host.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .4s, transform .4s';
      el.style.opacity = '0'; el.style.transform = 'translateX(30px)';
      setTimeout(function () { el.remove(); }, 420);
    }, gold ? 4600 : 2900);
  }

  /* ---------- confetti ---------- */
  var cv = document.getElementById('confetti'), ctx = cv.getContext('2d'), parts = [], raf = null;
  function fit() { cv.width = innerWidth; cv.height = innerHeight; }
  fit(); addEventListener('resize', fit);

  function confetti(n, colors) {
    colors = colors || ['#6d8cff', '#2ed3a3', '#ffc233', '#ff5470', '#a97bff', '#29c7e8'];
    for (var i = 0; i < (n || 90); i++) {
      parts.push({
        x: cv.width / 2 + (Math.random() - 0.5) * cv.width * 0.45,
        y: cv.height * 0.32 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 13,
        vy: Math.random() * -13 - 4,
        w: 5 + Math.random() * 6, h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
        c: colors[(Math.random() * colors.length) | 0], life: 1
      });
    }
    if (!raf) tick();
  }
  function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < cv.height + 60; });
    parts.forEach(function (p) {
      p.vy += 0.42; p.vx *= 0.995;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > cv.height * 0.75) p.life -= 0.018;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (parts.length) raf = requestAnimationFrame(tick);
    else { ctx.clearRect(0, 0, cv.width, cv.height); raf = null; }
  }

  /* ---------- modal ---------- */
  // Inline display beats any stylesheet rule, so a stale cached CSS file
  // can never leave the backdrop stuck over the page.
  function modal(html) {
    var back = document.getElementById('modal');
    document.getElementById('modal-body').innerHTML = html;
    back.style.display = 'grid';
    back.removeAttribute('hidden');
    back.onclick = function (e) { if (e.target === back) closeModal(); };
  }
  function closeModal() {
    var back = document.getElementById('modal');
    back.style.display = 'none';
    back.setAttribute('hidden', '');
  }

  /* ---------- small helpers ---------- */
  function ring(pct, size, stroke, color) {
    size = size || 112; stroke = stroke || 9;
    var r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return '<svg width="' + size + '" height="' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#212832" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + (color || '#5b8cff') +
      '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c +
      '" stroke-dashoffset="' + (c - c * Math.min(1, pct)) + '" style="transition:stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)"/></svg>';
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function relDays(ms) {
    var d = Math.round((ms - Date.now()) / 86400000);
    if (d <= 0) return 'now';
    if (d === 1) return '1d';
    if (d < 30) return d + 'd';
    return Math.round(d / 30) + 'mo';
  }

  window.UI = {
    esc: esc, swift: swift, rich: rich, line: inline, toast: toast, confetti: confetti,
    modal: modal, closeModal: closeModal, ring: ring, fmtTime: fmtTime, relDays: relDays
  };
})();
