// Halaman ini butuh js/auth.js dimuat lebih dulu (pakai getToken, clearToken, API_BASE)

const attRoot = document.getElementById('staff-attendance-root');
const attGuardMsg = document.getElementById('staff-guard-msg');

let allAttendance = [];

if (attRoot) {
  (async () => {
    const token = getToken();
    if (!token) { window.location.href = 'login.html'; return; }

    const authHeaders = { 'Authorization': 'Bearer ' + token };

    try {
      const meRes = await fetch(API_BASE + '/me', { headers: authHeaders });
      if (meRes.status === 401) { clearToken(); window.location.href = 'login.html'; return; }
      const me = await meRes.json();

      if (me.role !== 'staff' && me.role !== 'admin') {
        attGuardMsg.style.display = 'block';
        return;
      }

      attRoot.style.display = 'block';

      const res = await fetch(API_BASE + '/attendance/all', { headers: authHeaders });
      const rows = await res.json();
      if (!res.ok) throw new Error(rows.error || 'Gagal memuat data absen');

      allAttendance = rows;
      renderSummary(allAttendance);
      renderAttendanceTable(allAttendance);

      document.getElementById('filter-name').addEventListener('input', applyFilters);
      document.getElementById('filter-status').addEventListener('change', applyFilters);
    } catch (err) {
      console.error(err);
      const tbody = document.getElementById('attendance-all-body');
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--loss)">Gagal memuat data absen.</td></tr>';
    }
  })();

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    clearToken();
    window.location.href = 'login.html';
  });
}

function applyFilters() {
  const nameQuery = document.getElementById('filter-name').value.trim().toLowerCase();
  const statusQuery = document.getElementById('filter-status').value;

  const filtered = allAttendance.filter(r => {
    const matchName = !nameQuery || r.full_name.toLowerCase().includes(nameQuery) || r.username.toLowerCase().includes(nameQuery);
    const matchStatus = !statusQuery || r.status === statusQuery;
    return matchName && matchStatus;
  });

  renderAttendanceTable(filtered);
}

function renderSummary(rows) {
  const counts = { hadir: 0, izin: 0, alpha: 0 };
  rows.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
  document.getElementById('count-hadir').textContent = counts.hadir;
  document.getElementById('count-izin').textContent = counts.izin;
  document.getElementById('count-alpha').textContent = counts.alpha;
}

function renderAttendanceTable(rows) {
  const tbody = document.getElementById('attendance-all-body');

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted)">Tidak ada data yang cocok.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr data-id="${r.id}">
      <td>${r.session_date}</td>
      <td>${escapeHtml(r.full_name)}</td>
      <td>${escapeHtml(r.username)}</td>
      <td><span class="badge ${statusBadgeClass(r.status)}">${statusLabel(r.status)}</span></td>
      <td>${r.note ? escapeHtml(r.note) : '-'}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn btn-edit-att" data-id="${r.id}">Edit</button>
          <button class="icon-btn danger btn-delete-att" data-id="${r.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-edit-att').forEach(btn => {
    btn.addEventListener('click', () => startEditAttendance(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-delete-att').forEach(btn => {
    btn.addEventListener('click', () => deleteAttendance(btn.dataset.id));
  });
}

function startEditAttendance(id) {
  const row = allAttendance.find(r => String(r.id) === String(id));
  if (!row) return;
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  if (!tr) return;

  tr.classList.add('edit-row');
  tr.innerHTML = `
    <td>${row.session_date}</td>
    <td>${escapeHtml(row.full_name)}</td>
    <td>${escapeHtml(row.username)}</td>
    <td>
      <select class="edit-status">
        <option value="hadir" ${row.status === 'hadir' ? 'selected' : ''}>Hadir</option>
        <option value="izin" ${row.status === 'izin' ? 'selected' : ''}>Izin</option>
        <option value="alpha" ${row.status === 'alpha' ? 'selected' : ''}>Alpha</option>
      </select>
    </td>
    <td><input type="text" class="edit-note" value="${row.note ? escapeHtml(row.note) : ''}" placeholder="Keterangan"></td>
    <td>
      <div class="row-actions">
        <button class="icon-btn btn-save-att" data-id="${id}">Simpan</button>
        <button class="icon-btn btn-cancel-att" data-id="${id}">Batal</button>
      </div>
    </td>
  `;

  tr.querySelector('.btn-save-att').addEventListener('click', () => saveEditAttendance(id));
  tr.querySelector('.btn-cancel-att').addEventListener('click', () => renderAttendanceTable(allAttendance));
}

async function saveEditAttendance(id) {
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  const status = tr.querySelector('.edit-status').value;
  const note = tr.querySelector('.edit-note').value.trim();

  try {
    const token = getToken();
    const res = await fetch(API_BASE + '/attendance/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status, note })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan perubahan');

    const idx = allAttendance.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) { allAttendance[idx].status = status; allAttendance[idx].note = note || null; }

    renderSummary(allAttendance);
    applyFilters();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteAttendance(id) {
  if (!confirm('Yakin ingin menghapus catatan absen ini?')) return;

  try {
    const token = getToken();
    const res = await fetch(API_BASE + '/attendance/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus data');

    allAttendance = allAttendance.filter(r => String(r.id) !== String(id));
    renderSummary(allAttendance);
    applyFilters();
  } catch (err) {
    alert(err.message);
  }
}

function statusBadgeClass(status) {
  if (status === 'hadir') return 'win';
  if (status === 'izin') return 'izin';
  return 'alpha';
}

function statusLabel(status) {
  if (status === 'hadir') return 'Hadir';
  if (status === 'izin') return 'Izin';
  return 'Alpha';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
