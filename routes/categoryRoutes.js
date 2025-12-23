import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET all categories (read-only)
router.get("/", auth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name FROM service_categories ORDER BY name"
    );

    res.json({
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load categories" });
  }
});

export default router;
