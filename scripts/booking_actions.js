require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '24h' });
const base = 'http://127.0.0.1:5000';

async function run() {
  console.log('Using token:', token);
  for (const action of ['accept', 'start', 'complete']) {
    const url = `${base}/api/provider/2/${action}`;
    console.log('\nPATCH', url);
    try {
      const res = await fetch(url, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const text = await res.text();
      console.log('Status:', res.status);
      try { console.log('Body:', JSON.parse(text)); } catch { console.log('Body:', text); }
    } catch (err) {
      console.error('Request error:', err.message || err);
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
