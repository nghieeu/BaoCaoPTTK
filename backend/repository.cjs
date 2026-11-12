const { date, requireValue } = require('./validation.cjs');

function catalog(db, showUnavailable = false) {
  const rows = db.prepare('SELECT * FROM products WHERE deleted=0 ORDER BY rowid').all();
  const foods = rows.filter(p => p.kind === 'food' && (showUnavailable || p.available)).map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, icon: p.icon, desc: p.description, ingredients: p.ingredients, available: !!p.available }));
  const combos = rows.filter(p => p.kind === 'combo').map(p => ({ id: p.id, name: p.name, price: p.price, foods: db.prepare('SELECT food_id FROM combo_items WHERE combo_id=?').all(p.id).map(x => x.food_id) }));
  return { foods, combos: showUnavailable ? combos : combos.filter(c => c.foods.every(id => foods.some(f => f.id === id))) };
}

function invoiceById(db, id) {
  const row = db.prepare('SELECT * FROM invoices WHERE id=?').get(id);
  if (!row) return null;
  return { id: row.id, orderId: row.order_id, customer: row.customer_id || 'walkin', table: row.table_id, date: row.date, total: row.total, method: row.method,
    items: db.prepare('SELECT product_id AS id,name,price,quantity AS qty FROM invoice_items WHERE invoice_id=? ORDER BY id').all(id) };
}

function bookings(db, user) {
  const rows = user.role === 'customer'
    ? db.prepare('SELECT * FROM bookings WHERE user_id=? ORDER BY rowid').all(user.id)
    : db.prepare('SELECT * FROM bookings ORDER BY rowid').all();
  return rows.map(b => ({ id: b.id, userId: b.user_id, owner: b.user_id, name: b.name, phone: b.phone, date: b.date, time: b.time, guests: b.guests, table: b.table_id, note: b.note, status: b.status,
    items: db.prepare('SELECT product_id AS id,name,price,quantity AS qty FROM booking_items WHERE booking_id=? ORDER BY rowid').all(b.id) }));
}

function state(db, user) {
  const data = { ...catalog(db, user.role === 'manager'), customers: [], suppliers: [], ingredients: [], imports: [], tables: [], bookings: [], invoices: [] };
  if (['manager', 'sales'].includes(user.role)) data.customers = db.prepare('SELECT id,name,phone,tier FROM customers ORDER BY rowid').all();
  if (user.role === 'customer') data.customers = db.prepare('SELECT id,name,phone,tier FROM customers WHERE id=?').all(user.customer_id);
  if (['manager', 'warehouse'].includes(user.role)) {
    data.suppliers = db.prepare('SELECT * FROM suppliers ORDER BY rowid').all();
    data.ingredients = db.prepare('SELECT id,name,unit,stock,min_stock AS min FROM ingredients ORDER BY rowid').all();
    data.imports = db.prepare('SELECT id,supplier_id AS supplier,ingredient_id AS ingredient,quantity AS qty,unit_price AS price,date FROM stock_imports ORDER BY rowid').all();
  }
  if (['sales', 'customer'].includes(user.role)) {
    data.tables = db.prepare('SELECT * FROM dining_tables ORDER BY id').all().map(t => {
      if (user.role === 'customer') return { ...t, items: [], customer: '' };
      const order = db.prepare("SELECT * FROM orders WHERE table_id=? AND status='open'").get(t.id);
      return { ...t, orderId: order?.id || null, version: order?.version || 0, customer: order ? (order.customer_id || 'walkin') : '',
        items: order ? db.prepare('SELECT product_id AS id,name,price,quantity AS qty FROM order_items WHERE order_id=? ORDER BY rowid').all(order.id) : [] };
    });
    data.bookings = bookings(db, user);
  }
  if (['manager', 'sales'].includes(user.role)) data.invoices = db.prepare('SELECT id FROM invoices ORDER BY date,id').all().map(i => invoiceById(db, i.id));
  return data;
}

function reports(db, from, to) {
  date(from); date(to);
  requireValue(from <= to, 'Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  const summary = db.prepare('SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS total, COUNT(DISTINCT customer_id) AS customers FROM invoices WHERE date BETWEEN ? AND ?').get(from, to);
  summary.average = summary.count ? Math.round(summary.total / summary.count) : 0;
  const customers = db.prepare(`SELECT c.id,c.name,c.phone,c.tier,COUNT(i.id) AS count,SUM(i.total) AS total
    FROM customers c JOIN invoices i ON i.customer_id=c.id WHERE i.date BETWEEN ? AND ?
    GROUP BY c.id ORDER BY total DESC,c.name`).all(from, to);
  const foods = db.prepare(`SELECT p.id,p.name,p.category,p.kind,COALESCE(SUM(x.quantity),0) AS qty,COALESCE(SUM(x.quantity*x.price),0) AS revenue
    FROM products p LEFT JOIN (SELECT ii.* FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id WHERE i.date BETWEEN ? AND ?) x ON x.product_id=p.id
    GROUP BY p.id ORDER BY revenue DESC,p.name`).all(from, to);
  const ingredients = db.prepare(`SELECT g.id,g.name,g.unit,g.stock,COALESCE(SUM(i.quantity),0) AS imported,COALESCE(SUM(i.quantity*i.unit_price),0) AS value
    FROM ingredients g LEFT JOIN stock_imports i ON i.ingredient_id=g.id AND i.date BETWEEN ? AND ? GROUP BY g.id ORDER BY g.name`).all(from, to);
  const suppliers = db.prepare(`SELECT s.id,s.name,s.phone,COUNT(i.id) AS count,COALESCE(SUM(i.quantity*i.unit_price),0) AS value
    FROM suppliers s LEFT JOIN stock_imports i ON i.supplier_id=s.id AND i.date BETWEEN ? AND ? GROUP BY s.id ORDER BY value DESC,s.name`).all(from, to);
  return { from, to, summary, customers, foods, ingredients, suppliers };
}

module.exports = { catalog, state, bookings, invoiceById, reports };
