const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Gunakan direktori data sementara atau pastikan jalur absolut
const dbDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const DB_PATH = path.join(dbDir, '3spada.db');

const db = new Database(DB_PATH);

try {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('Database dan skema berhasil dimuat.');
  } else {
    console.error('File schema.sql tidak ditemukan di:', schemaPath);
  }
} catch (err) {
  console.error('Gagal menjalankan schema.sql:', err);
}

module.exports = db;