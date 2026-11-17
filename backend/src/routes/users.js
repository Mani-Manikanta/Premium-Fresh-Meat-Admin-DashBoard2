const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const publicUserFields = 'id, name, email, role, created_at, updated_at';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(requireAuth, requireAdmin);

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function validateUserFields(body, isUpdate) {
  const fields = {};
  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.trim().length > 100) {
      return { error: 'Name must be between 1 and 100 characters.' };
    }
    fields.name = body.name.trim();
  }
  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, 'email')) {
    if (
      typeof body.email !== 'string' ||
      body.email.length > 254 ||
      !emailPattern.test(body.email)
    ) {
      return { error: 'Enter a valid email address (maximum 254 characters).' };
    }
    fields.email = body.email.trim().toLowerCase();
  }
  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, 'role')) {
    if (body.role !== 'admin' && body.role !== 'user') {
      return { error: 'Role must be either admin or user.' };
    }
    fields.role = body.role;
  }
  if (!isUpdate || Object.prototype.hasOwnProperty.call(body, 'password')) {
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 72) {
      return { error: 'Password must be between 8 and 72 characters.' };
    }
    fields.password = body.password;
  }
  return { fields };
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ${publicUserFields} FROM users ORDER BY created_at DESC, id DESC`
    );
    return res.json({ users: rows });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'User ID must be a positive integer.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT ${publicUserFields} FROM users WHERE id = ?`,
      [id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User was not found.' });
    }
    return res.json({ user: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { fields, error } = validateUserFields(req.body || {}, false);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const passwordHash = await bcrypt.hash(fields.password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [fields.name, fields.email, passwordHash, fields.role]
    );
    const [rows] = await pool.execute(
      `SELECT ${publicUserFields} FROM users WHERE id = ?`,
      [result.insertId]
    );
    return res.status(201).json({ user: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email is already registered.' });
    }
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'User ID must be a positive integer.' });
  }
  const { fields, error } = validateUserFields(req.body || {}, true);
  if (error) {
    return res.status(400).json({ error });
  }
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'Provide at least one field to update.' });
  }
  if (id === req.user.id && fields.role === 'user') {
    return res.status(400).json({ error: 'You cannot remove your own administrator access.' });
  }

  try {
    const updates = [];
    const values = [];
    for (const field of ['name', 'email', 'role']) {
      if (Object.prototype.hasOwnProperty.call(fields, field)) {
        updates.push(`${field} = ?`);
        values.push(fields[field]);
      }
    }
    if (fields.password) {
      updates.push('password_hash = ?');
      values.push(await bcrypt.hash(fields.password, 10));
    }
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User was not found.' });
    }
    const [rows] = await pool.execute(
      `SELECT ${publicUserFields} FROM users WHERE id = ?`,
      [id]
    );
    return res.json({ user: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email is already registered.' });
    }
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'User ID must be a positive integer.' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account while signed in.' });
  }

  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User was not found.' });
    }
    return res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
