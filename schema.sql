CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'player',
  game_role TEXT,
  ign TEXT,
  photo_url TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_date TEXT,
  status TEXT,
  note TEXT,
  UNIQUE(user_id, session_date)
);

CREATE TABLE IF NOT EXISTS match_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  match_date TEXT,
  opponent TEXT,
  result TEXT,
  kills INTEGER,
  deaths INTEGER,
  assists INTEGER,
  is_mvp INTEGER
);