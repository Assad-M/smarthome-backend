// Test script to verify notification creation when accepting/starting/completing bookings

const http = require('http');

// Test tokens (from earlier conversation)
const providerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJwcm92aWRlciIsImlhdCI6MTczNzU0MDQzNiwiZXhwIjoxNzM3NjI2ODM2fQ.KcKpcElfGTw5JLOv7hfOZ1jxVjkOa4NTbJ3l5A0HnA';
const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzM3NTQwNzMzLCJleHAiOjE3Mzc2MjcxMzN9.GHKv7pJ9OLJlQw8bT0LZxYm1k6R4Nm2pF5sJ7xK9vM';

function makeRequest(method, path, token, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        body: data ? JSON.parse(data) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        body: data
                    });
                }
            });
        });

        req.on('error', (err) => {
            console.error('Request error:', err.message);
            reject(err);
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Notification Flow...\n');

    try {
        // 1. Get initial notifications for user 1
        console.log('1️⃣ Fetching initial notifications for user 1...');
        let result = await makeRequest('GET', '/api/notifications', userToken);
        console.log('Status:', result.status);
        console.log('Notifications:', result.body);
        const initialCount = result.body ? result.body.length : 0;
        console.log(`Initial notification count: ${initialCount}\n`);

        // 2. Get pending bookings for provider (to find a booking to accept)
        console.log('2️⃣ Fetching pending bookings for provider...');
        result = await makeRequest('GET', '/api/provider/pending', providerToken);
        console.log('Status:', result.status);
        console.log('Pending bookings:', result.body);
        
        if (!result.body || result.body.length === 0) {
            console.log('❌ No pending bookings found! Cannot test notification flow.');
            return;
        }

        const bookingId = result.body[0].id;
        console.log(`Using booking ID: ${bookingId}\n`);

        // 3. Accept the booking
        console.log(`3️⃣ Accepting booking ${bookingId}...`);
        result = await makeRequest('PATCH', `/api/provider/${bookingId}/accept`, providerToken);
        console.log('Status:', result.status);
        console.log('Response:', result.body);
        console.log('');

        // 4. Check notifications after accept
        console.log('4️⃣ Checking notifications after accept...');
        result = await makeRequest('GET', '/api/notifications', userToken);
        console.log('Status:', result.status);
        console.log('Notifications:', result.body);
        console.log(`Notification count after accept: ${result.body.length}`);
        if (result.body.length > initialCount) {
            console.log('✅ Notification created after accept!\n');
        } else {
            console.log('❌ No new notification after accept\n');
        }

        // 5. Start the booking
        console.log(`5️⃣ Starting booking ${bookingId}...`);
        result = await makeRequest('PATCH', `/api/provider/${bookingId}/start`, providerToken);
        console.log('Status:', result.status);
        console.log('Response:', result.body);
        console.log('');

        // 6. Check notifications after start
        console.log('6️⃣ Checking notifications after start...');
        result = await makeRequest('GET', '/api/notifications', userToken);
        console.log('Status:', result.status);
        console.log('Notifications:', result.body);
        console.log(`Notification count after start: ${result.body.length}`);
        if (result.body.length > initialCount + 1) {
            console.log('✅ Notification created after start!\n');
        } else {
            console.log('❌ No new notification after start\n');
        }

        // 7. Complete the booking
        console.log(`7️⃣ Completing booking ${bookingId}...`);
        result = await makeRequest('PATCH', `/api/provider/${bookingId}/complete`, providerToken);
        console.log('Status:', result.status);
        console.log('Response:', result.body);
        console.log('');

        // 8. Check notifications after complete
        console.log('8️⃣ Checking notifications after complete...');
        result = await makeRequest('GET', '/api/notifications', userToken);
        console.log('Status:', result.status);
        console.log('Notifications:', result.body);
        console.log(`Notification count after complete: ${result.body.length}`);
        if (result.body.length > initialCount + 2) {
            console.log('✅ Notification created after complete!\n');
        } else {
            console.log('❌ No new notification after complete\n');
        }

        console.log('🎉 Test complete!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

runTests();
