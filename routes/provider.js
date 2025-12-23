// routes/provider.js
import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

// --------------------
// 1️⃣ Get provider profile
// GET /api/provider/profile
// Roles: provider
// --------------------
router.get("/profile", auth, roleCheck(["provider"]), async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, phone, bio, created_at FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Profile not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// 2️⃣ Update provider profile
// PATCH /api/provider/profile
// Roles: provider
// --------------------
router.patch("/profile", auth, roleCheck(["provider"]), async (req, res) => {
  try {
    const { name, phone, bio } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (phone) { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (bio) { fields.push(`bio = $${idx++}`); values.push(bio); }

    if (!fields.length)
      return res.status(400).json({ message: "No fields to update" });

    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx++} RETURNING *`;
    values.push(req.user.userId);

    const result = await db.query(query, values);
    res.json({ message: "Profile updated", profile: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// 3️⃣ Get provider stats
// GET /api/provider/stats
// Roles: provider
// --------------------
router.get("/stats", auth, roleCheck(["provider"]), async (req, res) => {
  try {
    const providerId = req.user.userId;

    const totalBookings = await db.query(
      "SELECT COUNT(*) FROM bookings WHERE provider_id = $1",
      [providerId]
    );

    const completedBookings = await db.query(
      "SELECT COUNT(*) FROM bookings WHERE provider_id = $1 AND status = $2",
      [providerId, "completed"]
    );

    const pendingBookings = await db.query(
      "SELECT COUNT(*) FROM bookings WHERE provider_id = $1 AND status = $2",
      [providerId, "pending"]
    );

    res.json({
      totalBookings: parseInt(totalBookings.rows[0].count),
      completedBookings: parseInt(completedBookings.rows[0].count),
      pendingBookings: parseInt(pendingBookings.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// 4️⃣ Manage availability
// POST /api/provider/availability
// Roles: provider
// --------------------
router.post("/availability", auth, roleCheck(["provider"]), async (req, res) => {
  try {
    const { date, start_time, end_time } = req.body;
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ message: "Date, start_time, and end_time are required" });
    }

    const result = await db.query(
      `INSERT INTO provider_availability (provider_id, date, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, date, start_time, end_time]
    );

    res.json({ message: "Availability added", availability: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// 5️⃣ Get provider availability
// GET /api/provider/availability
// Roles: provider
// --------------------
router.get("/availability", auth, roleCheck(["provider"]), async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, date, start_time, end_time FROM provider_availability WHERE provider_id = $1 ORDER BY date ASC",
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// 6️⃣ Delete availability
// DELETE /api/provider/availability/:id
// Roles: provider
// --------------------
router.delete("/availability/:id", auth, roleCheck(["provider"]), async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM provider_availability WHERE id = $1 AND provider_id = $2 RETURNING *",
      [req.params.id, req.user.userId]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Availability not found" });

    res.json({ message: "Availability removed", availability: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
