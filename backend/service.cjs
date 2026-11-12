const { randomUUID } = require('node:crypto');
const v = require('./validation.cjs');
const { authorize } = require('./auth.cjs');
const { transaction } = require('./database.cjs');
const { invoiceById } = require('./repository.cjs');
const id = prefix => prefix + '-' + randomUUID();
const find = (db, table, key) => {
  // table is supplied only by application code, never by request data.
  const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(key);
  v.requireValue(row, 'Không tìm thấy dữ liệu.', 404);
  return row;
};

function product(db, key) {
  const row = find(db, 'products', key);
  v.requireValue(!row.deleted && row.available, 'Món đã ngừng phục vụ hoặc tạm hết.', 409);
  if (row.kind === 'combo') {
    const unavailable = db.prepare('SELECT p.id FROM combo_items c JOIN products p ON p.id=c.food_id WHERE c.combo_id=? AND (p.available=0 OR p.deleted=1)').get(key);
    v.requireValue(!unavailable, 'Combo có món tạm hết. Vui lòng chọn món khác.', 409);
  }
  return row;
}

function pricedItems(db, input) {
  v.requireValue(Array.isArray(input) && input.length <= 50, 'Danh sách món không hợp lệ.');
  const items = new Map();
  for (const value of input) {
    v.requireValue(value && typeof value === 'object', 'Món ăn không hợp lệ.');
    const key = v.text(value.id, 'Mã món', 100);
    const qty = v.number(value.qty, 'Số lượng', 1, 99, true);
    const p = product(db, key);
    const previous = items.get(key);
    const quantity = (previous?.qty || 0) + qty;
    v.requireValue(quantity <= 99, 'Mỗi món chỉ được gọi tối đa 99 phần.');
    items.set(key, { id: p.id, name: p.name, price: p.price, qty: quantity });
  }
  return [...items.values()];
}

function openOrder(db, tableId, body) {
  const order = db.prepare("SELECT * FROM orders WHERE table_id=? AND status='open'").get(tableId);
  v.requireValue(order && order.id === body.orderId, 'Bàn đã thay đổi. Vui lòng tải lại dữ liệu.', 409);
  v.requireValue(order.version === body.version, 'Nhân viên khác vừa cập nhật bàn. Vui lòng tải lại.', 409);
  return order;
}

function createOrder(db, user, tableId, customer, items = []) {
  find(db, 'dining_tables', tableId);
  v.requireValue(!db.prepare("SELECT id FROM orders WHERE table_id=? AND status='open'").get(tableId), 'Bàn này đang có khách.', 409);
  if (customer) find(db, 'customers', customer);
  const key = id('order');
  db.prepare("INSERT INTO orders(id,table_id,customer_id,status,created_by) VALUES(?,?,?,'open',?)").run(key, tableId, customer, user.id);
  for (const item of items) db.prepare('INSERT INTO order_items(order_id,product_id,name,price,quantity) VALUES(?,?,?,?,?)').run(key, item.id, item.name, item.price, item.qty);
  return { id: key };
}

function saveFood(db, user, body, key = null) {
  authorize(user, 'manager');
  const data = {
    name: v.text(body.name, 'Tên món', 100),
    category: v.text(body.category, 'Danh mục', 30),
    price: v.number(body.price, 'Giá bán', 1000, 1e9, true),
    icon: v.text(body.icon, 'Biểu tượng', 16),
    description: v.text(body.desc, 'Mô tả', 2000),
    ingredients: v.text(body.ingredients, 'Nguyên liệu', 1000),
  };
  v.requireValue(['Khai vị', 'Món chính', 'Đồ uống', 'Tráng miệng'].includes(data.category), 'Danh mục không hợp lệ.');
  v.requireValue(typeof body.available === 'boolean', 'Trạng thái phục vụ không hợp lệ.');
  if (key) v.requireValue(find(db, 'products', key).kind === 'food', 'Món ăn không tồn tại.', 404);
  const productId = key || id('food');
  if (key) db.prepare('UPDATE products SET name=?,category=?,price=?,icon=?,description=?,ingredients=?,available=? WHERE id=?').run(data.name, data.category, data.price, data.icon, data.description, data.ingredients, +body.available, key);
  else db.prepare("INSERT INTO products(id,kind,name,category,price,icon,description,ingredients,available) VALUES(?,'food',?,?,?,?,?,?,?)").run(productId, data.name, data.category, data.price, data.icon, data.description, data.ingredients, +body.available);
  return { id: productId };
}

