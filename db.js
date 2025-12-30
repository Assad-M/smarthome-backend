const { Pool } = require("pg");

// Use Render's DATABASE_URL environment variable if available, otherwise fallback to local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://smarthome_backend_user:saTVC4GZAdnc8nH4NHEICYWcjoQg3hs3@dpg-d57d7apr0fns73fkds5g-a.oregon-postgres.render.com/smarthome_backend",
  ssl: {
    rejectUnauthorized: false, // Required for Render Postgres
  },
});

pool.on("connect", () => {
  console.log("Connected to the database successfully!");
});

module.exports = pool;
