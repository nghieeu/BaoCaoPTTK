-- RestMan schema v1. All amounts are integer Vietnamese dong.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'Thành viên',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('manager','warehouse','sales','customer')),
  customer_id TEXT REFERENCES customers(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('food','combo')),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Combo',
  price INTEGER NOT NULL CHECK(price > 0),
  icon TEXT NOT NULL DEFAULT '🍽️',
  description TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1 CHECK(available IN (0,1)),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1))
) STRICT;

CREATE TABLE IF NOT EXISTS combo_items (
  combo_id TEXT NOT NULL REFERENCES products(id),
  food_id TEXT NOT NULL REFERENCES products(id),
  PRIMARY KEY(combo_id,food_id),
  CHECK(combo_id <> food_id)
) STRICT;

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock REAL NOT NULL DEFAULT 0 CHECK(stock >= 0),
  min_stock REAL NOT NULL DEFAULT 0 CHECK(min_stock >= 0)
) STRICT;

CREATE TABLE IF NOT EXISTS stock_imports (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  quantity REAL NOT NULL CHECK(quantity > 0),
  unit_price INTEGER NOT NULL CHECK(unit_price > 0),
  date TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id)
) STRICT;
CREATE INDEX IF NOT EXISTS imports_date ON stock_imports(date);

CREATE TABLE IF NOT EXISTS dining_tables (
  id INTEGER PRIMARY KEY,
  seats INTEGER NOT NULL CHECK(seats > 0)
) STRICT;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES dining_tables(id),
  customer_id TEXT REFERENCES customers(id),
  status TEXT NOT NULL CHECK(status IN ('open','paid','cancelled')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS one_open_order_per_table ON orders(table_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price > 0),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  PRIMARY KEY(order_id,product_id)
) STRICT;

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE REFERENCES orders(id),
  customer_id TEXT REFERENCES customers(id),
  table_id INTEGER NOT NULL REFERENCES dining_tables(id),
  date TEXT NOT NULL,
  total INTEGER NOT NULL CHECK(total > 0),
  method TEXT NOT NULL CHECK(method IN ('Tiền mặt','Chuyển khoản','Thẻ ngân hàng')),
  created_by TEXT NOT NULL REFERENCES users(id)
) STRICT;
CREATE INDEX IF NOT EXISTS invoices_customer_date ON invoices(customer_id,date);
CREATE INDEX IF NOT EXISTS invoices_date ON invoices(date);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price > 0),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99)
) STRICT;

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  guests INTEGER NOT NULL CHECK(guests BETWEEN 1 AND 6),
  table_id INTEGER NOT NULL REFERENCES dining_tables(id),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Chờ xác nhận'
    CHECK(status IN ('Chờ xác nhận','Đã xác nhận','Đã hủy','Đã nhận khách')),
  order_id TEXT UNIQUE REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE INDEX IF NOT EXISTS bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_table_date ON bookings(table_id,date,status);

CREATE TABLE IF NOT EXISTS booking_items (
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price > 0),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  PRIMARY KEY(booking_id,product_id)
) STRICT;

PRAGMA user_version = 1;
