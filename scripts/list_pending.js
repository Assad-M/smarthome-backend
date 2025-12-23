const db = require('../db');

(async () => {
  try {
    const res = await db.query("SELECT id, user_id, service_id, booking_date, status FROM bookings WHERE status = 'pending' ORDER BY id");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('DB error:', err.message || err);
    process.exit(1);
  }
})();
