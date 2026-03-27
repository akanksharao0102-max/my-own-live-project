const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

const PORT = 4001;
const BASE_DIR = path.join(__dirname, 'wealthmatrix.in');

const mimeTypes = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.json': 'application/json',
};

function proxyToLive(reqUrl, res) {
  const options = {
    hostname: 'wealthmatrix.in',
    path: reqUrl,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Host': 'wealthmatrix.in' }
  };
  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'image/png',
      'Access-Control-Allow-Origin': '*'
    });
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => { res.writeHead(502); res.end(); });
  proxyReq.end();
}

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let reqPath = parsedUrl.pathname;

  // Handle double-encoded: images%252Faboutus1.png -> images/aboutus1.png
  let decoded = reqPath;
  try { decoded = decodeURIComponent(decodeURIComponent(reqPath)); } catch(e) {
    try { decoded = decodeURIComponent(reqPath); } catch(e2) {}
  }

  // Try multiple path variants
  const attempts = [
    path.join(BASE_DIR, decoded),
    path.join(BASE_DIR, reqPath),
    path.join(BASE_DIR, decodeURIComponent(reqPath)),
  ];

  let found = null;
  for (const attempt of attempts) {
    if (fs.existsSync(attempt) && fs.statSync(attempt).isFile()) {
      found = attempt; break;
    }
    // Try as directory
    const idx = path.join(attempt, 'index.html');
    if (fs.existsSync(idx)) { found = idx; break; }
  }

  if (found) {
    const ext = path.extname(found);
    fs.readFile(found, (err, data) => {
      if (err) { proxyToLive(req.url, res); return; }
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  } else {
    // Proxy to live site
    proxyToLive(req.url, res);
  }

}).listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server at http://localhost:' + PORT);
});
