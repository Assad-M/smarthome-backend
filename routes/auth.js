import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import db from "../db.js";
import authMiddleware from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

dotenv.config();

const router = express.Router();

/**
 * REGISTER (USER or PROVIDER)
 * body: { name, email, password, role }
 */
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const userRole = role && ["user", "provider"].includes(role) ? role : "user";

    const userExists = await db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, userRole]
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * LOGIN (USER or PROVIDER)
 * body: { email, password }
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const userResult = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    if (userResult.rows.length === 0)
      return res.status(400).json({ message: "Invalid email or password" });

    const user = userResult.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
await db.query(
  `INSERT INTO auth_logs (user_id, action, ip_address)
   VALUES ($1, 'login', $2)`,
  [user.id, req.ip]
);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET PROFILE (Protected)
 * Roles: user, provider, admin
 */
router.get(
  "/profile",
  authMiddleware,
  roleCheck(["user", "provider", "admin"]),
  async (req, res) => {
    try {
      const userResult = await db.query(
        "SELECT id, name, email, role FROM users WHERE id=$1",
        [req.user.id]
      );
      if (userResult.rows.length === 0) return res.status(404).json({ message: "User not found" });

      res.json({ success: true, user: userResult.rows[0] });
    } catch (err) {
      console.error("Profile Error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// --------------------
// Export router as default (ES module)
export default router;