function saveCombo(db, user, body, key = null) {
  authorize(user, 'manager');
  const name = v.text(body.name, 'Tên combo', 100), price = v.number(body.price, 'Giá combo', 1000, 1e9, true);
  v.requireValue(Array.isArray(body.foods) && body.foods.length >= 2 && body.foods.length <= 30, 'Combo cần từ 2 đến 30 món.');
  const foods = [...new Set(body.foods.map(x => v.text(x, 'Mã món', 100)))];
  v.requireValue(foods.length >= 2, 'Combo cần ít nhất hai món khác nhau.');
  for (const food of foods) v.requireValue(find(db, 'products', food).kind === 'food', 'Combo chỉ được chứa món ăn.');
  const comboId = key || id('combo');
  if (key) {
    const existing = find(db, 'products', key);
    v.requireValue(existing.kind === 'combo' && !existing.deleted, 'Không tìm thấy combo.', 404);
    db.prepare('UPDATE products SET name=?,price=? WHERE id=?').run(name, price, key);
    db.prepare('DELETE FROM combo_items WHERE combo_id=?').run(key);
  } else db.prepare("INSERT INTO products(id,kind,name,price,icon) VALUES(?,'combo',?,?,'🍱')").run(comboId, name, price);
  for (const food of foods) db.prepare('INSERT INTO combo_items(combo_id,food_id) VALUES(?,?)').run(comboId, food);
  return { id: comboId };
}

function saveSupplier(db, user, body, key = null) {
  authorize(user, 'warehouse');
  const name = v.text(body.name, 'Tên nhà cung cấp'), phone = v.text(body.phone, 'Điện thoại', 15), address = v.text(body.address, 'Địa chỉ', 300);
  v.requireValue(/^[0-9+ .-]{9,15}$/.test(phone), 'Số điện thoại nhà cung cấp không hợp lệ.');
  if (key) find(db, 'suppliers', key);
  const supplierId = key || id('supplier');
  if (key) db.prepare('UPDATE suppliers SET name=?,phone=?,address=? WHERE id=?').run(name, phone, address, key);
  else db.prepare('INSERT INTO suppliers(id,name,phone,address) VALUES(?,?,?,?)').run(supplierId, name, phone, address);
  return { id: supplierId };
}

function addIngredient(db, user, body) {
  authorize(user, 'warehouse');
  const key = id('ingredient');
  db.prepare('INSERT INTO ingredients(id,name,unit,min_stock) VALUES(?,?,?,?)').run(key, v.text(body.name, 'Tên nguyên liệu'), v.text(body.unit, 'Đơn vị', 20), v.number(body.min, 'Tồn tối thiểu', 0, 1e6));
  return { id: key };
}

function importStock(db, user, body) {
  authorize(user, 'warehouse');
  const supplier = v.text(body.supplier, 'Mã nhà cung cấp'), ingredient = v.text(body.ingredient, 'Mã nguyên liệu');
  find(db, 'suppliers', supplier); find(db, 'ingredients', ingredient);
  const qty = v.number(body.qty, 'Số lượng', 0.001, 1e6), price = v.number(body.price, 'Đơn giá', 1, 1e9, true), date = v.date(body.date);
  v.requireValue(date <= v.today(), 'Ngày nhập không được ở tương lai.');
  const key = id('import');
  db.prepare('INSERT INTO stock_imports(id,supplier_id,ingredient_id,quantity,unit_price,date,created_by) VALUES(?,?,?,?,?,?,?)').run(key, supplier, ingredient, qty, price, date, user.id);
  db.prepare('UPDATE ingredients SET stock=ROUND(stock+?,3) WHERE id=?').run(qty, ingredient);
  return { id: key };
}

function createMember(db, user, body) {
  authorize(user, 'sales');
  const name = v.text(body.name, 'Họ tên', 80), phone = v.phone(body.phone);
  v.requireValue(!db.prepare('SELECT id FROM customers WHERE phone=?').get(phone), 'Số điện thoại đã có thẻ thành viên.', 409);
  const key = id('customer');
  db.prepare('INSERT INTO customers(id,name,phone) VALUES(?,?,?)').run(key, name, phone);
  return { id: key };
}

