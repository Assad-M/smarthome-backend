// Test script to verify notification creation when accepting/starting/completing bookings
const axios = require('axios');

// Test tokens (from earlier conversation)
const providerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJwcm92aWRlciIsImlhdCI6MTczNzU0MDQzNiwiZXhwIjoxNzM3NjI2ODM2fQ.KcKpcElfGTw5JLOv7hfOZ1jxVjkOa4NTbJ3l5A0HnA';
const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzM3NTQwNzMzLCJleHAiOjE3Mzc2MjcxMzN9.GHKv7pJ9OLJlQw8bT0LZxYm1k6R4Nm2pF5sJ7xK9vM';

const api = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 5000
});

async function runTests() {
    console.log('🧪 Testing Notification Flow...\n');

    try {
        // 1. Get initial notifications for user 1
        console.log('1️⃣ Fetching initial notifications for user 1...');
        let response = await api.get('/api/notifications', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        console.log('Status:', response.status);
        console.log('Notifications:', response.data);
        const initialCount = response.data ? response.data.length : 0;
        console.log(`Initial notification count: ${initialCount}\n`);

        // 2. Get pending bookings for provider (to find a booking to accept)
        console.log('2️⃣ Fetching pending bookings for provider...');
        response = await api.get('/api/provider/pending', {
            headers: { 'Authorization': `Bearer ${providerToken}` }
        });
        console.log('Status:', response.status);
        console.log('Pending bookings:', response.data);
        
        if (!response.data || response.data.length === 0) {
            console.log('❌ No pending bookings found! Cannot test notification flow.');
            return;
        }

        const bookingId = response.data[0].id;
        console.log(`Using booking ID: ${bookingId}\n`);

        // 3. Accept the booking
        console.log(`3️⃣ Accepting booking ${bookingId}...`);
        response = await api.patch(`/api/provider/${bookingId}/accept`, {}, {
            headers: { 'Authorization': `Bearer ${providerToken}` }
        });
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        console.log('');

        // 4. Check notifications after accept
        console.log('4️⃣ Checking notifications after accept...');
        response = await api.get('/api/notifications', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        console.log('Status:', response.status);
        console.log('Notifications:', response.data);
        console.log(`Notification count after accept: ${response.data.length}`);
        if (response.data.length > initialCount) {
            console.log('✅ Notification created after accept!\n');
        } else {
            console.log('❌ No new notification after accept\n');
        }

        // 5. Start the booking
        console.log(`5️⃣ Starting booking ${bookingId}...`);
        response = await api.patch(`/api/provider/${bookingId}/start`, {}, {
            headers: { 'Authorization': `Bearer ${providerToken}` }
        });
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        console.log('');

        // 6. Check notifications after start
        console.log('6️⃣ Checking notifications after start...');
        response = await api.get('/api/notifications', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        console.log('Status:', response.status);
        console.log('Notifications:', response.data);
        console.log(`Notification count after start: ${response.data.length}`);
        if (response.data.length > initialCount + 1) {
            console.log('✅ Notification created after start!\n');
        } else {
            console.log('❌ No new notification after start\n');
        }

        // 7. Complete the booking
        console.log(`7️⃣ Completing booking ${bookingId}...`);
        response = await api.patch(`/api/provider/${bookingId}/complete`, {}, {
            headers: { 'Authorization': `Bearer ${providerToken}` }
        });
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        console.log('');

        // 8. Check notifications after complete
        console.log('8️⃣ Checking notifications after complete...');
        response = await api.get('/api/notifications', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        console.log('Status:', response.status);
        console.log('Notifications:', response.data);
        console.log(`Notification count after complete: ${response.data.length}`);
        if (response.data.length > initialCount + 2) {
            console.log('✅ Notification created after complete!\n');
        } else {
            console.log('❌ No new notification after complete\n');
        }

        console.log('🎉 Test complete!');

    } catch (err) {
        console.error('❌ Error:', err.response?.status || err.message);
        if (err.response?.data) {
            console.error('Response:', err.response.data);
        }
    }
}

runTests();
