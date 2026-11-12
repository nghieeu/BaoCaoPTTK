const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createView } = require('./helpers/view.cjs');

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

test('API transport handles empty, HTML and truncated responses without JSON parse exceptions', async t => {
  let reply = () => json({ user: null });
  const view = createView((...args) => reply(...args));
  await view.ready;

  for (const scenario of [
    { name: 'empty 405 from Live Server', status: 405, response: () => new Response(null, { status: 405 }), message: /phản hồi rỗng/ },
    { name: 'empty successful response is not accepted as valid API data', status: 200, response: () => new Response(''), message: /phản hồi rỗng/ },
    { name: 'HTML 404 from static server', status: 404, response: () => new Response('<html>Cannot GET /api/auth/me</html>', { status: 404, headers: { 'Content-Type': 'text/html' } }), message: /không trả về dữ liệu JSON/ },
    { name: 'HTML fallback with status 200', status: 200, response: () => new Response('<html>Home</html>', { headers: { 'Content-Type': 'text/html' } }), message: /không trả về dữ liệu JSON/ },
    { name: 'truncated JSON', status: 200, response: () => new Response('{"user":', { headers: { 'Content-Type': 'application/json' } }), message: /JSON.*không hợp lệ/ },
    { name: 'plain proxy error', status: 502, response: () => new Response('Bad Gateway', { status: 502 }), message: /không trả về dữ liệu JSON/ },
    { name: 'invalid JSON null', status: 200, response: () => json(null), message: /không đúng định dạng/ },
    { name: 'body read failure', status: 200, response: () => ({ ok: true, status: 200, text: async () => { throw new TypeError('terminated'); } }), message: /Không đọc được/ },
  ]) {
    await t.test(scenario.name, async () => {
      reply = scenario.response;
      await assert.rejects(view.run("api('/auth/login','POST',{})"), error => {
        assert.equal(error.code, 'INVALID_API_RESPONSE');
        assert.equal(error.status, scenario.status);
        assert.match(error.message, scenario.message);
        assert.match(error.message, /localhost:3000/);
        assert.ok(!error.message.includes('Unexpected end of JSON'));
        return true;
      });
    });
  }

  await t.test('legitimate API results and empty 204 responses', async () => {
    reply = () => json({ user: null });
    assert.equal((await view.run("api('/auth/me')")).user, null);
    reply = () => json([{ id: 'f1' }]);
    assert.equal((await view.run("api('/foods')"))[0].id, 'f1');
    reply = () => new Response(null, { status: 204 });
    assert.equal(await view.run("api('/optional')"), null);
  });

  await t.test('API error messages and expired sessions are preserved', async () => {
    reply = () => json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, 401);
    await assert.rejects(view.run("api('/auth/login','POST',{})"), error => error.status === 401 && error.message === 'Tên đăng nhập hoặc mật khẩu không đúng.');
    view.run("session={id:'u1',name:'Khách',role:'customer'};cart=[{id:'f1'}]");
    reply = () => new Response('', { status: 401 });
    await assert.rejects(view.run("api('/bootstrap')"), error => error.status === 401 && error.code === 'INVALID_API_RESPONSE');
    assert.equal(view.run('session'), null);
    assert.equal(view.run('cart.length'), 0);
  });
});

test('startup on Live Server shows persistent setup help; retry recovers', async () => {
  let running = false;
  const view = createView(() => running ? json({ user: null }) : new Response('<html>Not found</html>', { status: 404, headers: { 'Content-Type': 'text/html' } }));
  await view.ready;
  assert.match(view.node('#app').innerHTML, /Cần kết nối backend/);
  assert.match(view.node('#app').innerHTML, /node server.cjs/);
  assert.ok(!view.node('#app').innerHTML.includes('id="password"'));
  running = true;
  await view.run('initialize()');
  assert.match(view.node('#app').innerHTML, /id="password"/);
});

test('login and registration report an empty Live Server response clearly', async () => {
  const view = createView((route, options) => options.method === 'GET' ? json({ user: null }) : new Response(null, { status: 405 }));
  await view.ready;
  view.set('username', 'manager'); view.set('password', 'RestMan@12345');
  await view.run('login()');
  assert.match(view.node('#toast').textContent, /HTTP 405/);
  assert.match(view.node('#toast').textContent, /Live Server/);
  assert.equal(view.run('session'), null);
  view.set('rname', 'Khách'); view.set('rphone', '0907777777'); view.set('rusername', 'guest'); view.set('rpassword', 'GuestPass@123');
  await view.run('register()');
  assert.match(view.node('#toast').textContent, /HTTP 405/);
  assert.equal(view.run('session'), null);
});

test('file opening and unavailable network show backend setup instructions', async () => {
  const local = createView(() => { throw new Error('must not fetch from file'); }, { protocol: 'file:' });
  await local.ready;
  assert.match(local.node('#app').innerHTML, /MO-RESTMAN.cmd/);
  const disconnected = createView(() => { throw new TypeError('Failed to fetch'); });
  await disconnected.ready;
  assert.match(disconnected.node('#app').innerHTML, /Cần kết nối backend/);
  assert.match(disconnected.node('#app').innerHTML, /Không kết nối được máy chủ/);
});
