import env from '@/config/environment';

const PUSH_SERVER_URL = env.pushServerUrl;

interface NotificationData {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

class PushNotificationService {
  async sendNotification({ token, title, body, data = {} }: NotificationData) {
    try {
      const response = await fetch(`${PUSH_SERVER_URL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          title,
          body,
          data,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Push notification sent successfully');
        return true;
      } else {
        console.error('Failed to send push notification:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  async sendMessageNotification(
    recipientToken: string,
    senderName: string,
    messageText: string,
    chatType: 'relationship' | 'friendship' | 'connection'
  ) {
    return this.sendNotification({
      token: recipientToken,
      title: senderName,
      body: messageText,
      data: {
        type: 'message',
        chatType,
        senderName,
      },
    });
  }

  async sendConnectionRequestNotification(
    recipientToken: string,
    senderName: string
  ) {
    return this.sendNotification({
      token: recipientToken,
      title: '🤝 New Connection Request',
      body: `${senderName} wants to connect with you!`,
      data: {
        type: 'connection_request',
        senderName,
      },
    });
  }

  async sendInvitationNotification(
    recipientToken: string,
    senderName: string,
    invitationType: 'relationship' | 'friendship'
  ) {
    const emoji = invitationType === 'relationship' ? '💕' : '💙';
    const typeText = invitationType === 'relationship' ? 'relationship' : 'friendship';
    
    return this.sendNotification({
      token: recipientToken,
      title: `${emoji} ${invitationType === 'relationship' ? 'Relationship' : 'Friendship'} Invitation`,
      body: `${senderName} invited you to be in a ${typeText}!`,
      data: {
        type: 'invitation',
        invitationType,
        senderName,
      },
    });
  }
}

export default new PushNotificationService();