const token = process.argv[2];
const title = process.argv[3] || 'Test Notification';
const body = process.argv[4] || 'This is a test notification from Fuzzy!';

if (!token) {
  console.log('Usage: node send-test.js <token> [title] [body]');
  console.log('Example: node send-test.js "ExponentPushToken[xxx]" "Hello" "Test message"');
  process.exit(1);
}

const data = {
  token: token,
  title: title,
  body: body,
  data: {
    type: 'test',
    timestamp: new Date().toISOString()
  }
};

console.log('Sending notification to:', token);
console.log('Title:', title);
console.log('Body:', body);

fetch('http://localhost:3000/send-notification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data)
})
.then(res => res.json())
.then(result => {
  console.log('\nResult:', JSON.stringify(result, null, 2));
  if (result.success) {
    console.log('✅ Notification sent successfully!');
  } else {
    console.log('❌ Failed to send notification');
  }
})
.catch(err => {
  console.error('Error:', err);
});