// Ganti sesuai alamat backend kalian saat deploy (lihat backend/README)
const API_BASE = '/api';

function saveToken(token){ localStorage.setItem('3spada_token', token); }
function getToken(){ return localStorage.getItem('3spada_token'); }
function clearToken(){ localStorage.removeItem('3spada_token'); }

function showMsg(el, text, type){
  el.textContent = text;
  el.className = 'form-msg ' + (type || '');
}

// ---------- REGISTER ----------
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('register-msg');
    const body = {
      full_name: document.getElementById('reg-name').value.trim(),
      username: document.getElementById('reg-username').value.trim(),
      password: document.getElementById('reg-password').value,
      ign: document.getElementById('reg-ign').value.trim(),
      game_role: document.getElementById('reg-role').value,
      role: document.getElementById('reg-type').value
    };
    try {
      const res = await fetch(API_BASE + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registrasi gagal');
      showMsg(msg, 'Berhasil daftar! Mengalihkan ke login...', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    } catch (err) {
      showMsg(msg, err.message, 'error');
    }
  });
}

// ---------- LOGIN ----------
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('login-msg');
    const body = {
      username: document.getElementById('login-username').value.trim(),
      password: document.getElementById('login-password').value
    };
    try {
      const res = await fetch(API_BASE + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal');
      saveToken(data.token);
      showMsg(msg, 'Berhasil masuk! Mengalihkan...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (err) {
      showMsg(msg, err.message, 'error');
    }
  });
}

// ---------- DASHBOARD ----------
const dashRoot = document.getElementById('dashboard-root');
if (dashRoot) {
  (async () => {
    const token = getToken();
    if (!token) { window.location.href = 'login.html'; return; }

    const authHeaders = { 'Authorization': 'Bearer ' + token };

    try {
      const meRes = await fetch(API_BASE + '/me', { headers: authHeaders });
      if (meRes.status === 401) { clearToken(); window.location.href = 'login.html'; return; }
      const me = await meRes.json();

      document.getElementById('dash-name').textContent = me.full_name;
      document.getElementById('dash-role').textContent = (me.game_role || '-') + ' · ' + me.role.toUpperCase();

      // isi form edit profil dengan data saat ini
      document.getElementById('profile-name').value = me.full_name || '';
      document.getElementById('profile-ign').value = me.ign || '';
      document.getElementById('profile-game-role').value = me.game_role || '';
      document.getElementById('profile-photo').value = me.photo_url || '';

      document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('profile-form-msg');
        const body = {
          full_name: document.getElementById('profile-name').value.trim(),
          ign: document.getElementById('profile-ign').value.trim(),
          game_role: document.getElementById('profile-game-role').value.trim(),
          photo_url: document.getElementById('profile-photo').value.trim()
        };
        try {
          const res = await fetch(API_BASE + '/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify(body)
          });
          const updated = await res.json();
          if (!res.ok) throw new Error(updated.error || 'Gagal menyimpan profil');
          showMsg(msg, 'Profil berhasil diperbarui.', 'success');
          document.getElementById('dash-name').textContent = updated.full_name;
          document.getElementById('dash-role').textContent = (updated.game_role || '-') + ' · ' + updated.role.toUpperCase();
        } catch (err) {
          showMsg(msg, err.message, 'error');
        }
      });

      if (me.role === 'staff' || me.role === 'admin') {
        const staffLink = document.getElementById('link-staff-stats');
        if (staffLink) staffLink.style.display = 'inline-flex';
        const attendanceLink = document.getElementById('link-staff-attendance');
        if (attendanceLink) attendanceLink.style.display = 'inline-flex';
      }

      // Absensi hari ini
      const today = new Date().toISOString().slice(0, 10);
      document.getElementById('attendance-date').textContent = today;

      document.getElementById('btn-hadir').addEventListener('click', () => submitAttendance('hadir', today, authHeaders));
      document.getElementById('btn-izin').addEventListener('click', () => submitAttendance('izin', today, authHeaders));

      // Riwayat statistik
      const statsRes = await fetch(API_BASE + '/stats/me', { headers: authHeaders });
      const stats = await statsRes.json();
      const tbody = document.getElementById('stats-body');
      tbody.innerHTML = '';
      if (stats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">Belum ada data statistik.</td></tr>';
      } else {
        stats.forEach(s => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${s.match_date}</td><td>${s.opponent}</td><td>${s.result === 'menang' ? 'Menang' : 'Kalah'}</td><td>${s.kills}/${s.deaths}/${s.assists}</td><td>${s.is_mvp ? 'MVP' : '-'}</td>`;
          tbody.appendChild(tr);
        });
      }
    } catch (err) {
      console.error(err);
    }
  })();

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });
}

async function submitAttendance(status, date, authHeaders) {
  const msg = document.getElementById('attendance-msg');
  try {
    const res = await fetch(API_BASE + '/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ session_date: date, status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal absen');
    showMsg(msg, 'Absen tercatat: ' + status.toUpperCase(), 'success');
  } catch (err) {
    showMsg(msg, err.message, 'error');
  }
}
