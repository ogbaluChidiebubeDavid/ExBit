const https = require('https');

const testTransfer = () => {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      account_bank: "100004",
      account_number: "8148463933",
      amount: 100,
      currency: "NGN",
      narration: "ExBit - IP Test",
      reference: "ip-test-" + Date.now(),
      debit_currency: "NGN"
    });

    const options = {
      hostname: 'api.flutterwave.com',
      path: '/v3/transfers',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(responseData) }));
    });
    req.on('error', resolve);
    req.write(data);
    req.end();
  });
};

(async () => {
  console.log('Testing Flutterwave with IP: 136.117.70.64\n');
  
  const result = await testTransfer();
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.body, null, 2));
  
  if (result.status === 200 && result.body.status === 'success') {
    console.log('\n✅ SUCCESS! Transfer is working!');
    console.log('Transfer ID:', result.body.data.id);
    console.log('Reference:', result.body.data.reference);
    console.log('\nYour ExBit app should work now!');
  } else if (result.body.message && result.body.message.includes('administrator')) {
    console.log('\n❌ Still restricted. Wait a few minutes for IP whitelist to take effect.');
    console.log('Or double-check you whitelisted: 136.117.70.64');
  } else {
    console.log('\n⚠️  Unexpected response');
  }
})();
