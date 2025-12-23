const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2NTExNzEwMSwiZXhwIjoxNzY1MTIwNzAxfQ.orfPJoPHH1WtHgwMXRkB8dB4MpkVLxztmo_aphhrCXw';

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/booking/test-auth',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.end();
