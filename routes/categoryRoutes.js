import express from "express";
import db from "../db.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET all categories
 */
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM service_categories ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

/**
 * CREATE category (ADMIN ONLY)
 */
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { name, pricing_model } = req.body;

      if (!name || !pricing_model) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const result = await db.query(
        `INSERT INTO service_categories (name, pricing_model)
         VALUES ($1, $2)
         RETURNING *`,
        [name, pricing_model]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create category" });
    }
  }
);

export default router;
