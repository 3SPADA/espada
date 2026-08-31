// Halaman ini butuh js/auth.js dimuat lebih dulu (pakai getToken, clearToken, API_BASE, showMsg)

const staffRoot = document.getElementById('staff-input-root');
const guardMsg = document.getElementById('staff-guard-msg');

let rosterPlayers = [];
let allStats = [];

if (staffRoot) {
  (async () => {
    const token = getToken();
    if (!token) { window.location.href = 'login.html'; return; }

    const authHeaders = { 'Authorization': 'Bearer ' + token };

    try {
      const meRes = await fetch(API_BASE + '/me', { headers: authHeaders });
      if (meRes.status === 401) { clearToken(); window.location.href = 'login.html'; return; }
      const me = await meRes.json();

      if (me.role !== 'staff' && me.role !== 'admin') {
        guardMsg.style.display = 'block';
        return;
      }

      staffRoot.style.display = 'block';

      // isi dropdown player dari roster publik
      const rosterRes = await fetch(API_BASE + '/roster');
      const roster = await rosterRes.json();
      rosterPlayers = roster.filter(r => r.role === 'player');
      const select = document.getElementById('stat-player');
      select.innerHTML = rosterPlayers.map(p =>
        `<option value="${p.id}">${p.full_name}${p.ign ? ' — ' + p.ign : ''}</option>`
      ).join('');

      document.getElementById('stat-date').value = new Date().toISOString().slice(0, 10);

      await loadAllStats(authHeaders);

      document.getElementById('stats-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('stats-form-msg');
        const body = {
          user_id: Number(select.value),
          match_date: document.getElementById('stat-date').value,
          opponent: document.getElementById('stat-opponent').value.trim(),
          result: document.getElementById('stat-result').value,
          kills: Number(document.getElementById('stat-kills').value) || 0,
          deaths: Number(document.getElementById('stat-deaths').value) || 0,
          assists: Number(document.getElementById('stat-assists').value) || 0,
          is_mvp: document.getElementById('stat-mvp').checked
        };

        try {
          const res = await fetch(API_BASE + '/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify(body)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal menyimpan statistik');
          showMsg(msg, 'Statistik tersimpan.', 'success');
          document.getElementById('stat-opponent').value = '';
          document.getElementById('stat-kills').value = 0;
          document.getElementById('stat-deaths').value = 0;
          document.getElementById('stat-assists').value = 0;
          document.getElementById('stat-mvp').checked = false;
          await loadAllStats(authHeaders);
        } catch (err) {
          showMsg(msg, err.message, 'error');
        }
      });
    } catch (err) {
      console.error(err);
    }
  })();

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });
}

async function loadAllStats(authHeaders) {
  const tbody = document.getElementById('stats-all-body');
  try {
    const res = await fetch(API_BASE + '/stats/all', { headers: authHeaders });
    const rows = await res.json();
    if (!res.ok) throw new Error(rows.error || 'Gagal memuat data');

    allStats = rows;
    renderStatsTable(allStats);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--loss)">Gagal memuat data.</td></tr>';
  }
}

function renderStatsTable(rows) {
  const tbody = document.getElementById('stats-all-body');

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--muted)">Belum ada data.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr data-id="${r.id}">
      <td>${r.match_date}</td>
      <td>${escapeHtml(r.full_name)}</td>
      <td>${escapeHtml(r.opponent)}</td>
      <td>${r.result === 'menang' ? 'Menang' : 'Kalah'}</td>
      <td>${r.kills}/${r.deaths}/${r.assists}</td>
      <td>${r.is_mvp ? 'MVP' : '-'}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn btn-edit-stat" data-id="${r.id}">Edit</button>
          <button class="icon-btn danger btn-delete-stat" data-id="${r.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-edit-stat').forEach(btn => {
    btn.addEventListener('click', () => startEditStat(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-delete-stat').forEach(btn => {
    btn.addEventListener('click', () => deleteStat(btn.dataset.id));
  });
}

function startEditStat(id) {
  const row = allStats.find(r => String(r.id) === String(id));
  if (!row) return;
  const tr = document.querySelector(`#stats-all-body tr[data-id="${id}"]`);
  if (!tr) return;

  // cari id player berdasarkan ign/nama yang tersimpan di baris statistik
  const matchedPlayer = rosterPlayers.find(p => p.full_name === row.full_name && (p.ign || '') === (row.ign || ''));

  tr.classList.add('edit-row');
  tr.innerHTML = `
    <td><input type="date" class="edit-date" value="${row.match_date}"></td>
    <td>
      <select class="edit-player">
        ${rosterPlayers.map(p => `<option value="${p.id}" ${matchedPlayer && matchedPlayer.id === p.id ? 'selected' : ''}>${p.full_name}${p.ign ? ' — ' + p.ign : ''}</option>`).join('')}
      </select>
    </td>
    <td><input type="text" class="edit-opponent" value="${escapeHtml(row.opponent)}"></td>
    <td>
      <select class="edit-result">
        <option value="menang" ${row.result === 'menang' ? 'selected' : ''}>Menang</option>
        <option value="kalah" ${row.result === 'kalah' ? 'selected' : ''}>Kalah</option>
      </select>
    </td>
    <td style="display:flex; gap:4px;">
      <input type="number" min="0" class="edit-kills" value="${row.kills}" style="width:50px;">
      <input type="number" min="0" class="edit-deaths" value="${row.deaths}" style="width:50px;">
      <input type="number" min="0" class="edit-assists" value="${row.assists}" style="width:50px;">
    </td>
    <td>
      <label style="display:flex; align-items:center; gap:6px; font-size:12px;">
        <input type="checkbox" class="edit-mvp" ${row.is_mvp ? 'checked' : ''} style="width:auto;"> MVP
      </label>
    </td>
    <td>
      <div class="row-actions">
        <button class="icon-btn btn-save-stat" data-id="${id}">Simpan</button>
        <button class="icon-btn btn-cancel-stat" data-id="${id}">Batal</button>
      </div>
    </td>
  `;

  tr.querySelector('.btn-save-stat').addEventListener('click', () => saveEditStat(id));
  tr.querySelector('.btn-cancel-stat').addEventListener('click', () => renderStatsTable(allStats));
}

async function saveEditStat(id) {
  const tr = document.querySelector(`#stats-all-body tr[data-id="${id}"]`);
  const body = {
    user_id: Number(tr.querySelector('.edit-player').value),
    match_date: tr.querySelector('.edit-date').value,
    opponent: tr.querySelector('.edit-opponent').value.trim(),
    result: tr.querySelector('.edit-result').value,
    kills: Number(tr.querySelector('.edit-kills').value) || 0,
    deaths: Number(tr.querySelector('.edit-deaths').value) || 0,
    assists: Number(tr.querySelector('.edit-assists').value) || 0,
    is_mvp: tr.querySelector('.edit-mvp').checked
  };

  try {
    const token = getToken();
    const res = await fetch(API_BASE + '/stats/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan perubahan');

    await loadAllStats({ 'Authorization': 'Bearer ' + token });
  } catch (err) {
    alert(err.message);
  }
}

async function deleteStat(id) {
  if (!confirm('Yakin ingin menghapus statistik pertandingan ini?')) return;

  try {
    const token = getToken();
    const res = await fetch(API_BASE + '/stats/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus data');

    allStats = allStats.filter(r => String(r.id) !== String(id));
    renderStatsTable(allStats);
  } catch (err) {
    alert(err.message);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
