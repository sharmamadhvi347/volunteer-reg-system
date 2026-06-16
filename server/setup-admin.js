// One-time setup script to create the first admin account.
// Run with: node server/setup-admin.js
//
// You can change the default username/password by setting
// ADMIN_USERNAME and ADMIN_PASSWORD environment variables before running,
// or just edit the constants below.

const bcrypt = require('bcryptjs');
const { readDb, writeDb } = require('./db');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NayePankh@2026';

const db = readDb();

const existing = db.admins.find(
  (a) => a.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()
);

if (existing) {
  console.log(`An admin with username "${ADMIN_USERNAME}" already exists. No changes made.`);
  process.exit(0);
}

const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

db.admins.push({
  id: db.nextAdminId,
  username: ADMIN_USERNAME,
  passwordHash
});
db.nextAdminId += 1;

writeDb(db);

console.log('Admin account created successfully.');
console.log(`  Username: ${ADMIN_USERNAME}`);
console.log(`  Password: ${ADMIN_PASSWORD}`);
console.log('You can change these by setting ADMIN_USERNAME and ADMIN_PASSWORD environment variables before running this script, or by changing them after logging in.');
