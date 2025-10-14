const admin = require("firebase-admin");

const serviceAccount = {
  type: "service_account",
  project_id: "sid-clinic",
  private_key_id: "4d5a80081a8573ba0ed6213e24e47a5e7b57cf4d",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC0LD+Mi4JGlPg/\nudAF+tromM0owgrowWz7DD48e2/z6FJo7JNUd9PDNRCow0tVxBv/stgWHq12EmVf\nuJmykWJP5JRXLJ+46k1M3avdirF3T5tbtgSW4qDkWupkoFjJNKSMlVzbc6JX0HoZ\nmUrpgNnZW8ojFXX7rruE3sQ5UyFNC2zH//80+DLoHmfshUWATcQcF7sH/oS5cfNs\n0dmc4HNOpGzhI+jiQLgREYP0+Lk/wQlhgXYCZeNRSdSF9LtIxVuR9796Y+Cvnvxp\n8xjm9lyRRWN2BG2AYtmwIKYvj4CaqpWqu7ObXmwyJBlQCi5Di2LKNAO8kwTBtics\nN7uOWEJPAgMBAAECggEAU71tG+mLdzqt1xCJuv3I2OqMEDF/2IZuHJCoLHxCoF6O\nTu4F2/CFn+j+ATIjxY0MZl+9Ryqi/Im4TDEEXpZr1y4qNAotgkiD/QHaa3GW4hlB\n3/JNV8Ole/01i+dq3Ll28VBKhETOY3omBdfVlYmptviOjpfe6kdgKHVRRkN46tFo\npdFEz/bDAZszjGqKc67NZ2Jhgg+H2cF6lmnBHWhHZQDttLMmDgw+/IbfmfWHC88E\nwpruhQ4l7tj9eVtVUFuI04Pswdbi/OZHRLR6b0eps3y33T0yteUBUF+VgWSTlkUk\n6FvGKdNXEvJ4L/WZYembzaPNWwGs4B3QLEK0cgbIwQKBgQDihJRaCbAeSVeTo/uH\nIuwhYdCDnlrv5ZaYdkrsYTDW9qTqvbvTbddm3ECw25AKUVFs7+HQl2WZsPgfm5Wx\n+dm6aEsMQlnNu2kF0yxi01HzY6mIznWpYL8B48GCOdDdPns8QewRa6WucctG1iHu\n0ONoVTf4alxIdIHgowLoVJlfhwKBgQDLn3vTr5JIqFbWo8sBYU3b9eJsMGEJGdaL\niq2XWLhYOSJY6Lx5oDrQpSamYWisxMQfIu1CphiAPzTK6l1Mpb+L7J5GlbOitKmS\n2nN7C7lyh/QKCgyQhx5AktgMUYECI3cp9kTwTQYWniUGOi+1SFb6fzUrXnV3rCbt\nQ1udOqjo+QKBgGBKQZIAukg1ny/YrmyksMIEBZJdt4RxEVJgPrs7GXrXwAU1gGmB\nMOa9zBYiT5nDNZzcYB6+rObnbqJpDfppHl/6Q6TDc89b0moyeZTNBfIztHa+ZRAK\nW0ffXHwSPbI/BD36O/Kv0u9T2jiTgDs3uuO4DiHgfLgkJq2qPesrQ0NzAoGABofo\n+tMox/fOQTgjrLmoO6PZTUsH8bjIbtVV2ALadsnuVhew493FxSdm4/M/3jq5Z55B\nKeAV7RcZ5GA7+ddfG2fNc8odZtyQi8tB5PJtUkUWCLRlzsTmrX+IOmzqzFzC16+0\naliuF0+fNGHtYc0eLQ6jb+6pqdr1rKp6Z8KX5FECgYEAn922m1+06v8AH5owDA0c\ndf7Kwasd6rk+5IuqDKWDqCOdt9UkkZ0hF1MpQBXDfueBGoZNKsCcCXyYSffJNhHo\nhAFNCcZ3uyRR4WKf2XX1dTD1sfoAfZ1LRaMILQIw9pcvs/91wpipAs0D3XrdO0JS\nnAHP3rEXbw1he861QS4h2EE=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@sid-clinic.iam.gserviceaccount.com",
  client_id: "103078810496129020209",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sid-clinic.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Send push notification via FCM
 * @param {string} fcmToken
 * @param {string} title
 * @param {string} body
 * @param {object} data
 * @returns {Promise}
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) {
    console.warn("No FCM token provided");
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      notification_type: "system",
      sound: "default",
      priority: "high",
    },
    token: fcmToken,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        priority: "high",
        default_sound: true,
        default_vibrate_timings: true,
        default_light_settings: true,
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  try {
    console.log(`[DEBUG] Sending FCM notification to token: ${fcmToken.substring(0, 20)}...`);
    console.log(`[DEBUG] Message payload:`, JSON.stringify(message, null, 2));
    
    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending notification:", error);
    
    // Handle invalid/expired tokens
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      console.warn(`⚠️ Invalid FCM token detected: ${fcmToken.substring(0, 20)}...`);
      console.warn("   This token should be removed from the database");
      
      // Return a special response instead of throwing
      return {
        success: false,
        error: 'Invalid FCM token',
        shouldRemoveToken: true
      };
    }
    
    throw error;
  }
};

/**
 * Send notification to user and store in database
 * @param {number} userId
 * @param {string} title
 * @param {string} message
 * @param {object} options
 * @returns {Promise}
 */
const sendUserNotification = async (userId, title, message, options = {}) => {
  const { User, Notification } = require("../models");

  try {
    // Get user with FCM token
    const user = await User.findByPk(userId);
    if (!user) {
      console.warn(`User ${userId} not found`);
      return;
    }

    // Store notification in database
    const notification = await Notification.create({
      userId,
      title,
      message,
      type: options.type || "appointment",
      relatedId: options.relatedId,
      data: options.data,
    });

    // Send push notification if enabled and token exists
    if (user.notificationEnabled && user.fcmToken) {
      const pushResult = await sendPushNotification(user.fcmToken, title, message, {
        notificationId: notification.id.toString(),
        ...options.data,
      });
      
      // If token is invalid, remove it from user record
      if (pushResult && pushResult.shouldRemoveToken) {
        console.log(`🗑️ Removing invalid FCM token for user ${userId}`);
        await user.update({ fcmToken: null });
      }
    }

    return notification;
  } catch (error) {
    console.error("Error in sendUserNotification:", error);
    throw error;
  }
};

module.exports = {
  sendPushNotification,
  sendUserNotification,
};
