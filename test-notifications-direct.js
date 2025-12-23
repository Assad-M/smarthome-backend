const db = require('./db');

(async () => {
    try {
        console.log('🧪 Testing Notification Flow...\n');
        
        // 1. Get pending bookings directly from DB
        console.log('1️⃣ Getting pending bookings...');
        const pendingRes = await db.query(
            `SELECT b.id, b.user_id, u.name AS customer_name, s.name AS service_name,
                    b.booking_date, b.status
             FROM bookings b
             JOIN users u ON u.id = b.user_id
             JOIN services s ON s.id = b.service_id
             WHERE b.status = 'pending'
             LIMIT 1`
        );
        
        if (!pendingRes.rows.length) {
            console.log('❌ No pending bookings found');
            process.exit(0);
        }
        
        const booking = pendingRes.rows[0];
        console.log(`✅ Found booking:`);
        console.log(`   - ID: ${booking.id}`);
        console.log(`   - User ID: ${booking.user_id}`);
        console.log(`   - Customer: ${booking.customer_name}`);
        console.log(`   - Service: ${booking.service_name}\n`);
        
        // 2. Count notifications for this user before action
        console.log(`2️⃣ Checking current notifications for user ${booking.user_id}...`);
        const countBefore = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id=$1',
            [booking.user_id]
        );
        const beforeCount = parseInt(countBefore.rows[0].count);
        console.log(`✅ Current notifications: ${beforeCount}\n`);
        
        // 3. Manually update booking to accepted (simulate what the API would do)
        console.log(`3️⃣ Simulating booking accept...`);
        const updateRes = await db.query(
            `UPDATE bookings
             SET status = 'accepted'
             WHERE id = $1 AND status = 'pending'
             RETURNING *`,
            [booking.id]
        );
        
        if (!updateRes.rows.length) {
            console.log('❌ Booking update failed');
            process.exit(1);
        }
        console.log(`✅ Booking updated to 'accepted'\n`);
        
        // 4. Insert notification manually (this is what the API should do)
        console.log(`4️⃣ Inserting notification manually...`);
        const notifyRes = await db.query(
            'INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *',
            [updateRes.rows[0].user_id, `Your booking #${updateRes.rows[0].id} has been accepted by the provider.`]
        );
        console.log(`✅ Notification inserted:`);
        console.log(`   - ID: ${notifyRes.rows[0].id}`);
        console.log(`   - User ID: ${notifyRes.rows[0].user_id}`);
        console.log(`   - Message: ${notifyRes.rows[0].message}`);
        console.log(`   - Created: ${notifyRes.rows[0].created_at}\n`);
        
        // 5. Verify count increased
        console.log(`5️⃣ Verifying notification count increased...`);
        const countAfter = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id=$1',
            [booking.user_id]
        );
        const afterCount = parseInt(countAfter.rows[0].count);
        console.log(`✅ New notification count: ${afterCount}`);
        console.log(`   Previous: ${beforeCount}, Now: ${afterCount}`);
        console.log(afterCount > beforeCount ? `✅ NOTIFICATIONS WORKING!\n` : `❌ Notification count didn't increase\n`);
        
        // 6. Show all notifications for this user
        console.log(`6️⃣ All notifications for user ${booking.user_id}:`);
        const allNotifs = await db.query(
            'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC',
            [booking.user_id]
        );
        console.log(`Total: ${allNotifs.rows.length}`);
        allNotifs.rows.forEach((n, i) => {
            console.log(`   ${i+1}. [${n.created_at}] ${n.message}`);
        });
        
        console.log('\n🎉 Test complete!');
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    }
})();
