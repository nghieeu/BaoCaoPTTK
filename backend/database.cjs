const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPasswordSync } = require('./auth.cjs');
const { password } = require('./validation.cjs');
const seed = require('./seed.cjs');

function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function openDatabase({ dbPath = path.join(__dirname, '..', 'data', 'restman.sqlite'), initialPassword = process.env.RESTMAN_INITIAL_PASSWORD || 'RestMan@12345', demo = process.env.RESTMAN_DEMO_DATA !== '0' } = {}) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version > 1) throw new Error('Database mới hơn phiên bản ứng dụng. Không thể mở.');
    db.exec(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));
    if (!db.prepare('SELECT id FROM users LIMIT 1').get()) {
      password(initialPassword);
      transaction(db, () => initialize(db, initialPassword, demo));
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function initialize(db, initialPassword, demo) {
  for (const t of seed.tables) db.prepare('INSERT INTO dining_tables(id,seats) VALUES(?,?)').run(t.id, t.seats);
  if (demo) {
    for (const c of seed.customers) db.prepare('INSERT INTO customers(id,name,phone,tier) VALUES(?,?,?,?)').run(c.id, c.name, c.phone, c.tier);
    for (const f of seed.foods) db.prepare('INSERT INTO products(id,kind,name,category,price,icon,description,ingredients,available) VALUES(?,?,?,?,?,?,?,?,?)').run(f.id, 'food', f.name, f.category, f.price, f.icon, f.desc, f.ingredients, +f.available);
    for (const c of seed.combos) {
      db.prepare("INSERT INTO products(id,kind,name,price,icon) VALUES(?,'combo',?,?,'🍱')").run(c.id, c.name, c.price);
      for (const id of c.foods) db.prepare('INSERT INTO combo_items(combo_id,food_id) VALUES(?,?)').run(c.id, id);
    }
    for (const s of seed.suppliers) db.prepare('INSERT INTO suppliers(id,name,phone,address) VALUES(?,?,?,?)').run(s.id, s.name, s.phone, s.address);
    for (const i of seed.ingredients) db.prepare('INSERT INTO ingredients(id,name,unit,stock,min_stock) VALUES(?,?,?,?,?)').run(i.id, i.name, i.unit, i.stock, i.min);
  }
  const accounts = [
    ['u-manager', 'manager', 'Nguyễn Hoàng', 'manager', null],
    ['u-warehouse', 'warehouse', 'Trần Minh', 'warehouse', null],
    ['u-sales', 'sales', 'Lê Thanh', 'sales', null],
  ];
  if (demo) accounts.push(['u-customer', 'customer', 'Nguyễn Minh Anh', 'customer', 'c1']);
  for (const [id, username, name, role, customer] of accounts) db.prepare('INSERT INTO users(id,username,name,role,customer_id,password_hash) VALUES(?,?,?,?,?,?)').run(id, username, name, role, customer, hashPasswordSync(initialPassword));
  if (demo) for (const invoice of seed.invoices) {
    db.prepare('INSERT INTO invoices(id,customer_id,table_id,date,total,method,created_by) VALUES(?,?,?,?,?,?,?)').run(invoice.id, invoice.customer, invoice.table, invoice.date, invoice.total, invoice.method, 'u-sales');
    for (const item of invoice.items) db.prepare('INSERT INTO invoice_items(invoice_id,product_id,name,price,quantity) VALUES(?,?,?,?,?)').run(invoice.id, item.id, item.name, item.price, item.qty);
  }
}

module.exports = { openDatabase, transaction };
