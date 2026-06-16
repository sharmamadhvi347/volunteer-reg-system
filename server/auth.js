const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nayepankh-volunteer-system-dev-secret-change-me';
const TOKEN_COOKIE = 'np_admin_token';

function signToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function requireAdmin(req, res, next) {
  const token = req.cookies[TOKEN_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

module.exports = { signToken, requireAdmin, JWT_SECRET, TOKEN_COOKIE };
