const db = require('./db');

(async () => {
    const r = await db.query('SELECT * FROM bookings WHERE status = $1', ['pending']);
    console.log('Pending bookings:', r.rows.length);
    r.rows.slice(0, 3).forEach(b => console.log(`  - ID: ${b.id}, User: ${b.user_id}, Service: ${b.service_id}, Date: ${b.booking_date}`));
    process.exit(0);
})();
