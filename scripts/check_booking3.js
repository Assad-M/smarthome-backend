const db = require('../db');

(async () => {
  try {
    const res = await db.query('SELECT id, provider_id, status FROM bookings WHERE id = $1', [3]);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('DB_ERROR', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
