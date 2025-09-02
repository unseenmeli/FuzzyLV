// Test notification sender - just run: node test.js
// 
// CHANGE THIS TO YOUR TOKEN (get it from the app's Profile screen or console logs)
const TOKEN = 'ExponentPushToken[dpPKRFJEd4o5YgWFKI7Or_]';

const data = {
  token: TOKEN,
  title: 'Hello from Fuzzy!',
  body: 'This is your first push notification',
  data: {
    type: 'test',
    timestamp: new Date().toISOString()
  }
};

console.log('Sending notification to:', TOKEN);

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