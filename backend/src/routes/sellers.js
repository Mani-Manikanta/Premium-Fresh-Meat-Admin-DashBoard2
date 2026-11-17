
const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const sellerFields =
  'id, shop_name, contact_name, email, category, status, shop_address, meat_types, license_number, shop_image, profile_image, rating, approval_status, suspension_reason, created_at, updated_at';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validStatuses = ['Active', 'Review', 'Inactive'];
const validApprovalStatuses = ['Pending', 'Approved', 'Rejected', 'Suspended'];

router.use(requireAuth, requireAdmin);

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function validateSellerFields(body, isUpdate) {
  const fields = {};

  const requiredFields = ['shop_name', 'contact_name', 'email'];

  for (const field of requiredFields) {
    if (!isUpdate || Object.prototype.hasOwnProperty.call(body, field)) {
      const value = body[field];

      if (typeof value !== 'string' || !value.trim()) {
        return { error: `${field} is required.` };
      }

      const maxLength = field === 'shop_name' ? 150 :
        field === 'contact_name' ? 100 : 254;

      if (value.trim().length > maxLength) {
        return { error: `${field} must not exceed ${maxLength} characters.` };
      }

      fields[field] = field === 'email'
        ? value.trim().toLowerCase()
        : value.trim();
    }
  }

  if (fields.email && !emailPattern.test(fields.email)) {
    return { error: 'Enter a valid email address.' };
  }

  if (Object.prototype.hasOwnProperty.call(body, 'category')) {
    if (
      body.category !== null &&
      (typeof body.category !== 'string' || body.category.length > 100)
    ) {
      return { error: 'Category must be a string of maximum 100 characters or null.' };
    }
    fields.category = body.category?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'shop_address')) {
    if (
      body.shop_address !== null &&
      (typeof body.shop_address !== 'string' || body.shop_address.length > 255)
    ) {
      return { error: 'Shop address must not exceed 255 characters.' };
    }
    fields.shop_address = body.shop_address?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'meat_types')) {
    if (
      !Array.isArray(body.meat_types) ||
      body.meat_types.length > 20 ||
      body.meat_types.some(
        type => typeof type !== 'string' || !type.trim() || type.length > 50
      )
    ) {
      return { error: 'Meat types must be an array of up to 20 valid strings.' };
    }

    fields.meat_types = [...new Set(body.meat_types.map(type => type.trim()))];
  }

  if (Object.prototype.hasOwnProperty.call(body, 'license_number')) {
    if (body.license_number !== null && (
      typeof body.license_number !== 'string' || body.license_number.trim().length > 50
    )) {
      return { error: 'License number must not exceed 50 characters.' };
    }
    fields.license_number = body.license_number?.trim() || null;
  }

  for (const field of ['shop_image', 'profile_image']) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const image = body[field];
      if (image !== null && (
        typeof image !== 'string' ||
        image.length > 1050000 ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
      )) {
        return { error: `${field} must be a JPEG, PNG, or WebP image smaller than 750 KB.` };
      }
      fields[field] = image;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'rating')) {
    if (typeof body.rating !== 'number' || !Number.isFinite(body.rating) || body.rating < 0 || body.rating > 5) {
      return { error: 'Rating must be a number from 0 to 5.' };
    }
    fields.rating = body.rating;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'approval_status')) {
    if (!validApprovalStatuses.includes(body.approval_status)) {
      return { error: 'Approval status must be Pending, Approved, Rejected, or Suspended.' };
    }
    fields.approval_status = body.approval_status;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'suspension_reason')) {
    if (body.suspension_reason !== null && (
      typeof body.suspension_reason !== 'string' ||
      !body.suspension_reason.trim() ||
      body.suspension_reason.trim().length > 500
    )) {
      return { error: 'Suspension reason must be between 1 and 500 characters.' };
    }
    fields.suspension_reason = body.suspension_reason?.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'suspension_reason') && !body.approval_status) {
    return { error: 'Provide approval_status when changing a suspension reason.' };
  }
  if (body.approval_status === 'Suspended' && !fields.suspension_reason) {
    return { error: 'A reason is required to suspend a seller.' };
  }
  if (body.approval_status && body.approval_status !== 'Suspended') {
    if (fields.suspension_reason) {
      return { error: 'A suspension reason can only be set for a suspended seller.' };
    }
    fields.suspension_reason = null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (!validStatuses.includes(body.status)) {
      return { error: 'Status must be Active, Review, or Inactive.' };
    }
    fields.status = body.status;
  }

  return { fields };
}

// GET all sellers
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ${sellerFields} FROM sellers ORDER BY created_at DESC, id DESC`
    );

    return res.json({ sellers: rows });
  } catch (error) {
    return next(error);
  }
});

// GET one seller
router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Seller ID must be a positive integer.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT ${sellerFields} FROM sellers WHERE id = ?`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Seller was not found.' });
    }

    return res.json({ seller: rows[0] });
  } catch (error) {
    return next(error);
  }
});

// CREATE seller
router.post('/', async (req, res, next) => {
  const { fields, error } = validateSellerFields(req.body || {}, false);

  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO sellers
       (shop_name, contact_name, email, category, status, shop_address, meat_types,
        license_number, shop_image, profile_image, rating, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.shop_name,
        fields.contact_name,
        fields.email,
        fields.category ?? null,
        fields.status || 'Review',
        fields.shop_address ?? null,
        fields.meat_types ? JSON.stringify(fields.meat_types) : null,
        fields.license_number ?? null,
        fields.shop_image ?? null,
        fields.profile_image ?? null,
        fields.rating ?? 0,
        fields.approval_status || 'Pending'
      ]
    );

    const [rows] = await pool.execute(
      `SELECT ${sellerFields} FROM sellers WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ seller: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Seller email is already registered.' });
    }
    return next(error);
  }
});

// UPDATE seller
router.put('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Seller ID must be a positive integer.' });
  }

  const { fields, error } = validateSellerFields(req.body || {}, true);

  if (error) {
    return res.status(400).json({ error });
  }

  const allowedFields = [
    'shop_name',
    'contact_name',
    'email',
    'category',
    'status',
    'shop_address',
    'meat_types',
    'license_number',
    'shop_image',
    'profile_image',
    'rating',
    'approval_status',
    'suspension_reason'
  ];

  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      updates.push(`${field} = ?`);
      values.push(
        field === 'meat_types' ? JSON.stringify(fields[field]) : fields[field]
      );
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Provide at least one field to update.' });
  }

  try {
    if (fields.approval_status === 'Rejected' || fields.approval_status === 'Suspended') {
      const [currentRows] = await pool.execute(
        'SELECT approval_status FROM sellers WHERE id = ?',
        [id]
      );
      if (!currentRows[0]) {
        return res.status(404).json({ error: 'Seller was not found.' });
      }
      const requiredStatus = fields.approval_status === 'Rejected' ? 'Pending' : 'Approved';
      if (currentRows[0].approval_status !== requiredStatus) {
        return res.status(409).json({
          error: fields.approval_status === 'Rejected'
            ? 'Only pending sellers can be rejected.'
            : 'Only approved sellers can be suspended.'
        });
      }
    }

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE sellers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute(
      `SELECT ${sellerFields} FROM sellers WHERE id = ?`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Seller was not found.' });
    }

    return res.json({ seller: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Seller email is already registered.' });
    }
    return next(error);
  }
});

// DELETE seller
router.delete('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Seller ID must be a positive integer.' });
  }

  try {
    const [result] = await pool.execute(
      'DELETE FROM sellers WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Seller was not found.' });
    }

    return res.json({ message: 'Seller deleted successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