function createBooking(db, user, body) {
  authorize(user, 'customer');
  const name = v.text(body.name, 'Họ tên', 80), phone = v.phone(body.phone), date = v.date(body.date), time = v.text(body.time, 'Giờ đến', 5);
  v.requireValue(/^\d{2}:\d{2}$/.test(time) && time >= '09:00' && time <= '21:00' && +time.slice(3) < 60, 'Giờ đến phải từ 09:00 đến 21:00.');
  v.requireValue(new Date(`${date}T${time}:00+07:00`).getTime() > Date.now(), 'Vui lòng chọn thời gian đến trong tương lai.');
  const tableId = v.number(body.table, 'Bàn', 1, 1000, true), guests = v.number(body.guests, 'Số khách', 1, 6, true), note = v.text(body.note || '', 'Ghi chú', 1000, true);
  const table = find(db, 'dining_tables', tableId);
  v.requireValue(guests <= table.seats, 'Bàn được chọn không đủ chỗ.');
  const minute = +time.slice(0, 2) * 60 + +time.slice(3);
  const conflicts = db.prepare("SELECT time FROM bookings WHERE table_id=? AND date=? AND status<>'Đã hủy'").all(tableId, date);
  v.requireValue(!conflicts.some(x => Math.abs(+x.time.slice(0, 2) * 60 + +x.time.slice(3) - minute) < 120), 'Bàn đã có lịch trong khung giờ này. Vui lòng chọn bàn hoặc giờ khác.', 409);
  const items = pricedItems(db, body.items || []), key = id('booking');
  db.prepare('INSERT INTO bookings(id,user_id,customer_id,name,phone,date,time,guests,table_id,note) VALUES(?,?,?,?,?,?,?,?,?,?)').run(key, user.id, user.customer_id, name, phone, date, time, guests, tableId, note);
  for (const item of items) db.prepare('INSERT INTO booking_items(booking_id,product_id,name,price,quantity) VALUES(?,?,?,?,?)').run(key, item.id, item.name, item.price, item.qty);
  return { id: key };
}

function bookingStatus(db, user, key, body) {
  authorize(user, 'customer', 'sales');
  const booking = find(db, 'bookings', key);
  v.requireValue(user.role === 'sales' || booking.user_id === user.id, 'Không tìm thấy đặt bàn.', 404);
  const status = body.status;
  v.requireValue(['Chờ xác nhận', 'Đã xác nhận'].includes(booking.status), 'Không thể thay đổi đặt bàn đã kết thúc.', 409);
  if (user.role === 'customer') {
    v.requireValue(status === 'Đã hủy', 'Khách hàng chỉ có thể hủy đặt bàn.', 403);
    v.requireValue(new Date(`${booking.date}T${booking.time}:00+07:00`).getTime() > Date.now(), 'Không thể hủy đặt bàn đã đến giờ.', 409);
  } else v.requireValue(status === 'Đã hủy' || (status === 'Đã xác nhận' && booking.status === 'Chờ xác nhận'), 'Chuyển trạng thái không hợp lệ.', 409);
  db.prepare('UPDATE bookings SET status=? WHERE id=?').run(status, key);
  return { id: key, status };
}

function checkIn(db, user, key) {
  authorize(user, 'sales');
  const booking = find(db, 'bookings', key);
  v.requireValue(booking.status === 'Đã xác nhận', 'Chỉ nhận khách sau khi đã xác nhận đặt bàn.', 409);
  const items = db.prepare('SELECT product_id AS id,name,price,quantity AS qty FROM booking_items WHERE booking_id=?').all(key);
  const order = createOrder(db, user, booking.table_id, booking.customer_id, items);
  db.prepare("UPDATE bookings SET status='Đã nhận khách',order_id=? WHERE id=?").run(order.id, key);
  return { table: booking.table_id, orderId: order.id };
}

