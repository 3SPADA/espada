const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const DB_PATH = path.join(dbDir, '3spada.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Gagal membuka database:', err.message);
  } else {
    console.log('Terhubung ke database SQLite.');
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema, (err) => {
        if (err) console.error('Gagal menjalankan skema:', err);
        else console.log('Skema database berhasil dimuat.');
      });
    }
  }
});

module.exports = db;