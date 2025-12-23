import express from "express";
const router = express.Router();
import db from "../db.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

// Users
router.get('/users', auth, roleCheck(['admin']), async (req, res) => {
  const { page = 1, limit = 10, name, sortColumn = 'id', sortOrder = 'asc' } = req.query;
  const offset = (page - 1) * limit;
  const values = [];
  let where = 'WHERE 1=1';
  if (name) { values.push(`%${name}%`); where += ` AND name ILIKE $${values.length}`; }

  const total = await db.query(`SELECT COUNT(*) FROM users ${where}`, values);
  const users = await db.query(
    `SELECT * FROM users ${where} ORDER BY ${sortColumn} ${sortOrder} LIMIT $${values.length+1} OFFSET $${values.length+2}`,
    [...values, limit, offset]
  );
  res.json({ page: Number(page), totalPages: Math.ceil(total.rows[0].count / limit), data: users.rows });
});

// Services (Admin)
router.get('/services', auth, roleCheck(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, name, sortColumn = 'id', sortOrder = 'asc' } = req.query;
    const offset = (page - 1) * limit;
    const values = [];
    let where = 'WHERE 1=1';

    // Search filter
    if (name) {
      values.push(`%${name}%`);
      where += ` AND s.name ILIKE $${values.length}`;
    }

    // Count total services
    const totalQuery = `SELECT COUNT(*) FROM services s LEFT JOIN users u ON s.provider_id = u.id ${where}`;
    const total = await db.query(totalQuery, values);

    // Fetch services
    const servicesQuery = `
      SELECT s.*, u.name AS provider_name
      FROM services s
      LEFT JOIN users u ON s.provider_id = u.id
      ${where}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const services = await db.query(servicesQuery, [...values, limit, offset]);

    console.log("ADMIN SERVICES WHERE:", where);
    console.log("VALUES:", [...values, limit, offset]);
    console.log("Services response:", services.rows);

    res.json({
      page: Number(page),
      totalPages: Math.ceil(total.rows[0].count / limit),
      data: services.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Bookings
router.get('/bookings', auth, roleCheck(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortColumn = 'id', sortOrder = 'asc' } = req.query;
    const offset = (page - 1) * limit;
    const values = [];
    let where = 'WHERE 1=1';

    // Filter by status
    if (status) {
      values.push(status);
      where += ` AND b.status=$${values.length}`;
    }

    // Count total bookings (only from bookings table)
    const total = await db.query(`SELECT COUNT(*) FROM bookings b ${where}`, values);

    // Fetch bookings with joins
    const bookings = await db.query(
      `SELECT b.*, u.name AS user_name, p.name AS provider_name, s.name AS service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN users p ON b.provider_id = p.id
       JOIN services s ON b.service_id = s.id
       ${where}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    console.log("BOOKINGS WHERE:", where);
    console.log("VALUES:", [...values, limit, offset]);
    console.log("Bookings response:", bookings.rows);

    res.json({
      page: Number(page),
      totalPages: Math.ceil(total.rows[0].count / limit),
      data: bookings.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete endpoints
router.delete('/users/:id', auth, roleCheck(['admin']), async (req, res) => {
  const result = await db.query('DELETE FROM users WHERE id=$1 RETURNING *', [req.params.id]);
  res.json({ message: 'User deleted', data: result.rows[0] });
});

router.delete('/services/:id', auth, roleCheck(['admin']), async (req, res) => {
  const result = await db.query('DELETE FROM services WHERE id=$1 RETURNING *', [req.params.id]);
  res.json({ message: 'Service deleted', data: result.rows[0] });
});

router.delete('/bookings/:id', auth, roleCheck(['admin']), async (req, res) => {
  const result = await db.query('DELETE FROM bookings WHERE id=$1 RETURNING *', [req.params.id]);
  res.json({ message: 'Booking deleted', data: result.rows[0] });
});

export default  router;
