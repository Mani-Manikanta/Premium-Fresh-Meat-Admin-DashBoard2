const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUserFields = 'id, name, email, role, created_at';

function createToken(user) {
  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: process.env.JWT_EXPIRES_IN || '2h'
    }
  );
}

function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && emailPattern.test(email);
}

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!validEmail(email) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'A valid email and password are required.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, password_hash, role FROM users WHERE email = ?`,
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)) || user.role !== 'admin') {
      return res.status(401).json({ error: 'Administrator email or password is incorrect.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    return res.json({ user: safeUser, token: createToken(safeUser) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ${publicUserFields} FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'This account no longer exists.' });
    }
    return res.json({ user: rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
