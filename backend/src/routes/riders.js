
const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const riderFields = `
  id, name, phone, vehicle, delivery_zone,
  status, license_number, rides_completed, profile_image, rating, approval_status, suspension_reason,
  created_at, updated_at
`;

const allowedStatuses = ['On duty', 'Available', 'Off duty'];
const allowedApprovalStatuses = ['Pending', 'Approved', 'Rejected', 'Suspended'];

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validateRider(body, isUpdate = false) {
  const fields = {};
  const errors = [];

  const stringFields = {
    name: { max: 100, required: true },
    phone: { max: 20 },
    vehicle: { max: 50 },
    delivery_zone: { max: 100 },
    license_number: { max: 50 }
  };

  for (const [field, rules] of Object.entries(stringFields)) {
    if (body[field] === undefined) {
      if (!isUpdate && rules.required) {
        errors.push(`${field} is required.`);
      }
      continue;
    }

    if (body[field] !== null && typeof body[field] !== 'string') {
      errors.push(`${field} must be a string.`);
      continue;
    }

    const value = body[field] === null ? null : body[field].trim();

    if (rules.required && !value) {
      errors.push(`${field} is required.`);
    } else if (value && value.length > rules.max) {
      errors.push(`${field} cannot exceed ${rules.max} characters.`);
    } else {
      fields[field] = value || null;
    }
  }

  if (body.status !== undefined) {
    if (!allowedStatuses.includes(body.status)) {
      errors.push('Invalid rider status.');
    } else {
      fields.status = body.status;
    }
  } else if (!isUpdate) {
    fields.status = 'Available';
  }

  if (body.rides_completed !== undefined) {
    if (
      !Number.isSafeInteger(body.rides_completed) ||
      body.rides_completed < 0
    ) {
      errors.push('rides_completed must be a non-negative integer.');
    } else {
      fields.rides_completed = body.rides_completed;
    }
  } else if (!isUpdate) {
    fields.rides_completed = 0;
  }

  if (body.profile_image !== undefined) {
    const image = body.profile_image;
    if (image !== null && (
      typeof image !== 'string' ||
      image.length > 1050000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
    )) {
      errors.push('profile_image must be a JPEG, PNG, or WebP image smaller than 750 KB.');
    } else {
      fields.profile_image = image;
    }
  }

  if (body.rating !== undefined) {
    if (typeof body.rating !== 'number' || !Number.isFinite(body.rating) || body.rating < 0 || body.rating > 5) {
      errors.push('rating must be a number from 0 to 5.');
    } else {
      fields.rating = body.rating;
    }
  }

  if (body.approval_status !== undefined) {
    if (!allowedApprovalStatuses.includes(body.approval_status)) {
      errors.push('Rider approval status must be Pending, Approved, Rejected, or Suspended.');
    } else {
      fields.approval_status = body.approval_status;
    }
  } else if (!isUpdate) {
    fields.approval_status = 'Pending';
  }

  if (body.suspension_reason !== undefined) {
    if (body.suspension_reason !== null && (
      typeof body.suspension_reason !== 'string' ||
      !body.suspension_reason.trim() ||
      body.suspension_reason.trim().length > 500
    )) {
      errors.push('Suspension reason must be between 1 and 500 characters.');
    } else {
      fields.suspension_reason = body.suspension_reason?.trim() || null;
    }
  }

  if (body.suspension_reason !== undefined && !body.approval_status) {
    errors.push('Provide approval_status when changing a suspension reason.');
  }
  if (body.approval_status === 'Suspended' && !fields.suspension_reason) {
    errors.push('A reason is required to suspend a rider.');
  } else if (body.approval_status && body.approval_status !== 'Suspended') {
    if (fields.suspension_reason) {
      errors.push('A suspension reason can only be set for a suspended rider.');
    } else {
      fields.suspension_reason = null;
    }
  }

  return { fields, errors };
}

// All rider management routes require administrator access.
router.use(requireAuth, requireAdmin);

// GET all riders
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ${riderFields} FROM riders ORDER BY id DESC`
    );

    return res.json({ riders: rows });
  } catch (error) {
    return next(error);
  }
});

// GET one rider
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: 'Invalid rider ID.' });
    }

    const [rows] = await pool.execute(
      `SELECT ${riderFields} FROM riders WHERE id = ?`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Rider not found.' });
    }

    return res.json({ rider: rows[0] });
  } catch (error) {
    return next(error);
  }
});

// CREATE rider
router.post('/', async (req, res, next) => {
  try {
    const { fields, errors } = validateRider(req.body);

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const [result] = await pool.execute(
      `INSERT INTO riders
       (name, phone, vehicle, delivery_zone, status,
        license_number, rides_completed, profile_image, rating, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.name,
        fields.phone ?? null,
        fields.vehicle ?? null,
        fields.delivery_zone ?? null,
        fields.status,
        fields.license_number ?? null,
        fields.rides_completed,
        fields.profile_image ?? null,
        fields.rating ?? 0,
        fields.approval_status
      ]
    );

    const [rows] = await pool.execute(
      `SELECT ${riderFields} FROM riders WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Rider created successfully.',
      rider: rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

// UPDATE rider
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: 'Invalid rider ID.' });
    }

    const { fields, errors } = validateRider(req.body, true);

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const allowedFields = [
      'name',
      'phone',
      'vehicle',
      'delivery_zone',
      'status',
      'license_number',
      'rides_completed',
      'profile_image',
      'rating',
      'approval_status',
      'suspension_reason'
    ];

    const updates = allowedFields
      .filter((field) => fields[field] !== undefined)
      .map((field) => `${field} = ?`);

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Provide at least one field to update.'
      });
    }

    const values = allowedFields
      .filter((field) => fields[field] !== undefined)
      .map((field) => fields[field]);

    if (fields.approval_status === 'Rejected' || fields.approval_status === 'Suspended') {
      const [currentRows] = await pool.execute(
        'SELECT approval_status FROM riders WHERE id = ?',
        [id]
      );
      if (!currentRows[0]) {
        return res.status(404).json({ error: 'Rider not found.' });
      }
      const requiredStatus = fields.approval_status === 'Rejected' ? 'Pending' : 'Approved';
      if (currentRows[0].approval_status !== requiredStatus) {
        return res.status(409).json({
          error: fields.approval_status === 'Rejected'
            ? 'Only pending riders can be rejected.'
            : 'Only approved riders can be suspended.'
        });
      }
    }

    await pool.execute(
      `UPDATE riders SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    const [rows] = await pool.execute(
      `SELECT ${riderFields} FROM riders WHERE id = ?`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Rider not found.' });
    }

    return res.json({
      message: 'Rider updated successfully.',
      rider: rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE rider
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: 'Invalid rider ID.' });
    }

    const [result] = await pool.execute(
      'DELETE FROM riders WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Rider not found.' });
    }

    return res.json({ message: 'Rider deleted successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
