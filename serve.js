/* Minimal static server for local use. node serve.js [port] */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname;
const PORT = parseInt(process.argv[2], 10) || 8777;
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
                '.js':'text/javascript; charset=utf-8', '.json':'application/json',
                '.md':'text/markdown; charset=utf-8', '.svg':'image/svg+xml' };

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const full = path.join(ROOT, path.normalize(rel));
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(PORT, () => console.log('iOS Interview Prep -> http://localhost:' + PORT));
