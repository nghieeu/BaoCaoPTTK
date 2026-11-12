const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { openDatabase } = require('./backend/database.cjs');
const { createApi } = require('./backend/api.cjs');

function createApplication(options = {}) {
  const db = openDatabase(options);
  const api = createApi(db, options);
  const assets = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/index.html', ['index.html', 'text/html; charset=utf-8']],
    ['/app.js', ['app.js', 'application/javascript; charset=utf-8']],
    ['/api-client.js', ['api-client.js', 'application/javascript; charset=utf-8']],
    ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ]);
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    let url;
    try { url = new URL(req.url, 'http://localhost'); }
    catch { res.writeHead(400); return res.end('Bad request'); }
    if (url.pathname.startsWith('/api/')) return api(req, res, url);
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end('Method not allowed'); }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    const asset = assets.get(url.pathname);
    if (!asset) { res.writeHead(404); return res.end('Not found'); }
    fs.readFile(path.join(__dirname, 'dist', asset[0]), (error, data) => {
      if (error) { res.writeHead(500); return res.end('Unable to read asset'); }
      res.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  async function close() {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeIdleConnections();
    });
    db.close();
  }
  return { server, db, close };
}

if (require.main === module) {
  try {
    const app = createApplication({ dbPath: process.env.RESTMAN_DB || path.join(__dirname, 'data', 'restman.sqlite'), secureCookies: process.env.RESTMAN_SECURE_COOKIE === '1', origin: process.env.RESTMAN_ORIGIN || null });
    const port = Number(process.env.PORT || 3000), host = process.env.HOST || '127.0.0.1';
    app.server.once('error', error => { console.error('Không thể khởi động RestMan:', error.message); app.db.close(); process.exitCode = 1; });
    app.server.listen(port, host, () => {
      console.log(`RestMan: http://${host}:${port}`);
      console.log(`SQLite: ${process.env.RESTMAN_DB || path.join(__dirname, 'data', 'restman.sqlite')}`);
      if (process.argv.includes('--open') && process.platform === 'win32') {
        const browser = require('node:child_process').spawn('rundll32.exe', ['url.dll,FileProtocolHandler', `http://127.0.0.1:${port}`], { detached: true, stdio: 'ignore', windowsHide: true });
        browser.on('error', () => console.log('Hãy mở địa chỉ RestMan bằng trình duyệt.'));
        browser.unref();
      }
    });
    let stopping = false;
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
      if (stopping) return;
      stopping = true;
      await app.close();
    });
  } catch (error) { console.error('Không thể khởi tạo RestMan:', error.message); process.exitCode = 1; }
}

module.exports = { createApplication };
