// routes/notifications.js
import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// --------------------
// GET /api/notifications
// Get notifications for logged-in user, provider, or admin
// Supports pagination, filtering by read_status and type
// --------------------
router.get("/", auth, async (req, res) => {
  try {
    const { read_status, page = 1, limit = 20, type } = req.query;
    const values = [];
    let idx = 1;

    let query = `
      SELECT n.*, u.name AS user_name
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE 1=1
    `;

    // Non-admin users see only their notifications
    if (req.user.role !== "admin") {
      query += ` AND n.user_id = $${idx++}`;
      values.push(req.user.userId);
    }

    // Filter by read_status
    if (read_status !== undefined) {
      query += ` AND n.read_status = $${idx++}`;
      values.push(read_status === "true");
    }

    // Filter by type
    if (type) {
      query += ` AND n.type = $${idx++}`;
      values.push(type);
    }

    // Count total items
    const countResult = await db.query(`SELECT COUNT(*) FROM (${query}) AS sub`, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY n.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --------------------
// PATCH /api/notifications/:id/read
// Mark a single notification as read
// --------------------
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const notificationId = req.params.id;

    let result;
    if (req.user.role === "admin") {
      result = await db.query(
        "UPDATE notifications SET read_status = TRUE WHERE id = $1 RETURNING *",
        [notificationId]
      );
    } else {
      result = await db.query(
        "UPDATE notifications SET read_status = TRUE WHERE id = $1 AND user_id = $2 RETURNING *",
        [notificationId, req.user.userId]
      );
    }

    if (!result.rows.length) {
      return res.status(404).json({ message: "Notification not found or not allowed" });
    }

    res.json({ message: "Notification marked as read", notification: result.rows[0] });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --------------------
// PATCH /api/notifications/read-all
// Mark all notifications as read
// --------------------
router.patch("/read-all", auth, async (req, res) => {
  try {
    let result;
    if (req.user.role === "admin") {
      result = await db.query(
        "UPDATE notifications SET read_status = TRUE WHERE read_status = FALSE RETURNING *"
      );
    } else {
      result = await db.query(
        "UPDATE notifications SET read_status = TRUE WHERE user_id = $1 AND read_status = FALSE RETURNING *",
        [req.user.userId]
      );
    }

    res.json({
      message: "All notifications marked as read",
      updatedCount: result.rowCount,
    });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --------------------
// Export as ES module
// --------------------
export default router;
