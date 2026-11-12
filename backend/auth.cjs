const { randomBytes, scrypt, scryptSync, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { HttpError } = require('./validation.cjs');
const derive = promisify(scrypt);
const COOKIE = 'restman_session';
const SESSION_AGE = 12 * 60 * 60 * 1000;

function hashPasswordSync(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${Buffer.from(await derive(password, salt, 64)).toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  const [, salt, expected] = encoded.split(':');
  const actual = Buffer.from(await derive(password, salt, 64));
  const wanted = Buffer.from(expected, 'hex');
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

const digest = token => createHash('sha256').update(token).digest('hex');
function sessionToken(req) {
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  return cookie ? cookie.slice(COOKIE.length + 1) : '';
}

function cookie(token, secure, remove = false) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${remove ? 0 : SESSION_AGE / 1000}${secure ? '; Secure' : ''}`;
}

function publicUser(user) {
  return { id: user.id, username: user.username, name: user.name, role: user.role, customer: user.customer_id };
}

function createSession(db, req, res, user, secure) {
  const previous = sessionToken(req);
  if (previous) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(previous));
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(digest(token), user.id, Date.now() + SESSION_AGE);
  res.setHeader('Set-Cookie', cookie(token, secure));
  return publicUser(user);
}

function getUser(db, req) {
  const token = sessionToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token), Date.now()) || null;
}

function logout(db, req, res, secure) {
  const token = sessionToken(req);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
  res.setHeader('Set-Cookie', cookie('', secure, true));
}

function authorize(user, ...roles) {
  if (!user) throw new HttpError(401, 'Vui lòng đăng nhập.');
  if (roles.length && !roles.includes(user.role)) throw new HttpError(403, 'Bạn không có quyền thực hiện thao tác này.');
}

module.exports = { hashPasswordSync, hashPassword, verifyPassword, publicUser, createSession, getUser, logout, authorize };
