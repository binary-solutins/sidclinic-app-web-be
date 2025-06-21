const admin = require("firebase-admin");

const serviceAccount = {
  type: "service_account",
  project_id: "sid-clinic",
  private_key_id: "afdd80118995347457191ab618c401a5c6eabd06",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCrmyvm0/h533OF\nvMeL1Y/5D+68JBULRiiyitdmYLYsvk2GBs7ZsjHqs3pfLf67BH/imZAzw/6pFOK5\nfPVHOhKh1nAHgPl/5WxqioHR78TFDqFtrKQbQGpGtmh1/5cKcYcMKtoUR1a6HAbL\nF+d7vCO1gh7++qJqPbFjBOJaf12aI5kUNPcptf7Yxbb4YzsNSqc7V5j/ObNKN4pv\nlYp68KUwCqCBOyRzKwAXc36r68Q9drdJs65av5p6lJ8efRDRtMmThSM2MZ06S+Uv\nhq+DjzzQxp3T2FxHjhz/2UDW4lVYCFVc6X/Mz5yPAu32IM312xoEK00Ln9chQ61+\njN7sRplJAgMBAAECggEAO5r4u0L6Jf7GxfelyfzCdsyhbCkORC242hcerTk/Xbg1\n/i0kMPpTm0V+5kt4FKaB8wfKzigwLrOJ8sqj+XsC2MK+g+S5BMMADtuQLwbcrmOg\nD5OtJqgPogMesom2AVMgiMnjmLKUva0ZcPabGV/meVe6g28z9bn7AL1EEBH4RZ6w\nbr9UHvOLlWF9KiC9ayhQEzd8VPvFiP1XCgjyAhUc5oZs9ASf5mGSM3g/Qjo7lvqr\ntGXpI8V0ufYF+W30R4jWPMEd0g3s0cP/ndecu7kKLT300bQL42BRnXPAdW0o5dc6\nskKZEriqdZ0f0x70++JqN2qDN63mvTxWPwymHpiv7wKBgQDnXBvkShqqgNIfC0eU\n0+HqdF+Jpane+1Gc/rSF8JB3rFCqT/XEVine5XlVIrCaHQz8ih78pwbrSCCYwMbl\nKFdw7sDcROfEEDmHnK6bWDAosLtktnUB9BJ79lICeiv5/CfTYisLUStvFgohwm1m\nqychK4k991KSbbPcfdWc3f8OgwKBgQC94endO29IqOOC1Td/69kVREFT3HzKHcbW\nYGunOdXoUlAoq809fJAIWLhy6U5xQAGEA1CMUtugPaEG2aTmXQfVbGRL8fMAfV4q\nVpoVfiDQ2/bYMzCr30wjESBjVOUdSUNnwPVVBLvgbw1Id+NgyDi5ppuhWWV4iHRo\n8bQaAulvQwKBgQDhaVCTf8+zR4dxT6ASVM3LjE544bs70UiW2WIxDUz0DCMbjIQ7\nImfxD0rDs+S0gpFgi4HdTy7ilYeMzGX8Zu2qzjOBaHEXCWfDxNgp6iYhvu8VFN+z\nY4WO2VLVrwqhqRd0UDT39cGHncWJVtEYMrERFEXG5ezBVbjjnoY9K92Q2QKBgQCh\nIRzwJChZ8x8k/cPb5IpRNpttC3RFmyEI98dCn5x6SadF7Av8+j/LJWZX9M0g4xym\nJp3qhcFjaAjGJFh/N0CXhiRSId2Ac+I9cUHNrTsxoQcGDeJmZtVYCIeAYyENSgdN\n+vr0i1DWscYG0d18WktwlwYH1DF8J+cIytp3HDN0uwKBgQCQ0pGcGOQ+RYB+S98O\n63nyLNu/7fsbZYgd6/jA0MHv12dEW4OZGMzaRureOTrZVpXhycuqMx6RpszN+X0X\n60CAqsyvHKgHFQ7rVEELMnKsmRJ7frjZ/FUoAASCoJvYUEB2MB96++7yyc42oubh\nuciQCxsTjnlId32jWnacvgS1ng==\n-----END PRIVATE KEY-----\n",
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
