// routes/reviews.js
import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";
import { createNotification } from "./notificationHelper.js"; // Optional

const router = express.Router();

// --------------------
// 1️⃣ User: Add a review for a completed booking
// POST /api/bookings/:id/review
// Roles: user
// --------------------
router.post("/:id/review", auth, roleCheck(["user"]), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookingId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const bookingResult = await db.query(
      "SELECT * FROM bookings WHERE id=$1 AND user_id=$2 AND status=$3",
      [bookingId, req.user.userId, "completed"]
    );

    if (!bookingResult.rows.length) {
      return res.status(400).json({ message: "Booking not found or not completed" });
    }

    const providerId = bookingResult.rows[0].provider_id;

    const existing = await db.query("SELECT * FROM reviews WHERE booking_id=$1", [bookingId]);
    if (existing.rows.length) {
      return res.status(400).json({ message: "Review already submitted for this booking" });
    }

    const result = await db.query(
      `INSERT INTO reviews (booking_id, user_id, provider_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bookingId, req.user.userId, providerId, rating, comment || null]
    );

    // Optional: Notify provider
    try {
      await createNotification(
        providerId,
        `You received a new review for booking #${bookingId}: ${rating}⭐`,
        "review"
      );
    } catch (err) {
      console.error("Notification error:", err);
    }

    res.json({ message: "Review submitted", review: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// 2️⃣ Get all reviews for a service
// GET /api/services/:id/reviews
// Public route
// --------------------
router.get("/services/:id/reviews", async (req, res) => {
  try {
    const serviceId = req.params.id;
    const result = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
       FROM reviews r
       JOIN bookings b ON b.id = r.booking_id
       JOIN users u ON u.id = r.user_id
       WHERE b.service_id=$1
       ORDER BY r.created_at DESC`,
      [serviceId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// 3️⃣ Get average rating for a service
// GET /api/services/:id/average-rating
// Public route
// --------------------
router.get("/services/:id/average-rating", async (req, res) => {
  try {
    const serviceId = req.params.id;
    const result = await db.query(
      `SELECT AVG(rating)::numeric(2,1) AS average_rating, COUNT(*) AS total_reviews
       FROM reviews r
       JOIN bookings b ON b.id = r.booking_id
       WHERE b.service_id=$1`,
      [serviceId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// 4️⃣ Provider: View own received reviews (filter + pagination)
// GET /api/provider/reviews
// Roles: provider
// --------------------
router.get("/provider/reviews", auth, roleCheck(["provider"]), async (req, res) => {
  try {
    const { page = 1, limit = 20, minRating } = req.query;
    const providerId = req.user.userId;

    const values = [providerId];
    let idx = 2;

    let baseQuery = `
      FROM reviews r
      JOIN bookings b ON b.id = r.booking_id
      JOIN users u ON u.id = r.user_id
      WHERE r.provider_id = $1
    `;

    if (minRating) {
      baseQuery += ` AND r.rating >= $${idx++}`;
      values.push(minRating);
    }

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, values);
    const totalItems = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name,
             b.service_id, s.name AS service_name
      ${baseQuery}
      JOIN services s ON s.id = b.service_id
      ORDER BY r.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const result = await db.query(dataQuery, [...values, limit, offset]);

    res.json({
      page: Number(page),
      limit: Number(limit),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching provider reviews:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
