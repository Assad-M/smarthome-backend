// --------------------
// Imports
// --------------------
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./db.js";

// Routes
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/bookings.js";
import servicesRoutes from "./routes/services.js";
import providerRoutes from "./routes/provider.js";
import reviewsRoutes from "./routes/reviews.js";
import notificationRoutes from "./routes/notifications.js";
import adminRoutes from "./routes/admin.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import healthRoutes from "./routes/health.js";


// --------------------
// Config
// --------------------
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// --------------------
// Middleware
// --------------------

app.use(
  cors({
    origin: "*", // temporary – safe for MVP & thesis
    credentials: true,
  })
);
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log("Request URL:", req.url, "Method:", req.method);
  next();
});

// --------------------
// Routes
// --------------------
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", reviewsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/health", healthRoutes);


// Redirect singular booking path to plural
app.all(/^\/api\/booking\/provider(\/.*)?$/, (req, res) => {
  const target = req.originalUrl.replace("/api/booking/provider", "/api/bookings/provider");
  return res.redirect(307, target);
});

// Test & health routes
app.get("/hello", (req, res) => res.send("Hello world"));
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1"); // simple DB check
    return res.json({ status: "ok", db: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Health check failed:", err && err.message ? err.message : err);
    return res.status(503).json({ status: "fail", db: false, error: err.message });
  }
});

// --------------------
// Global error handlers
// --------------------
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err && err.stack ? err.stack : err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// --------------------
// Start server
// --------------------
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
