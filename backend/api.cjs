const { randomUUID } = require('node:crypto');
const auth = require('./auth.cjs');
const v = require('./validation.cjs');
const repo = require('./repository.cjs');
const { transaction } = require('./database.cjs');
const { mutate, id } = require('./service.cjs');

function readJson(req) {
  v.requireValue((req.headers['content-type'] || '').split(';')[0] === 'application/json', 'API yêu cầu dữ liệu JSON.', 415);
  return new Promise((resolve, reject) => {
    let size = 0, parts = [], tooLarge = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 64 * 1024) { tooLarge = true; parts = []; }
      else if (!tooLarge) parts.push(chunk);
    });
    req.on('error', reject);
    req.on('end', () => {
      if (tooLarge) return reject(new v.HttpError(413, 'Dữ liệu vượt quá 64 KB.'));
      try {
        const data = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
        v.requireValue(data && typeof data === 'object' && !Array.isArray(data), 'Dữ liệu JSON phải là một đối tượng.');
        resolve(data);
      } catch (error) {
        reject(error instanceof v.HttpError ? error : new v.HttpError(400, 'JSON không hợp lệ.'));
      }
    });
  });
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function createApi(db, { secureCookies = false, origin = null } = {}) {
  const attempts = new Map();
  const dummyHash = auth.hashPasswordSync(randomUUID());
  function rateLimit(req) {
    const key = req.socket.remoteAddress, now = Date.now();
    for (const [ip, entry] of attempts) if (entry.expires < now) attempts.delete(ip);
    const entry = attempts.get(key) || { count: 0, expires: now + 15 * 60 * 1000 };
    entry.count++;
    attempts.set(key, entry);
    v.requireValue(entry.count <= 60, 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 15 phút.', 429);
  }

  return async function api(req, res, url) {
    const method = req.method, pathname = url.pathname;
    try {
      let body;
      if (!['GET', 'HEAD'].includes(method)) {
        // A cross-site HTML form cannot send this custom header; no CORS is enabled.
        v.requireValue(req.headers['x-restman-request'] === '1', 'Thiếu mã nhận diện yêu cầu.', 403);
        const expectedOrigin = origin || `${secureCookies ? 'https' : 'http'}://${req.headers.host}`;
        v.requireValue(!req.headers.origin || req.headers.origin === expectedOrigin, 'Nguồn yêu cầu không được phép.', 403);
        v.requireValue(req.headers['sec-fetch-site'] !== 'cross-site', 'Yêu cầu chéo website bị từ chối.', 403);
        body = await readJson(req);
      }
      if (pathname === '/api/health' && method === 'GET') {
        db.prepare('SELECT 1').get();
        return json(res, 200, { ok: true, database: 'sqlite' });
      }
      if (pathname === '/api/auth/login' && method === 'POST') {
        rateLimit(req);
        const username = v.username(body.username);
        v.requireValue(typeof body.password === 'string' && body.password.length <= 128, 'Thông tin đăng nhập không hợp lệ.');
        const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
        const valid = await auth.verifyPassword(body.password, user?.password_hash || dummyHash);
        v.requireValue(user && valid, 'Tên đăng nhập hoặc mật khẩu không đúng.', 401);
        return json(res, 200, { user: auth.createSession(db, req, res, user, secureCookies) });
      }
      if (pathname === '/api/auth/register' && method === 'POST') {
        rateLimit(req);
        const username = v.username(body.username), name = v.text(body.name, 'Họ tên', 80), phone = v.phone(body.phone);
        const hash = await auth.hashPassword(v.password(body.password));
        const user = transaction(db, () => {
          v.requireValue(!db.prepare('SELECT id FROM users WHERE username=?').get(username), 'Tên đăng nhập đã được sử dụng.', 409);
          v.requireValue(!db.prepare('SELECT id FROM customers WHERE phone=?').get(phone), 'Số điện thoại đã được đăng ký. Vui lòng dùng tài khoản hiện có hoặc liên hệ nhân viên.', 409);
          const customerId = id('customer'), userId = id('user');
          db.prepare('INSERT INTO customers(id,name,phone) VALUES(?,?,?)').run(customerId, name, phone);
          // Public registration cannot create a staff account.
          db.prepare("INSERT INTO users(id,username,name,password_hash,role,customer_id) VALUES(?,?,?,?,'customer',?)").run(userId, username, name, hash, customerId);
          return db.prepare('SELECT * FROM users WHERE id=?').get(userId);
        });
        return json(res, 201, { user: auth.createSession(db, req, res, user, secureCookies) });
      }
      const user = auth.getUser(db, req);
      if (pathname === '/api/auth/me' && method === 'GET') return json(res, 200, { user: user ? auth.publicUser(user) : null });
      if (pathname === '/api/auth/logout' && method === 'POST') {
        auth.logout(db, req, res, secureCookies);
        return json(res, 200, { ok: true });
      }
      auth.authorize(user);
      if (pathname === '/api/auth/password' && method === 'POST') {
        rateLimit(req);
        v.requireValue(typeof body.currentPassword === 'string' && body.currentPassword.length <= 128, 'Mật khẩu hiện tại không hợp lệ.');
        v.requireValue(await auth.verifyPassword(body.currentPassword, user.password_hash), 'Mật khẩu hiện tại không đúng.', 400);
        const hash = await auth.hashPassword(v.password(body.password));
        transaction(db, () => {
          const result = db.prepare('UPDATE users SET password_hash=? WHERE id=? AND password_hash=?').run(hash, user.id, user.password_hash);
          v.requireValue(result.changes > 0, 'Mật khẩu vừa thay đổi. Vui lòng đăng nhập lại.', 409);
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
        });
        auth.logout(db, req, res, secureCookies);
        return json(res, 200, { ok: true });
      }
      if (pathname === '/api/bootstrap' && method === 'GET') return json(res, 200, { user: auth.publicUser(user), data: repo.state(db, user) });
      if (pathname === '/api/foods' && method === 'GET') {
        const q = (url.searchParams.get('q') || '').toLocaleLowerCase('vi'), category = url.searchParams.get('category');
        return json(res, 200, repo.catalog(db, user.role === 'manager').foods.filter(f => f.name.toLocaleLowerCase('vi').includes(q) && (!category || category === f.category)));
      }
      let match;
      if ((match = pathname.match(/^\/api\/foods\/([^/]+)$/)) && method === 'GET') {
        const food = repo.catalog(db, user.role === 'manager').foods.find(f => f.id === match[1]);
        v.requireValue(food, 'Không tìm thấy món ăn.', 404);
        return json(res, 200, food);
      }
      if (pathname === '/api/reports' && method === 'GET') {
        auth.authorize(user, 'manager');
        return json(res, 200, repo.reports(db, url.searchParams.get('from'), url.searchParams.get('to')));
      }
      if ((match = pathname.match(/^\/api\/invoices\/([^/]+)$/)) && method === 'GET') {
        auth.authorize(user, 'manager', 'sales');
        const invoice = repo.invoiceById(db, match[1]);
        v.requireValue(invoice, 'Không tìm thấy hóa đơn.', 404);
        return json(res, 200, invoice);
      }
      if ((match = pathname.match(/^\/api\/customers\/([^/]+)\/invoices$/)) && method === 'GET') {
        auth.authorize(user, 'manager');
        const from = v.date(url.searchParams.get('from')), to = v.date(url.searchParams.get('to'));
        v.requireValue(from <= to, 'Khoảng thời gian không hợp lệ.');
        return json(res, 200, db.prepare('SELECT id FROM invoices WHERE customer_id=? AND date BETWEEN ? AND ? ORDER BY date DESC,id').all(match[1], from, to).map(i => repo.invoiceById(db, i.id)));
      }
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return json(res, method === 'POST' && ['/api/foods', '/api/combos', '/api/suppliers', '/api/ingredients', '/api/imports', '/api/customers', '/api/bookings'].includes(pathname) ? 201 : 200, mutate(db, user, method, pathname, body));
      throw new v.HttpError(404, 'Không tìm thấy API.');
    } catch (error) {
      let status = error.status || 500, message = error.message;
      if (!error.status) {
        if (error.code?.startsWith('SQLITE_CONSTRAINT') || (error.errcode & 255) === 19) { status = 409; message = 'Dữ liệu bị trùng hoặc đang được sử dụng. Vui lòng tải lại.'; }
        else if ((error.errcode & 255) === 5) { status = 503; message = 'Database đang bận. Vui lòng thử lại.'; }
        else { console.error('API error:', error); message = 'Máy chủ gặp lỗi. Vui lòng thử lại.'; }
      }
      json(res, status, { error: message });
    }
  };
}

module.exports = { createApi };
