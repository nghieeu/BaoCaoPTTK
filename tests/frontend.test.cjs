const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: pause } = require('node:timers/promises');
const { createApplication } = require('../server.cjs');
const { createView } = require('./helpers/view.cjs');

test('Existing UI actions use HTTP API and SQLite, including restored sessions', async t => {
  const app = createApplication({ dbPath: ':memory:', initialPassword: 'RestMan@12345', demo: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = 'http://127.0.0.1:' + app.server.address().port;
  let cookie = '';
  async function transport(route, options) {
    const response = await fetch(base + route, { ...options, headers: { ...options.headers, ...(cookie ? { Cookie: cookie } : {}) } });
    const value = response.headers.get('set-cookie');
    if (value) cookie = value.split(';')[0];
    return response;
  }
  const { run, node, ready, set } = createView(transport);
  await ready;
  assert.match(node('#app').innerHTML, /Tên đăng nhập/);
  async function login(role) {
    set('username', role); set('password', 'RestMan@12345');
    await run('login()');
    assert.equal(run('session.role'), role, node('#toast').textContent);
    for (const nav of run('navs[session.role]')) {
      await run(`go('${nav[0]}')`);
      assert.match(node('#app').innerHTML, /RestMan/);
    }
  }

  await login('manager');
  await run("go('reports')");
  set('from', '2026-11-01'); set('to', '2026-11-30');
  await run('applyDates()');
  assert.equal(run('reportRows().length'), 6);
  await run("openCustomer('c1')");
  assert.match(node('#app').innerHTML, /Lịch sử gọi món/);
  await run("invoice('HD1001')");
  assert.match(node('#modal').innerHTML, /HD1001/);
  await run("go('menu')");
  set('fname', 'Món tạo từ giao diện'); set('fcat', 'Món chính'); set('fprice', '100000'); set('fdesc', 'Mô tả'); set('fingredients', 'Bò'); set('ficon', '🍲'); set('favailable', 'true');
  await run("saveFood('')");
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM products WHERE name=?').get('Món tạo từ giao diện').n, 1);
  await run('logout()');

  await login('warehouse');
  set('isupplier', 's1'); set('iingredient', 'i1'); set('iqty', '3'); set('iprice', '150000'); set('idate', run('today()'));
  await run('saveImport()');
  assert.equal(app.db.prepare("SELECT stock FROM ingredients WHERE id='i1'").get().stock, 27);
  await run('logout()');

  await login('sales');
  set('tcustomer', 'c1'); await run('receiveGuest(1)');
  set('tfood', 'f1'); set('tqty', '2'); await run('addTableItem(1)');
  await run('paymentForm(1)'); set('pmethod', 'Tiền mặt'); await run('pay(1)');
  assert.match(node('#modal').innerHTML, /378\.000/);
  assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='open'").get().n, 0);
  await run('logout()');

  set('rname', 'Khách trực tuyến'); set('rphone', '0907777777'); set('rusername', 'online_guest'); set('rpassword', 'GuestPass@123');
  await run('register()');
  assert.equal(run('session.role'), 'customer');
  await run("go('menu');");
  run("keyword='bò';updateFoods()");
  await pause(300);
  assert.match(node('#foods').innerHTML, /Bò nướng/);
  assert.ok(!node('#foods').innerHTML.includes('Mì Ý'));
  await run("foodDetail('f1')");
  assert.match(node('#modal').innerHTML, /Thăn bò/);
  run("addCart('f1');closeModal()"); await run("go('reserve')");
  set('bname', 'Khách trực tuyến'); set('bphone', '0907777777'); set('bdate', new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }));
  set('btime', '18:30'); set('btable', '3'); set('bguests', '2'); set('bnote', 'Kiểm thử giao diện');
  await run('submitBooking()');
  assert.equal(run('db.bookings.length'), 1, node('#toast').textContent);
  assert.match(node('#app').innerHTML, /Chờ xác nhận/);

  const restored = createView(transport);
  await restored.ready;
  assert.equal(restored.run('session.username'), 'online_guest');
  await restored.run("go('mybookings')");
  assert.match(restored.node('#app').innerHTML, /Khách trực tuyến/);

  await run('logout()');
  await login('sales');
  const bookingId = run('db.bookings[0].id');
  await run(`bookingStatus('${bookingId}','Đã xác nhận')`);
  await run(`checkIn('${bookingId}')`);
  assert.equal(run('db.tables.find(t=>t.id===3).items[0].price'), 189000);
  assert.equal(app.db.prepare('SELECT status FROM bookings WHERE id=?').get(bookingId).status, 'Đã nhận khách');
});
