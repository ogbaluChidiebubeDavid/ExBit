const https = require('https');

console.log('=== VERIFICATION CHECKLIST ===\n');
console.log('Please confirm you did these steps:\n');
console.log('1. Logged into https://dashboard.flutterwave.com');
console.log('2. Went to: Settings → API Settings → IP Whitelist');
console.log('3. Added IP: 136.117.70.64');
console.log('4. Clicked the SAVE button');
console.log('5. Saw a confirmation message\n');
console.log('If you did all of this, wait 5-10 minutes for it to take effect.\n');
console.log('=== CURRENT STATUS ===\n');

// Check current IP
https.get('https://api.ipify.org?format=json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const ip = JSON.parse(data);
    console.log('Your server IP:', ip.ip);
    console.log('IP to whitelist:', '136.117.70.64');
    console.log('Match:', ip.ip === '136.117.70.64' ? '✅ Yes' : '❌ No');
  });
});
