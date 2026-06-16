// ============================================================
// NayePankh Volunteer Registration — Admin Dashboard Logic
// ============================================================

const loginWrap = document.getElementById('loginWrap');
const dashboardWrap = document.getElementById('dashboardWrap');
const logoutWrap = document.getElementById('logoutWrap');
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const loginBtn = document.getElementById('loginBtn');

const statTotal = document.getElementById('statTotal');
const statNew = document.getElementById('statNew');
const statActive = document.getElementById('statActive');
const statContacted = document.getElementById('statContacted');
const topCitiesEl = document.getElementById('topCities');

const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const areaFilter = document.getElementById('areaFilter');
const volunteersBody = document.getElementById('volunteersBody');

let debounceTimer = null;

// ---------- Auth ----------

async function checkSession() {
  try {
    const res = await fetch('/api/admin/me');
    if (res.ok) {
      showDashboard();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  loginWrap.style.display = 'flex';
  dashboardWrap.style.display = 'none';
  logoutWrap.style.display = 'none';
}

function showDashboard() {
  loginWrap.style.display = 'none';
  dashboardWrap.style.display = 'block';
  logoutWrap.style.display = 'inline';
  loadAreas();
  loadSummary();
  loadVolunteers();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginAlert.className = 'np-alert';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      loginAlert.textContent = data.error || 'Login failed.';
      loginAlert.className = 'np-alert np-alert-error is-visible';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
      return;
    }

    showDashboard();
  } catch {
    loginAlert.textContent = 'Could not connect to server. Please try again.';
    loginAlert.className = 'np-alert np-alert-error is-visible';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

// ---------- Summary / Stats ----------

async function loadSummary() {
  try {
    const res = await fetch('/api/admin/summary');
    if (!res.ok) return;
    const data = await res.json();

    statTotal.textContent = data.totalVolunteers;
    statNew.textContent = data.statusCounts.New || 0;
    statActive.textContent = data.statusCounts.Active || 0;
    statContacted.textContent = data.statusCounts.Contacted || 0;

    if (data.topCities.length === 0) {
      topCitiesEl.textContent = 'No registrations yet.';
    } else {
      topCitiesEl.innerHTML = data.topCities
        .map(({ city, count }) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid var(--np-border);">
            <span style="color: var(--np-text);">${escHtml(city)}</span>
            <span style="font-weight: 600; color: var(--np-purple-dark);">${count} volunteer${count !== 1 ? 's' : ''}</span>
          </div>
        `)
        .join('');
    }
  } catch (err) {
    topCitiesEl.textContent = 'Could not load summary.';
  }
}

// ---------- Areas for filter ----------

async function loadAreas() {
  try {
    const res = await fetch('/api/areas');
    const data = await res.json();
    areaFilter.innerHTML = '<option value="All">All Areas</option>';
    data.areas.forEach((area) => {
      const opt = document.createElement('option');
      opt.value = area;
      opt.textContent = area;
      areaFilter.appendChild(opt);
    });
  } catch {}
}

// ---------- Volunteers table ----------

async function loadVolunteers() {
  const search = searchInput.value.trim();
  const status = statusFilter.value;
  const area = areaFilter.value;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status !== 'All') params.set('status', status);
  if (area !== 'All') params.set('area', area);

  volunteersBody.innerHTML = `<tr><td colspan="8" class="np-loading">Loading...</td></tr>`;

  try {
    const res = await fetch(`/api/admin/volunteers?${params.toString()}`);
    if (res.status === 401) {
      showLogin();
      return;
    }
    const data = await res.json();

    if (!data.volunteers || data.volunteers.length === 0) {
      volunteersBody.innerHTML = `<tr><td colspan="8" class="np-empty-state">No volunteers found matching your filters.</td></tr>`;
      return;
    }

    volunteersBody.innerHTML = data.volunteers.map((v) => `
      <tr id="row-${v.id}">
        <td style="font-weight: 500;">${escHtml(v.fullName)}</td>
        <td>
          <div>${escHtml(v.email)}</div>
          <div style="color: var(--np-text-muted);">${escHtml(v.phone)}</div>
        </td>
        <td>
          <div>${v.age} yrs</div>
          <div style="color: var(--np-text-muted);">${escHtml(v.city)}</div>
        </td>
        <td class="np-cell-wrap" style="max-width: 200px; white-space: normal; font-size: 12px; color: var(--np-text-muted);">
          ${v.areasOfInterest.map((a) => escHtml(a)).join(', ')}
        </td>
        <td style="color: var(--np-text-muted); font-size: 12px; max-width: 140px; white-space: normal;">
          ${escHtml(v.availability)}
        </td>
        <td>
          <select class="np-status-select" data-id="${v.id}" onchange="updateStatus(this)">
            <option value="New" ${v.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${v.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Active" ${v.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${v.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </td>
        <td style="color: var(--np-text-muted); font-size: 12px;">${formatDate(v.registeredAt)}</td>
        <td>
          <button class="np-btn np-btn-danger np-btn-sm" onclick="deleteVolunteer(${v.id}, '${escAttr(v.fullName)}')">Delete</button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    volunteersBody.innerHTML = `<tr><td colspan="8" class="np-empty-state">Could not load volunteers. Please refresh.</td></tr>`;
  }
}

// ---------- Status update ----------

async function updateStatus(selectEl) {
  const id = selectEl.dataset.id;
  const status = selectEl.value;

  try {
    const res = await fetch(`/api/admin/volunteers/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      alert('Failed to update status. Please try again.');
      return;
    }

    // Refresh summary numbers
    loadSummary();
  } catch {
    alert('Could not connect to server.');
  }
}

// ---------- Delete volunteer ----------

async function deleteVolunteer(id, name) {
  if (!confirm(`Are you sure you want to delete the record for ${name}? This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/admin/volunteers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete record. Please try again.');
      return;
    }

    const row = document.getElementById(`row-${id}`);
    if (row) row.remove();

    loadSummary();
  } catch {
    alert('Could not connect to server.');
  }
}

// ---------- Filters ----------

function onFilter() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadVolunteers, 300);
}

searchInput.addEventListener('input', onFilter);
statusFilter.addEventListener('change', loadVolunteers);
areaFilter.addEventListener('change', loadVolunteers);

// ---------- Helpers ----------

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'");
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------- Init ----------

checkSession();
