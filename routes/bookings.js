import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";
import { createNotification } from "./notificationHelper.js";

const router = express.Router();

// --------------------
// Helper: Update booking status + send notification
// --------------------
async function updateBookingStatus({ bookingId, providerId, currentStatus, newStatus, timestampColumn }) {
  const result = await db.query(
    `UPDATE bookings
     SET status = $1 ${timestampColumn ? `, ${timestampColumn} = NOW()` : ''}
     WHERE id = $2 AND provider_id = $3 AND status = $4
     RETURNING *`,
    [newStatus, bookingId, providerId, currentStatus]
  );

  if (!result.rows.length) return null;

  try {
    await createNotification(
      result.rows[0].user_id,
      `Your booking #${bookingId} has been ${newStatus.replace('-', ' ')} by the provider.`,
      'booking'
    );
  } catch (err) {
    console.error('Notification helper error:', err);
  }

  return result.rows[0];
}

// --------------------
// Estimate hours function
// --------------------
function estimateHoursFromDetails(details, serviceBaseHours ) {
  // For now, just return base hours from service
  return serviceBaseHours || 1;
}

// --------------------
// 1️⃣ User: Create booking
// --------------------
router.post('/', auth, roleCheck(['user']), async (req, res) => {
  try {
    const { service_id, booking_date, workers_requested = 1, booking_details = {} } = req.body;

    if (!service_id || !booking_date)
      return res.status(400).json({ message: 'Missing required fields' });

    // Fetch service
    const serviceRes = await db.query('SELECT * FROM services WHERE id = $1', [service_id]);
    if (!serviceRes.rows.length) return res.status(404).json({ message: 'Service not found' });
    const service = serviceRes.rows[0];

    // Validate workers
    const workers = Math.min(workers_requested, service.max_workers || 1);

    // Estimate hours & price
    const base_hours = estimateHoursFromDetails(booking_details, service.base_hours);
    const adjusted_hours = Math.ceil(base_hours / workers);
    const estimated_price = adjusted_hours * workers * parseFloat(service.price);

    // Create booking
    const result = await db.query(
      `INSERT INTO bookings 
       (user_id, service_id, provider_id, booking_date, status, workers_requested, estimated_hours, estimated_price, booking_details)
       VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8)
       RETURNING *`,
      [
        req.user.userId,
        service_id,
        service.provider_id,
        booking_date,
        workers,
        adjusted_hours,
        estimated_price,
        booking_details
      ]
    );

    res.json({ message: 'Booking created', booking: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// --------------------
// 2️⃣ User: View bookings
// --------------------
router.get('/', auth, roleCheck(['user']), async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const values = [req.user.userId];
    let idx = 2;

    let query = `
      SELECT b.id, s.name AS service_name, b.booking_date, b.status,
             b.workers_requested, b.estimated_hours, b.estimated_price
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.user_id = $1
    `;

    if (status) { query += ` AND b.status = $${idx++}`; values.push(status); }
    if (from) { query += ` AND b.booking_date >= $${idx++}`; values.push(from); }
    if (to) { query += ` AND b.booking_date <= $${idx++}`; values.push(to); }

    const countResult = await db.query(`SELECT COUNT(*) FROM (${query}) AS sub`, values);
    const totalItems = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    query += ` ORDER BY b.booking_date DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    res.json({
      page: Number(page),
      limit: Number(limit),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// 3️⃣ User: Cancel booking
// --------------------
router.patch('/:id/cancel', auth, roleCheck(['user']), async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE bookings
       SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.userId]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: 'Booking not found or cannot cancel' });

    res.json({ message: 'Booking cancelled', booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// 4️⃣ Provider actions: accept/start/complete
// --------------------
router.patch('/provider/:id/accept', auth, roleCheck(['provider']), async (req, res) => {
  try {
    const booking = await updateBookingStatus({
      bookingId: req.params.id,
      providerId: req.user.userId,
      currentStatus: 'pending',
      newStatus: 'accepted',
      timestampColumn: 'accepted_at'
    });

    if (!booking) return res.status(400).json({ message: 'Booking not found or already accepted' });
    res.json({ message: 'Booking accepted', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/provider/:id/start', auth, roleCheck(['provider']), async (req, res) => {
  try {
    const booking = await updateBookingStatus({
      bookingId: req.params.id,
      providerId: req.user.userId,
      currentStatus: 'accepted',
      newStatus: 'in-progress',
      timestampColumn: 'started_at'
    });

    if (!booking) return res.status(400).json({ message: 'Cannot start this booking' });
    res.json({ message: 'Booking started', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/provider/:id/complete', auth, roleCheck(['provider']), async (req, res) => {
  try {
    const booking = await updateBookingStatus({
      bookingId: req.params.id,
      providerId: req.user.userId,
      currentStatus: 'in-progress',
      newStatus: 'completed',
      timestampColumn: 'completed_at'
    });

    if (!booking) return res.status(400).json({ message: 'Cannot complete this booking' });
    res.json({ message: 'Booking completed', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// 5️⃣ Provider: View bookings
// --------------------
router.get('/provider/all', auth, roleCheck(['provider']), async (req, res) => {
  try {
    const { status, from, to, userName, page = 1, limit = 20 } = req.query;
    const values = [req.user.userId];
    let idx = 2;

    let baseQuery = `
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN services s ON s.id = b.service_id
      WHERE b.provider_id = $1
    `;

    if (status) { baseQuery += ` AND b.status = $${idx++}`; values.push(status); }
    if (from) { baseQuery += ` AND b.booking_date >= $${idx++}`; values.push(from); }
    if (to) { baseQuery += ` AND b.booking_date <= $${idx++}`; values.push(to); }
    if (userName) { baseQuery += ` AND u.name ILIKE $${idx++}`; values.push(`%${userName}%`); }

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, values);
    const totalItems = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT b.id, u.name AS customer_name, s.name AS service_name, b.booking_date, b.status,
             b.workers_requested, b.estimated_hours, b.estimated_price
      ${baseQuery}
      ORDER BY b.booking_date DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const result = await db.query(dataQuery, [...values, limit, offset]);

    res.json({
      page: Number(page),
      limit: Number(limit),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching provider bookings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
