const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApplication } = require('../server.cjs');
const { today } = require('../backend/validation.cjs');

const password = 'RestMan@12345';

function client(getBase) {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    async request(route, method = 'GET', body, extraHeaders = {}) {
      const response = await fetch(getBase() + route, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-RestMan-Request': '1', ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      return { status: response.status, data, headers: response.headers };
    },
    async login(username) {
      const result = await this.request('/api/auth/login', 'POST', { username, password });
      assert.equal(result.status, 200, JSON.stringify(result.data));
      return result;
    },
  };
}

test('RestMan HTTP API, access control, business transactions and persistence', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'restman-test-'));
  const dbPath = path.join(directory, 'test.sqlite');
  let app, base;
  async function start() {
    app = createApplication({ dbPath, initialPassword: password, demo: true });
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    base = 'http://127.0.0.1:' + app.server.address().port;
  }
  await start();
  t.after(async () => { await app.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  const manager = client(() => base), warehouse = client(() => base), sales = client(() => base), customer = client(() => base), other = client(() => base), anonymous = client(() => base);
  let foodId, comboId, bookingId, invoiceId, customerId;
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const food = { name: 'Món kiểm thử', category: 'Món chính', price: 150000, icon: '🍲', desc: 'Mô tả kiểm thử', ingredients: 'Rau củ', available: true };

  await t.test('static assets, database isolation and request validation', async () => {
    assert.equal((await anonymous.request('/')).status, 200);
    assert.equal((await anonymous.request('/api-client.js')).status, 200);
    assert.equal((await anonymous.request('/data/test.sqlite')).status, 404);
    assert.equal((await anonymous.request('/database/schema.sql')).status, 404);
    assert.equal((await anonymous.request('/api/health')).data.database, 'sqlite');
    assert.equal((await anonymous.request('/api/bootstrap')).status, 401);
    assert.equal((await anonymous.request('/api/auth/login', 'POST', {}, { 'X-RestMan-Request': '' })).status, 403);
    assert.equal((await anonymous.request('/api/auth/login', 'POST', {}, { Origin: 'http://other.example' })).status, 403);
    assert.equal((await anonymous.request('/api/auth/login', 'POST', {}, { 'Content-Type': 'text/plain' })).status, 415);
    const invalid = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-RestMan-Request': '1' }, body: '{' });
    assert.equal(invalid.status, 400);
    await invalid.text();
    assert.equal((await anonymous.request('/api/auth/login', 'POST', { padding: 'x'.repeat(70000) })).status, 413);
  });

  await t.test('hashed passwords and real cookie sessions for four roles', async () => {
    assert.equal((await anonymous.request('/api/auth/login', 'POST', { username: 'manager', password: 'wrong-password' })).status, 401);
    const response = await manager.login('manager');
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
    assert.ok(!JSON.stringify(response.data).includes('password_hash'));
    await warehouse.login('warehouse'); await sales.login('sales'); await customer.login('customer');
    const hash = app.db.prepare("SELECT password_hash FROM users WHERE username='manager'").get().password_hash;
    assert.match(hash, /^scrypt:/);
    assert.ok(!hash.includes(password));
    assert.equal((await customer.request('/api/reports?from=2026-11-01&to=2026-11-30')).status, 403);
    assert.equal((await customer.request('/api/foods', 'POST', food)).status, 403);
    assert.equal((await sales.request('/api/foods', 'POST', food)).status, 403);
    assert.equal((await manager.request('/api/imports', 'POST', {})).status, 403);
    const warehouseState = (await warehouse.request('/api/bootstrap')).data.data;
    assert.equal(warehouseState.customers.length, 0);
    assert.equal(warehouseState.invoices.length, 0);
    const customerState = (await customer.request('/api/bootstrap')).data.data;
    assert.equal(customerState.customers.length, 1);
    assert.equal(customerState.imports.length, 0);
    assert.equal(customerState.invoices.length, 0);
  });

  await t.test('registration cannot escalate role or take another member phone', async () => {
    const registered = await other.request('/api/auth/register', 'POST', { username: 'other_customer', name: 'Nguyễn Minh Anh', phone: '0909999999', password, role: 'manager' });
    assert.equal(registered.status, 201);
    assert.equal(registered.data.user.role, 'customer');
    customerId = registered.data.user.customer;
    assert.equal((await anonymous.request('/api/auth/register', 'POST', { username: 'duplicate', name: 'Duplicate', phone: '0909999999', password })).status, 409);
    assert.equal((await other.request('/api/customers', 'POST', { name: 'No', phone: '0908888888' })).status, 403);
  });

  await t.test('catalog CRUD, Vietnamese search and combo transaction rollback', async () => {
    assert.equal((await manager.request('/api/foods', 'POST', { ...food, price: -1 })).status, 400);
    const created = await manager.request('/api/foods', 'POST', food);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    foodId = created.data.id;
    assert.equal((await customer.request('/api/foods?q=' + encodeURIComponent('BÒ'))).data[0].id, 'f1');
    assert.equal((await customer.request('/api/foods/' + foodId)).data.price, food.price);
    const before = app.db.prepare("SELECT COUNT(*) AS n FROM products WHERE kind='combo'").get().n;
    assert.equal((await manager.request('/api/combos', 'POST', { name: 'Lỗi', price: 100000, foods: ['f1', 'missing'] })).status, 404);
    assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM products WHERE kind='combo'").get().n, before);
    const combo = await manager.request('/api/combos', 'POST', { name: 'Combo test', price: 250000, foods: ['f1', foodId] });
    assert.equal(combo.status, 201); comboId = combo.data.id;
    assert.equal((await manager.request('/api/foods/' + foodId, 'PUT', { ...food, available: false })).status, 200);
    assert.equal((await customer.request('/api/foods/' + foodId)).status, 404);
    assert.ok(!(await customer.request('/api/bootstrap')).data.data.combos.some(c => c.id === comboId));
    assert.equal((await manager.request('/api/foods/' + foodId, 'PUT', food)).status, 200);
  });

  await t.test('stock import validates references and updates stock atomically', async () => {
    const input = { supplier: 's1', ingredient: 'i1', qty: 3, price: 150000, date: today() };
    const before = app.db.prepare("SELECT stock FROM ingredients WHERE id='i1'").get().stock;
    assert.equal((await warehouse.request('/api/imports', 'POST', { ...input, qty: -1 })).status, 400);
    assert.equal((await warehouse.request('/api/imports', 'POST', { ...input, supplier: 'missing' })).status, 404);
    assert.equal(app.db.prepare("SELECT stock FROM ingredients WHERE id='i1'").get().stock, before);
    assert.equal((await warehouse.request('/api/imports', 'POST', input)).status, 201);
    assert.equal(app.db.prepare("SELECT stock FROM ingredients WHERE id='i1'").get().stock, before + 3);
    assert.equal((await warehouse.request('/api/suppliers', 'POST', { name: 'Nhà cung cấp thử', phone: '02812345678', address: 'Hà Nội' })).status, 201);
    assert.equal((await warehouse.request('/api/ingredients', 'POST', { name: 'Nguyên liệu thử', unit: 'kg', min: 3 })).status, 201);
  });

  await t.test('member creation rejects duplicate phone', async () => {
    assert.equal((await sales.request('/api/customers', 'POST', { name: 'Khách mới', phone: '0908888888' })).status, 201);
    assert.equal((await sales.request('/api/customers', 'POST', { name: 'Khách trùng', phone: '0908888888' })).status, 409);
  });

  await t.test('booking prices, ownership, slot conflicts and valid transitions', async () => {
    const input = { name: 'Nguyễn Minh Anh', phone: '0901234567', date: tomorrow, time: '18:30', table: 2, guests: 2, note: 'Test', owner: 'attacker', items: [{ id: 'f1', qty: 2, price: 1, name: 'Giá giả' }] };
    assert.equal((await customer.request('/api/bookings', 'POST', { ...input, table: 1, guests: 6 })).status, 400);
    const results = await Promise.all([customer.request('/api/bookings', 'POST', input), customer.request('/api/bookings', 'POST', input)]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    bookingId = results.find(r => r.status === 201).data.id;
    const row = (await customer.request('/api/bootstrap')).data.data.bookings.find(b => b.id === bookingId);
    assert.equal(row.items[0].price, 189000);
    assert.equal(row.items[0].name, 'Bò nướng sốt tiêu đen');
    assert.equal((await other.request('/api/bootstrap')).data.data.bookings.length, 0);
    assert.equal((await other.request(`/api/bookings/${bookingId}/status`, 'PATCH', { status: 'Đã hủy' })).status, 404);
    assert.equal((await customer.request(`/api/bookings/${bookingId}/status`, 'PATCH', { status: 'Đã xác nhận' })).status, 403);
    assert.equal((await sales.request(`/api/bookings/${bookingId}/check-in`, 'POST', {})).status, 409);
    assert.equal((await sales.request(`/api/bookings/${bookingId}/status`, 'PATCH', { status: 'Đã xác nhận' })).status, 200);
    const received = await sales.request('/api/tables/2/receive', 'POST', { customer: 'walkin' });
    assert.equal(received.status, 200);
    assert.equal((await sales.request(`/api/bookings/${bookingId}/check-in`, 'POST', {})).status, 409);
    const t2 = (await sales.request('/api/bootstrap')).data.data.tables.find(t => t.id === 2);
    await sales.request('/api/tables/2/release', 'POST', { orderId: t2.orderId, version: t2.version });
    assert.equal((await sales.request(`/api/bookings/${bookingId}/check-in`, 'POST', {})).status, 200);
    assert.equal((await sales.request(`/api/bookings/${bookingId}/check-in`, 'POST', {})).status, 409);
    assert.equal((await customer.request(`/api/bookings/${bookingId}/status`, 'PATCH', { status: 'Đã hủy' })).status, 409);
    const placed = (await sales.request('/api/bootstrap')).data.data.tables.find(t => t.id === 2);
    assert.equal(placed.items[0].price, 189000);
  });

  await t.test('table concurrency, server totals and idempotent payment', async () => {
    const received = await sales.request('/api/tables/1/receive', 'POST', { customer: customerId });
    assert.equal(received.status, 200);
    assert.equal((await sales.request('/api/tables/1/receive', 'POST', { customer: 'c1' })).status, 409);
    const orderId = received.data.id;
    const input = { orderId, version: 1, id: comboId, qty: 2, price: 1 };
    const results = await Promise.all([sales.request('/api/tables/1/items', 'POST', input), sales.request('/api/tables/1/items', 'POST', input)]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    await manager.request('/api/combos/' + comboId, 'PUT', { name: 'Combo đã đổi tên', price: 300000, foods: ['f1', foodId] });
    assert.equal((await sales.request('/api/tables/1/pay', 'POST', { orderId, version: 1, method: 'Tiền mặt' })).status, 409);
    const payload = { orderId, version: 2, method: 'Tiền mặt', total: 1 };
    const payments = await Promise.all([sales.request('/api/tables/1/pay', 'POST', payload), sales.request('/api/tables/1/pay', 'POST', payload)]);
    assert.deepEqual(payments.map(r => r.status), [200, 200]);
    assert.equal(payments[0].data.id, payments[1].data.id);
    assert.equal(payments[0].data.total, 500000);
    invoiceId = payments[0].data.id;
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM invoices WHERE order_id=?').get(orderId).n, 1);
    await sales.request('/api/tables/1/receive', 'POST', { customer: 'walkin' });
    assert.equal((await sales.request('/api/tables/1/pay', 'POST', payload)).data.id, invoiceId);
    assert.ok((await sales.request('/api/bootstrap')).data.data.tables.find(t => t.id === 1).customer);
    assert.equal((await manager.request('/api/combos/' + comboId, 'DELETE', {})).status, 200);
    assert.equal((await manager.request('/api/invoices/' + invoiceId)).data.items[0].name, 'Combo test');
  });

  await t.test('remove items, release empty table and cancel own reservation', async () => {
    const received = await sales.request('/api/tables/4/receive', 'POST', { customer: 'walkin' });
    const orderId = received.data.id;
    assert.equal((await sales.request('/api/tables/4/items', 'POST', { orderId, version: 1, id: 'f6', qty: 1 })).status, 200);
    assert.equal((await sales.request('/api/tables/4/release', 'POST', { orderId, version: 2 })).status, 409);
    assert.equal((await sales.request('/api/tables/4/remove', 'POST', { orderId, version: 2, id: 'f6' })).status, 200);
    assert.equal((await sales.request('/api/tables/4/release', 'POST', { orderId, version: 3 })).status, 200);
    const booking = await other.request('/api/bookings', 'POST', { name: 'Khách hủy', phone: '0909999999', date: tomorrow, time: '12:00', table: 4, guests: 2, items: [] });
    assert.equal(booking.status, 201);
    assert.equal((await other.request(`/api/bookings/${booking.data.id}/status`, 'PATCH', { status: 'Đã hủy' })).status, 200);
    assert.equal((await other.request('/api/bookings', 'POST', { name: 'Đặt lại', phone: '0909999999', date: tomorrow, time: '12:00', table: 4, guests: 2, items: [] })).status, 201);
  });

  await t.test('SQL reports and customer-to-invoice drilldown', async () => {
    const range = `from=2026-01-01&to=${today()}`;
    const response = await manager.request('/api/reports?' + range);
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.summary.total, app.db.prepare('SELECT SUM(total) AS n FROM invoices WHERE date BETWEEN ? AND ?').get('2026-01-01', today()).n);
    assert.ok(response.data.customers.some(c => c.id === customerId && c.total === 500000));
    assert.ok(response.data.suppliers.some(s => s.id === 's1' && s.value === 450000));
    const detail = await manager.request(`/api/customers/${customerId}/invoices?` + range);
    assert.equal(detail.data[0].id, invoiceId);
    assert.equal((await customer.request('/api/invoices/' + invoiceId)).status, 403);
    assert.equal((await manager.request('/api/reports?from=2026-02-30&to=2026-11-30')).status, 400);
    assert.equal((await manager.request('/api/reports?from=2026-12-01&to=2026-11-30')).status, 400);
    assert.equal((await manager.request('/api/reports?from=2000-01-01&to=2000-01-02')).data.summary.total, 0);
  });

  await t.test('database and sessions survive server restart', async () => {
    await app.close();
    await start();
    assert.equal((await manager.request('/api/auth/me')).data.user.role, 'manager');
    assert.equal((await customer.request('/api/foods/' + foodId)).data.name, food.name);
    assert.equal((await manager.request('/api/invoices/' + invoiceId)).data.total, 500000);
    assert.equal(app.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(app.db.prepare('PRAGMA foreign_key_check').all().length, 0);
  });

  await t.test('password change revokes sessions, logout invalidates cookie', async () => {
    assert.equal((await other.request('/api/auth/password', 'POST', { currentPassword: password, password: 'RestManNew@123' })).status, 200);
    assert.equal((await other.request('/api/bootstrap')).status, 401);
    assert.equal((await other.request('/api/auth/login', 'POST', { username: 'other_customer', password })).status, 401);
    assert.equal((await other.request('/api/auth/login', 'POST', { username: 'other_customer', password: 'RestManNew@123' })).status, 200);
    const cookie = other.cookie;
    await other.request('/api/auth/logout', 'POST', {});
    assert.equal((await other.request('/api/bootstrap', 'GET', undefined, { Cookie: cookie })).status, 401);
  });

  await t.test('authentication rate limiting', async () => {
    let limited = false;
    for (let i = 0; i < 65; i++) {
      const response = await anonymous.request('/api/auth/login', 'POST', { username: 'bad', password: null });
      if (response.status === 429) { limited = true; break; }
    }
    assert.ok(limited);
  });
});
