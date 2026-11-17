
const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [customers] = await pool.query(
      `SELECT id, name, email, location, orders_count, status
       FROM customers
       ORDER BY id DESC`
    );

    res.json(customers);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
