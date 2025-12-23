// routes/services.js
import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

// --------------------
// 1️⃣ Create a new service
// POST /api/services
// Roles: provider
// --------------------
router.post("/", auth, roleCheck(["provider"]), async (req, res) => {
  try {
const { name, description, price, base_hours, max_hours, category_id } = req.body;
    if (!name || !price) return res.status(400).json({ message: "Name and price are required" });

const result = await db.query(
  `INSERT INTO services 
   (provider_id, name, description, price, base_hours, max_hours, category_id)
   VALUES ($1, $2, $3, $4, $5, $6, $7)
   RETURNING *`,
  [
    req.user.userId,
    name,
    description || "",
    price,
    base_hours,
    max_hours,
    category_id
  ]
);


    res.json({ message: "Service created", service: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --------------------
// 2️⃣ Get all services (with filters + pagination)
// GET /api/services
// Public
// --------------------
router.get("/", auth, async (req, res) => {
  try {
    const { providerId, minPrice, maxPrice, name, page = 1, limit = 20 } = req.query;
    const values = [];
    let idx = 1;

    let baseQuery = `
      FROM services s
  LEFT JOIN users u ON u.id = s.provider_id
  LEFT JOIN service_categories c ON c.id = s.category_id
  WHERE 1=1

    `;

    if (providerId) { baseQuery += ` AND s.provider_id = $${idx++}`; values.push(providerId); }
    if (minPrice) { baseQuery += ` AND s.price >= $${idx++}`; values.push(minPrice); }
    if (maxPrice) { baseQuery += ` AND s.price <= $${idx++}`; values.push(maxPrice); }
    if (name) { baseQuery += ` AND s.name ILIKE $${idx++}`; values.push(`%${name}%`); }

    const countResult = await db.query(`SELECT COUNT(*) ${baseQuery}`, values);
    const totalItems = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    const dataQuery = `
  SELECT
    s.*,
    u.name AS provider_name,
    c.name AS category_name
  ${baseQuery}
  ORDER BY s.id ASC
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
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// --------------------
// 3️⃣ Update a service
// PATCH /api/services/:id
// Roles: provider (owner) or admin
// --------------------
router.patch("/:id", auth, roleCheck(["provider", "admin"]), async (req, res) => {
  try {
    const serviceId = req.params.id;
    const { name, description, price } = req.body;

    let fields = [];
    let values = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (description) { fields.push(`description = $${idx++}`); values.push(description); }
    if (price) { fields.push(`price = $${idx++}`); values.push(price); }

    if (!fields.length) return res.status(400).json({ message: "No fields to update" });

    let query = `UPDATE services SET ${fields.join(", ")} WHERE id = $${idx++}`;
    values.push(serviceId);

    if (req.user.role === "provider") {
      query += ` AND provider_id = $${idx++}`;
      values.push(req.user.userId);
    }

    query += " RETURNING *";
    const result = await db.query(query, values);

    if (!result.rows.length) return res.status(404).json({ message: "Service not found or not allowed" });
    res.json({ message: "Service updated", service: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --------------------
// 4️⃣ Delete a service
// DELETE /api/services/:id
// Roles: provider (owner) or admin
// --------------------
router.delete("/:id", auth, roleCheck(["provider", "admin"]), async (req, res) => {
  try {
    const serviceId = req.params.id;

    let query = "DELETE FROM services WHERE id = $1";
    let values = [serviceId];

    if (req.user.role === "provider") {
      query += " AND provider_id = $2";
      values.push(req.user.userId);
    }

    query += " RETURNING *";
    const result = await db.query(query, values);

    if (!result.rows.length) return res.status(404).json({ message: "Service not found or not allowed" });
    res.json({ message: "Service deleted", service: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
