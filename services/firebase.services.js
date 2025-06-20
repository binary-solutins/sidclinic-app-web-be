const admin = require("firebase-admin");
// const serviceAccount = require("../config/firebase-service-account.json");

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}"
);

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
    },
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending notification:", error);
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
      await sendPushNotification(user.fcmToken, title, message, {
        notificationId: notification.id.toString(),
        ...options.data,
      });
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
