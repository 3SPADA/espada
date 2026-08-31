const fs = require('fs');
const path = require('path');

const dbFile = path.join('/tmp', 'espada_data.json');

// Inisialisasi file data jika belum ada
if (!fs.existsSync(dbFile)) {
  const initialData = {
    users: [],
    attendance: [],
    match_stats: []
  };
  fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
}

function readDb() {
  try {
    const data = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { users: [], attendance: [], match_stats: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// Emulator gaya better-sqlite3 agar server.js tidak perlu diubah sama sekali
const db = {
  prepare(sql) {
    const trimmed = sql.trim().toLowerCase();
    
    return {
      get(...params) {
        const data = readDb();
        if (trimmed.includes('from users where username =')) {
          const username = params[0];
          return data.users.find(u => u.username === username);
        }
        if (trimmed.includes('from users where id =')) {
          const id = params[0];
          return data.users.find(u => u.id === id);
        }
        if (trimmed.includes('select id from attendance where id =')) {
          const id = params[0];
          return data.attendance.find(a => a.id === id);
        }
        if (trimmed.includes('select id from match_stats where id =')) {
          const id = params[0];
          return data.match_stats.find(m => m.id === id);
        }
        return null;
      },
      all(...params) {
        const data = readDb();
        if (trimmed.includes('from users')) {
          return data.users;
        }
        if (trimmed.includes('from attendance')) {
          if (trimmed.includes('where user_id =')) {
            const userId = params[0];
            return data.attendance.filter(a => a.user_id === userId);
          }
          return data.attendance.map(a => {
            const u = data.users.find(user => user.id === a.user_id) || {};
            return { ...a, full_name: u.full_name, username: u.username };
          });
        }
        if (trimmed.includes('from match_stats')) {
          if (trimmed.includes('where user_id =')) {
            const userId = params[0];
            return data.match_stats.filter(m => m.user_id === userId);
          }
          return data.match_stats.map(m => {
            const u = data.users.find(user => user.id === m.user_id) || {};
            return { ...m, full_name: u.full_name, ign: u.ign };
          });
        }
        return [];
      },
      run(...params) {
        const data = readDb();
        if (trimmed.includes('insert into users')) {
          const newUser = {
            id: data.users.length + 1,
            username: params[0],
            password_hash: params[1],
            full_name: params[2],
            role: params[3],
            game_role: params[4] || null,
            ign: params[5] || null,
            photo_url: null,
            joined_at: new Date().toISOString()
          };
          data.users.push(newUser);
          writeDb(data);
          return { lastInsertRowid: newUser.id };
        }
        if (trimmed.includes('update users')) {
          const userId = params[4];
          const user = data.users.find(u => u.id === userId);
          if (user) {
            user.full_name = params[0];
            user.ign = params[1];
            user.game_role = params[2];
            user.photo_url = params[3];
            writeDb(data);
          }
          return { changes: 1 };
        }
        if (trimmed.includes('insert into attendance')) {
          const user_id = params[0];
          const session_date = params[1];
          const status = params[2];
          const note = params[3] || null;
          
          const existingIndex = data.attendance.findIndex(a => a.user_id === user_id && a.session_date === session_date);
          if (existingIndex >= 0) {
            data.attendance[existingIndex].status = status;
            data.attendance[existingIndex].note = note;
          } else {
            data.attendance.push({ id: data.attendance.length + 1, user_id, session_date, status, note });
          }
          writeDb(data);
          return { changes: 1 };
        }
        if (trimmed.includes('insert into match_stats')) {
          const newStat = {
            id: data.match_stats.length + 1,
            user_id: params[0],
            match_date: params[1],
            opponent: params[2],
            result: params[3],
            kills: params[4],
            deaths: params[5],
            assists: params[6],
            is_mvp: params[7]
          };
          data.match_stats.load ? null : data.match_stats.push(newStat);
          writeDb(data);
          return { lastInsertRowid: newStat.id };
        }
        return { changes: 0, lastInsertRowid: 1 };
      }
    };
  },
  exec(sql) {
    // Dummy exec untuk skema
    return true;
  }
};

console.log('Menggunakan database berbasis file JSON yang aman untuk cloud.');
module.exports = db;