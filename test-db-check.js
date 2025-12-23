const db = require('./db');

const providerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJwcm92aWRlciIsImlhdCI6MTczNzU0MDQzNiwiZXhwIjoxNzM3NjI2ODM2fQ.KcKpcElfGTw5JLOv7hfOZ1jxVjkOa4NTbJ3l5A0HnA';

const http = require('http');

function request(method, path, token) {
    return new Promise((resolve, reject) => {
        const opts = { hostname: 'localhost', port: 5000, path, method, headers: { 'Authorization': `Bearer ${token}` } };
        const req = http.request(opts, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

(async () => {
    try {
        // Step 1: Get pending bookings
        console.log('1. Getting pending bookings...');
        const pendingRes = await request('GET', '/api/provider/pending', providerToken);
        if (!pendingRes.data || !pendingRes.data.length) {
            console.log('❌ No pending bookings');
            process.exit(0);
        }
        const bookingId = pendingRes.data[0].id;
        const userId = pendingRes.data[0].id; // Placeholder - we'll get user_id from booking
        console.log(`✅ Found booking ${bookingId}\n`);
        
        // Step 2: Get current notification count for user 1
        console.log('2. Getting current notification count...');
        const beforeRes = await db.query('SELECT COUNT(*) FROM notifications WHERE user_id=$1', [1]);
        const countBefore = parseInt(beforeRes.rows[0].count);
        console.log(`✅ Current count: ${countBefore}\n`);
        
        // Step 3: Accept the booking
        console.log(`3. Accepting booking ${bookingId}...`);
        const acceptRes = await request('PATCH', `/api/provider/${bookingId}/accept`, providerToken);
        console.log(`Status: ${acceptRes.status}`);
        console.log(`Response: ${JSON.stringify(acceptRes.data)}\n`);
        
        // Step 4: Check notification count after accept
        console.log('4. Checking notification count after accept...');
        const afterRes = await db.query('SELECT COUNT(*) FROM notifications WHERE user_id=$1', [1]);
        const countAfter = parseInt(afterRes.rows[0].count);
        console.log(`✅ Count after: ${countAfter}`);
        if (countAfter > countBefore) {
            console.log(`✅ NEW NOTIFICATION CREATED! (was ${countBefore}, now ${countAfter})\n`);
            
            // Show the new notification
            const notifRes = await db.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [1]);
            console.log('Latest notification:');
            console.log(notifRes.rows[0]);
        } else {
            console.log(`❌ NO NEW NOTIFICATION (still ${countAfter})\n`);
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
