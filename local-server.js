const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const BACKEND_PORT = process.env.BACKEND_PORT || 5000;

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // Proxy /api/ requests to backend AI server
  if (reqPath.startsWith('/api/')) {
    const proxyReq = http.request({
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error to backend:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Backend AI server is not reachable on port 5000. Please make sure backend is running (cd backend && npm start).',
        reply: 'Dr. Talha Clinic 24/7 khula hai. Appointment ya kisi bhi sawal ke liye direct call karein: +92 307 7953767.'
      }));
    });

    req.pipe(proxyReq);
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(PUBLIC_DIR, reqPath);
  filePath = decodeURIComponent(filePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
