const db = require('./db');

async function testQuery() {
  try {
    console.log('Testing pending bookings query...');
    const result = await db.query(
      `SELECT b.id, u.name AS customer_name, s.name AS service_name,
              b.booking_date, b.status
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN services s ON s.id = b.service_id
       WHERE b.status = 'pending'
       ORDER BY b.booking_date ASC`
    );
    console.log('Query successful, found', result.rows.length, 'pending bookings');
    console.log('Results:', result.rows);
  } catch (err) {
    console.error('Query failed:', err.message);
  }
}

testQuery();
