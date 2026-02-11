const https = require('https');

const options = {
  hostname: 'www.myeasypass.net',
  path: '/api/stripe/prices',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
    try {
      const parsed = JSON.parse(data);
      console.log('\nParsed - Total prices:', parsed.length);
      if (parsed.length > 0) {
        console.log('First price:', JSON.stringify(parsed[0], null, 2));
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
