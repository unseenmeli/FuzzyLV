const express = require('express');
const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();
const app = express();
app.use(express.json());

// Store push tokens (in production, use a database)
const pushTokens = new Set();

// Endpoint to register push tokens
app.post('/register-token', (req, res) => {
  const { token, userId } = req.body;
  
  if (!Expo.isExpoPushToken(token)) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }
  
  // Store the token (in production, associate with user in database)
  pushTokens.add(token);
  console.log(`Registered push token for user ${userId}: ${token}`);
  
  res.json({ success: true });
});

// Endpoint to send a notification
app.post('/send-notification', async (req, res) => {
  const { token, title, body, data } = req.body;
  
  if (!Expo.isExpoPushToken(token)) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }
  
  const messages = [{
    to: token,
    sound: 'default',
    title: title || 'New Notification',
    body: body || 'You have a new message',
    data: data || {},
    badge: 1,
  }];
  
  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }
    
    res.json({ success: true, tickets });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Endpoint to broadcast to all registered tokens
app.post('/broadcast', async (req, res) => {
  const { title, body, data } = req.body;
  
  const messages = Array.from(pushTokens).map(token => ({
    to: token,
    sound: 'default',
    title: title || 'Broadcast Message',
    body: body || 'This is a broadcast notification',
    data: data || {},
    badge: 1,
  }));
  
  if (messages.length === 0) {
    return res.json({ success: true, message: 'No tokens to send to' });
  }
  
  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }
    
    res.json({ success: true, count: messages.length, tickets });
  } catch (error) {
    console.error('Error broadcasting:', error);
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    status: 'Server running',
    registeredTokens: pushTokens.size 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Push notification server running on port ${PORT}`);
  console.log(`Test at: http://localhost:${PORT}/test`);
});