function tableAction(db, user, tableId, action, body) {
  authorize(user, 'sales');
  if (action === 'receive') {
    const customer = body.customer === 'walkin' || body.customer == null ? null : v.text(body.customer, 'Khách hàng');
    return createOrder(db, user, tableId, customer);
  }
  if (action === 'pay') {
    // A retry refers to the same order, never a later guest at the same table.
    v.text(body.orderId, 'Mã lượt phục vụ');
    const previous = db.prepare('SELECT id,table_id FROM invoices WHERE order_id=?').get(body.orderId);
    if (previous) {
      v.requireValue(previous.table_id === tableId, 'Mã lượt phục vụ không thuộc bàn.', 409);
      return invoiceById(db, previous.id);
    }
  }
  const order = openOrder(db, tableId, body);
  if (action === 'items') {
    const item = pricedItems(db, [{ id: body.id, qty: body.qty }])[0];
    const previous = db.prepare('SELECT quantity FROM order_items WHERE order_id=? AND product_id=?').get(order.id, item.id);
    v.requireValue((previous?.quantity || 0) + item.qty <= 99, 'Mỗi món chỉ được gọi tối đa 99 phần.');
    db.prepare(`INSERT INTO order_items(order_id,product_id,name,price,quantity) VALUES(?,?,?,?,?)
      ON CONFLICT(order_id,product_id) DO UPDATE SET quantity=quantity+excluded.quantity`).run(order.id, item.id, item.name, item.price, item.qty);
  } else if (action === 'remove') {
    const result = db.prepare('DELETE FROM order_items WHERE order_id=? AND product_id=?').run(order.id, v.text(body.id, 'Mã món'));
    v.requireValue(result.changes > 0, 'Món đã được bỏ khỏi bàn.', 409);
  } else if (action === 'release') {
    v.requireValue(!db.prepare('SELECT product_id FROM order_items WHERE order_id=?').get(order.id), 'Không thể trả bàn khi vẫn còn món chưa thanh toán.', 409);
    db.prepare("UPDATE orders SET status='cancelled',version=version+1 WHERE id=?").run(order.id);
    return { ok: true };
  } else if (action === 'pay') {
    v.requireValue(['Tiền mặt', 'Chuyển khoản', 'Thẻ ngân hàng'].includes(body.method), 'Phương thức thanh toán không hợp lệ.');
    const items = db.prepare('SELECT product_id AS id,name,price,quantity AS qty FROM order_items WHERE order_id=?').all(order.id);
    v.requireValue(items.length > 0, 'Bàn chưa gọi món.', 409);
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0), key = id('HD');
    db.prepare('INSERT INTO invoices(id,order_id,customer_id,table_id,date,total,method,created_by) VALUES(?,?,?,?,?,?,?,?)').run(key, order.id, order.customer_id, tableId, v.today(), total, body.method, user.id);
    for (const item of items) db.prepare('INSERT INTO invoice_items(invoice_id,product_id,name,price,quantity) VALUES(?,?,?,?,?)').run(key, item.id, item.name, item.price, item.qty);
    db.prepare("UPDATE orders SET status='paid',version=version+1 WHERE id=?").run(order.id);
    return invoiceById(db, key);
  } else throw new v.HttpError(404, 'Không tìm thấy chức năng.');
  db.prepare('UPDATE orders SET version=version+1 WHERE id=?').run(order.id);
  return { orderId: order.id, version: order.version + 1 };
}

function mutate(db, user, method, pathname, body) {
  return transaction(db, () => {
    let match;
    if (pathname === '/api/foods' && method === 'POST') return saveFood(db, user, body);
    if ((match = pathname.match(/^\/api\/foods\/([^/]+)$/)) && method === 'PUT') return saveFood(db, user, body, match[1]);
    if (pathname === '/api/combos' && method === 'POST') return saveCombo(db, user, body);
    if ((match = pathname.match(/^\/api\/combos\/([^/]+)$/))) {
      if (method === 'PUT') return saveCombo(db, user, body, match[1]);
      if (method === 'DELETE') {
        authorize(user, 'manager');
        v.requireValue(find(db, 'products', match[1]).kind === 'combo', 'Không tìm thấy combo.', 404);
        db.prepare('UPDATE products SET deleted=1,available=0 WHERE id=?').run(match[1]);
        return { ok: true };
      }
    }
    if (pathname === '/api/suppliers' && method === 'POST') return saveSupplier(db, user, body);
    if ((match = pathname.match(/^\/api\/suppliers\/([^/]+)$/)) && method === 'PUT') return saveSupplier(db, user, body, match[1]);
    if (pathname === '/api/ingredients' && method === 'POST') return addIngredient(db, user, body);
    if (pathname === '/api/imports' && method === 'POST') return importStock(db, user, body);
    if (pathname === '/api/customers' && method === 'POST') return createMember(db, user, body);
    if (pathname === '/api/bookings' && method === 'POST') return createBooking(db, user, body);
    if ((match = pathname.match(/^\/api\/bookings\/([^/]+)\/status$/)) && method === 'PATCH') return bookingStatus(db, user, match[1], body);
    if ((match = pathname.match(/^\/api\/bookings\/([^/]+)\/check-in$/)) && method === 'POST') return checkIn(db, user, match[1]);
    if ((match = pathname.match(/^\/api\/tables\/(\d+)\/(receive|items|remove|release|pay)$/)) && method === 'POST') return tableAction(db, user, v.number(+match[1], 'Mã bàn', 1, 1000, true), match[2], body);
    throw new v.HttpError(404, 'Không tìm thấy API.');
  });
}

module.exports = { mutate, id };
