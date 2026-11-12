const path = require('node:path');
const fs = require('node:fs');
const { backup } = require('node:sqlite');
const { openDatabase } = require('../backend/database.cjs');

async function main() {
  const command = process.argv[2] || 'info';
  if (!['init', 'info', 'backup'].includes(command)) throw new Error('Dùng: node scripts/database.cjs init|info|backup [file-backup]');
  const dbPath = path.resolve(process.env.RESTMAN_DB || path.join(__dirname, '..', 'data', 'restman.sqlite'));
  const db = openDatabase({ dbPath });
  try {
    if (command === 'backup') {
      const destination = path.resolve(process.argv[3] || path.join(__dirname, '..', 'data', 'backups', 'restman-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite'));
      if (destination === dbPath || fs.existsSync(destination)) throw new Error('Chọn tên file backup mới, khác database đang dùng.');
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      await backup(db, destination);
      console.log('Đã sao lưu SQLite: ' + destination);
    } else {
      console.log('SQLite: ' + dbPath);
      console.log('Schema: v' + db.prepare('PRAGMA user_version').get().user_version);
      console.log('Kiểm tra: ' + db.prepare('PRAGMA integrity_check').get().integrity_check);
      for (const table of ['users', 'customers', 'products', 'suppliers', 'ingredients', 'stock_imports', 'dining_tables', 'orders', 'bookings', 'invoices']) {
        console.log(table + ': ' + db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
      }
    }
  } finally { db.close(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
