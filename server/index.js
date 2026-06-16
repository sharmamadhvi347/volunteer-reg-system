const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');

const { readDb, writeDb } = require('./db');
const { signToken, requireAdmin, TOKEN_COOKIE } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

const AREAS_OF_INTEREST = [
  'Food Distribution',
  'Education & Tutoring',
  'Sanitary Pad Distribution',
  'Clothes Collection & Distribution',
  'Event & Campaign Support',
  'Social Media & Content',
  'Fundraising & Outreach',
  'Administrative / Office Support'
];

// ---------- Helper functions ----------

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone.replace(/[\s-]/g, ''));
}

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------- Public API ----------

// Get list of areas of interest (used to render the form dynamically)
app.get('/api/areas', (req, res) => {
  res.json({ areas: AREAS_OF_INTEREST });
});

// Submit a new volunteer registration
app.post('/api/volunteers', (req, res) => {
  const { fullName, email, phone, age, city, areasOfInterest, availability, message } = req.body;

  // Basic validation
  const errors = [];
  if (!fullName || fullName.trim().length < 2) errors.push('Please enter your full name.');
  if (!email || !isValidEmail(email)) errors.push('Please enter a valid email address.');
  if (!phone || !isValidPhone(phone)) errors.push('Please enter a valid 10-digit phone number.');
  if (!age || isNaN(age) || age < 13 || age > 100) errors.push('Please enter a valid age (13-100).');
  if (!city || city.trim().length < 2) errors.push('Please enter your city.');
  if (!Array.isArray(areasOfInterest) || areasOfInterest.length === 0) {
    errors.push('Please select at least one area of interest.');
  }
  if (!availability || availability.trim().length < 2) errors.push('Please tell us your availability.');

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const db = readDb();

  // Prevent duplicate registrations from the same email
  const existing = db.volunteers.find(
    (v) => v.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    return res.status(409).json({
      error: 'A volunteer registration with this email already exists. Thank you for your enthusiasm!'
    });
  }

  const newVolunteer = {
    id: db.nextVolunteerId,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    age: Number(age),
    city: city.trim(),
    areasOfInterest,
    availability: availability.trim(),
    message: message ? message.trim() : '',
    status: 'New',
    registeredAt: new Date().toISOString()
  };

  db.volunteers.push(newVolunteer);
  db.nextVolunteerId += 1;
  writeDb(db);

  res.status(201).json({
    message: 'Thank you for registering as a volunteer with NayePankh Foundation!',
    volunteer: newVolunteer
  });
});

// ---------- Admin auth ----------

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = readDb();
  const admin = db.admins.find((a) => a.username.toLowerCase() === username.toLowerCase());

  if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = signToken(admin);
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  });

  res.json({ message: 'Logged in successfully.', username: admin.username });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE);
  res.json({ message: 'Logged out successfully.' });
});

// Check current admin session
app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

// ---------- Admin: volunteer management ----------

// Get all volunteers (supports basic filtering and search)
app.get('/api/admin/volunteers', requireAdmin, (req, res) => {
  const db = readDb();
  let volunteers = [...db.volunteers];

  const { status, area, search } = req.query;

  if (status && status !== 'All') {
    volunteers = volunteers.filter((v) => v.status === status);
  }

  if (area && area !== 'All') {
    volunteers = volunteers.filter((v) => v.areasOfInterest.includes(area));
  }

  if (search) {
    const term = search.toLowerCase();
    volunteers = volunteers.filter(
      (v) =>
        v.fullName.toLowerCase().includes(term) ||
        v.email.toLowerCase().includes(term) ||
        v.city.toLowerCase().includes(term)
    );
  }

  // Most recent first
  volunteers.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

  res.json({ volunteers, total: volunteers.length });
});

// Update a volunteer's status (New -> Contacted -> Active -> Inactive)
app.patch('/api/admin/volunteers/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['New', 'Contacted', 'Active', 'Inactive'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  const db = readDb();
  const volunteer = db.volunteers.find((v) => v.id === Number(req.params.id));

  if (!volunteer) {
    return res.status(404).json({ error: 'Volunteer not found.' });
  }

  volunteer.status = status;
  writeDb(db);

  res.json({ message: 'Status updated.', volunteer });
});

// Delete a volunteer record
app.delete('/api/admin/volunteers/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const index = db.volunteers.findIndex((v) => v.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Volunteer not found.' });
  }

  db.volunteers.splice(index, 1);
  writeDb(db);

  res.json({ message: 'Volunteer record deleted.' });
});

// ---------- Admin: dashboard summary ----------

app.get('/api/admin/summary', requireAdmin, (req, res) => {
  const db = readDb();
  const volunteers = db.volunteers;

  const totalVolunteers = volunteers.length;

  const statusCounts = { New: 0, Contacted: 0, Active: 0, Inactive: 0 };
  volunteers.forEach((v) => {
    if (statusCounts[v.status] !== undefined) statusCounts[v.status] += 1;
  });

  const areaCounts = {};
  AREAS_OF_INTEREST.forEach((area) => (areaCounts[area] = 0));
  volunteers.forEach((v) => {
    v.areasOfInterest.forEach((area) => {
      if (areaCounts[area] !== undefined) areaCounts[area] += 1;
    });
  });

  const cityCounts = {};
  volunteers.forEach((v) => {
    cityCounts[v.city] = (cityCounts[v.city] || 0) + 1;
  });
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city, count]) => ({ city, count }));

  // Registrations in the last 30 days, grouped by date
  const now = new Date();
  const last30 = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last30[key] = 0;
  }
  volunteers.forEach((v) => {
    const key = v.registeredAt.slice(0, 10);
    if (last30[key] !== undefined) last30[key] += 1;
  });

  res.json({
    totalVolunteers,
    statusCounts,
    areaCounts,
    topCities,
    registrationsLast30Days: Object.entries(last30).map(([date, count]) => ({ date, count }))
  });
});

// ---------- Admin: CSV report export ----------

app.get('/api/admin/report.csv', requireAdmin, (req, res) => {
  const db = readDb();
  const volunteers = [...db.volunteers].sort(
    (a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)
  );

  const headers = [
    'ID',
    'Full Name',
    'Email',
    'Phone',
    'Age',
    'City',
    'Areas of Interest',
    'Availability',
    'Message',
    'Status',
    'Registered At'
  ];

  const rows = volunteers.map((v) => [
    v.id,
    v.fullName,
    v.email,
    v.phone,
    v.age,
    v.city,
    v.areasOfInterest.join('; '),
    v.availability,
    v.message,
    v.status,
    v.registeredAt
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(toCsvValue).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="nayepankh-volunteers-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send(csv);
});

// ---------- Fallback (Express 5 / path-to-regexp v8 compatible) ----------

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Auto-create admin on first boot if none exists
const { readDb, writeDb } = require('./db');
const bcrypt = require('bcryptjs');
const _db = readDb();
if (_db.admins.length === 0 && process.env.ADMIN_USERNAME) {
  _db.admins.push({
    id: _db.nextAdminId,
    username: process.env.ADMIN_USERNAME,
    passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10)
  });
  _db.nextAdminId += 1;
  writeDb(_db);
  console.log('Admin account auto-created:', process.env.ADMIN_USERNAME);
}

app.listen(PORT, () => {
  console.log(`NayePankh Volunteer Registration System running at http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
});
