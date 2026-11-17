
const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedStatuses = ['New', 'Active', 'Inactive'];
const customerFields = 'id, name, email, location, orders_count, status, profile_image';

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const [customers] = await pool.query(
      `SELECT ${customerFields}
       FROM customers
       ORDER BY id DESC`
    );

    res.json({ customers });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { name, email, location, orders_count, status, profile_image } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
    return res.status(400).json({ error: 'Name must be between 1 and 100 characters.' });
  }
  if (typeof email !== 'string' || email.length > 254 || !emailPattern.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (location !== undefined && location !== null && (typeof location !== 'string' || location.length > 255)) {
    return res.status(400).json({ error: 'Location must not exceed 255 characters.' });
  }
  if (orders_count !== undefined && (!Number.isSafeInteger(orders_count) || orders_count < 0)) {
    return res.status(400).json({ error: 'Order count must be a non-negative integer.' });
  }
  if (profile_image !== undefined && profile_image !== null && (
    typeof profile_image !== 'string' ||
    profile_image.length > 1050000 ||
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(profile_image)
  )) {
    return res.status(400).json({ error: 'profile_image must be a JPEG, PNG, or WebP image smaller than 750 KB.' });
  }
  const customerStatus = status || 'New';
  if (!allowedStatuses.includes(customerStatus)) {
    return res.status(400).json({ error: 'Status must be New, Active, or Inactive.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO customers (name, email, location, orders_count, status, profile_image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), location?.trim() || null, orders_count ?? 0, customerStatus, profile_image ?? null]
    );
    const [rows] = await pool.execute(
      `SELECT ${customerFields} FROM customers WHERE id = ?`,
      [result.insertId]
    );
    return res.status(201).json({ customer: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Customer email is already registered.' });
    }
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Customer ID must be a positive integer.' });
  }
  if (!allowedStatuses.includes(req.body?.status)) {
    return res.status(400).json({ error: 'Status must be New, Active, or Inactive.' });
  }

  try {
    await pool.execute(
      'UPDATE customers SET status = ? WHERE id = ?',
      [req.body.status, id]
    );
    const [rows] = await pool.execute(
      `SELECT ${customerFields} FROM customers WHERE id = ?`,
      [id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Customer was not found.' });
    }
    return res.json({ customer: rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
