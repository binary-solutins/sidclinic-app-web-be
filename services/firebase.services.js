const admin = require("firebase-admin");

// Handle time synchronization issues in production
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      return admin.apps[0];
    }

    let serviceAccount;

    // Try to use environment variables first (recommended for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("Using Firebase service account from environment variable");
      } catch (error) {
        console.error(
          "Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:",
          error.message
        );
      }
    }

    // Fallback to hardcoded service account (for development)
    if (!serviceAccount) {
      serviceAccount = {
        type: "service_account",
        project_id: "sid-clinic",
        private_key_id: "dfc3994b66d5c5c1d599465bc3be92f17e0bcf56",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCrmyvm0/h533OF\nvMeL1Y/5D+68JBULRiiyitdmYLYsvk2GBs7ZsjHqs3pfLf67BH/imZAzw/6pFOK5\nfPVHOhKh1nAHgPl/5WxqioHR78TFDqFtrKQbQGpGtmh1/5cKcYcMKtoUR1a6HAbL\nF+d7vCO1gh7++qJqPbFjBOJaf12aI5kUNPcptf7Yxbb4YzsNSqc7V5j/ObNKN4pv\nlYp68KUwCqCBOyRzKwAXc36r68Q9drdJs65av5p6lJ8efRDRtMmThSM2MZ06S+Uv\nhq+DjzzQxp3T2FxHjhz/2UDW4lVYCFVc6X/Mz5yPAu32IM312xoEK00Ln9chQ61+\njN7sRplJAgMBAAECggEAO5r4u0L6Jf7GxfelyfzCdsyhbCkORC242hcerTk/Xbg1\n/i0kMPpTm0V+5kt4FKaB8wfKzigwLrOJ8sqj+XsC2MK+g+S5BMMADtuQLwbcrmOg\nD5OtJqgPogMesom2AVMgiMnjmLKUva0ZcPabGV/meVe6g28z9bn7AL1EEBH4RZ6w\nbr9UHvOLlWF9KiC9ayhQEzd8VPvFiP1XCgjyAhUc5oZs9ASf5mGSM3g/Qjo7lvqr\ntGXpI8V0ufYF+W30R4jWPMEd0g3s0cP/ndecu7kKLT300bQL42BRnXPAdW0o5dc6\nskKZEriqdZ0f0x70++JqN2qDN63mvTxWPwymHpiv7wKBgQDnXBvkShqqgNIfC0eU\n0+HqdF+Jpane+1Gc/rSF8JB3rFCqT/XEVine5XlVIrCaHQz8ih78pwbrSCCYwMbl\nKFdw7sDcROfEEDmHnK6bWDAosLtktnUB9BJ79lICeiv5/CfTYisLUStvFgohwm1m\nqychK4k991KSbbPcfdWc3f8OgwKBgQC94endO29IqOOC1Td/69kVREFT3HzKHcbW\nYGunOdXoUlAoq809fJAIWLhy6U5xQAGEA1CMUtugPaEG2aTmXQfVbGRL8fMAfV4q\nVpoVfiDQ2/bYMzCr30wjESBjVOUdSUNnwPVVBLvgbw1Id+NgyDi5ppuhWWV4iHRo\n8bQaAulvQwKBgQDhaVCTf8+zR4dxT6ASVM3LjE544bs70UiW2WIxDUz0DCMbjIQ7\nImfxD0rDs+S0gpFgi4HdTy7ilYeMzGX8Zu2qzjOBaHEXCWfDxNgp6iYhvu8VFN+z\nY4WO2VLVrwqhqRd0UDT39cGHncWJVtEYMrERFEXG5ezBVbjjnoY9K92Q2QKBgQCh\nIRzwJChZ8x8k/cPb5IpRNpttC3RFmyEI98dCn5x6SadF7Av8+j/LJWZX9M0g4xym\nJp3qhcFjaAjGJFh/N0CXhiRSId2Ac+I9cUHNrTsxoQcGDeJmZtVYCIeAYyENSgdN\n+vr0i1DWscYG0d18WktwlwYH1DF8J+cIytp3HDN0uwKBgQCQ0pGcGOQ+RYB+S98O\n63nyLNu/7fsbZYgd6/jA0MHv12dEW4OZGMzaRureOTrZVpXhycuqMx6RpszN+X0X\n60CAqsyvHKgHFQ7rVEELMnKsmRJ7frjZ/FUoAASCoJvYUEB2MB96++7yyc42oubh\nuciQCxsTjnlId32jWnacvgS1ng==\n-----END PRIVATE KEY-----\n",
        client_email:
          "firebase-adminsdk-fbsvc@sid-clinic.iam.gserviceaccount.com",
        client_id: "103078810496129020209",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:
          "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sid-clinic.iam.gserviceaccount.com",
        universe_domain: "googleapis.com",
      };
      console.log(
        "Using hardcoded Firebase service account (development mode)"
      );
    }

    // Try different initialization methods
    let app;

    // Method 1: Try with service account
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Add timeout and retry options for production
        httpAgent: {
          timeout: 30000, // 30 seconds timeout
          keepAlive: true,
          keepAliveMsecs: 30000,
        },
      });
      console.log(
        "Firebase Admin SDK initialized successfully with service account"
      );
    } catch (error) {
      console.error(
        "Failed to initialize with service account:",
        error.message
      );

      // Method 2: Try with application default credentials (if available)
      try {
        console.log(
          "Attempting to initialize with application default credentials..."
        );
        app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        console.log(
          "Firebase Admin SDK initialized successfully with application default credentials"
        );
      } catch (adcError) {
        console.error(
          "Failed to initialize with application default credentials:",
          adcError.message
        );
        throw error; // Throw the original error
      }
    }

    return app;
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);

    // If it's a time synchronization error, provide specific guidance
    if (error.message && error.message.includes("Invalid JWT Signature")) {
      console.error(
        "This appears to be a time synchronization issue. Please ensure your server's clock is properly synchronized."
      );
      console.error(
        "On Render.com, you may need to contact support or use a different deployment strategy."
      );

      // In production, we might want to continue without Firebase
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "Continuing without Firebase initialization due to time synchronization issues"
        );
        return null;
      }
    }

    throw error;
  }
};

/**
 * Health check for Firebase connection
 * @returns {Promise<object>}
 */
const checkFirebaseHealth = async () => {
  try {
    // Check server time first
    const serverTime = new Date();
    const utcTime = serverTime.toISOString();
    const timeOffset = Math.abs(serverTime.getTime() - Date.now());

    console.log(`Server time check: ${utcTime}, offset: ${timeOffset}ms`);

    // Additional debugging information
    console.log("Firebase apps count:", admin.apps.length);
    console.log("Firebase project ID:", admin.apps[0]?.options?.projectId);
    console.log(
      "Firebase service account email:",
      admin.apps[0]?.options?.credential?.clientEmail
    );

    // Try to get a simple token to test the connection
    const token = await admin.app().options.credential.getAccessToken();
    console.log("Firebase health check passed");
    return {
      healthy: true,
      serverTime: utcTime,
      timeOffset: timeOffset,
      message: "Firebase connection is working properly",
      projectId: admin.apps[0]?.options?.projectId,
      serviceAccountEmail: admin.apps[0]?.options?.credential?.clientEmail,
    };
  } catch (error) {
    console.error("Firebase health check failed:", error.message);
    console.error("Full error details:", {
      name: error.name,
      code: error.code,
      status: error.status,
      details: error.details,
    });

    // Check if it's a time synchronization issue
    if (error.message && error.message.includes("Invalid JWT Signature")) {
      return {
        healthy: false,
        serverTime: new Date().toISOString(),
        timeOffset: 0,
        error: "Time synchronization issue detected",
        message:
          "Server clock may not be properly synchronized with NTP servers",
        recommendation:
          "Contact your hosting provider (Render.com) about time synchronization",
        workaround:
          "Notifications will still be stored in database, but push notifications may fail",
        errorDetails: {
          name: error.name,
          code: error.code,
          status: error.status,
        },
      };
    }

    return {
      healthy: false,
      serverTime: new Date().toISOString(),
      timeOffset: 0,
      error: error.message,
      message: "Firebase authentication failed",
      recommendation:
        "Check service account credentials and network connectivity",
      errorDetails: {
        name: error.name,
        code: error.code,
        status: error.status,
      },
    };
  }
};

// Initialize Firebase
initializeFirebase();

// Add debugging information
console.log("=== Firebase Debug Information ===");
console.log("Server time:", new Date().toISOString());
console.log("Environment:", process.env.NODE_ENV);
console.log("Firebase apps initialized:", admin.apps.length);
console.log(
  "Using environment variable for service account:",
  !!process.env.FIREBASE_SERVICE_ACCOUNT
);
console.log("===================================");

/**
 * Attempt to sync server time with external time server
 * @returns {Promise<boolean>}
 */
const attemptTimeSync = async () => {
  try {
    // Try to get time from multiple sources
    const timeSources = [
      "https://worldtimeapi.org/api/timezone/UTC",
      "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
      "https://httpbin.org/delay/0", // Simple ping to check connectivity
    ];

    for (const source of timeSources) {
      try {
        const response = await fetch(source, {
          method: "GET",
          timeout: 5000,
        });

        if (response.ok) {
          console.log(`Time sync check successful with ${source}`);
          return true;
        }
      } catch (error) {
        console.log(`Time sync check failed with ${source}:`, error.message);
      }
    }

    return false;
  } catch (error) {
    console.error("Time sync attempt failed:", error.message);
    return false;
  }
};

/**
 * Send push notification via FCM with retry logic
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
      // click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    token: fcmToken,
  };

  // Retry configuration
  const maxRetries = 3;
  const retryDelay = 2000; // Increased to 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await admin.messaging().send(message);
      console.log(
        `Notification sent successfully (attempt ${attempt}):`,
        response
      );
      return response;
    } catch (error) {
      console.error(
        `Error sending notification (attempt ${attempt}/${maxRetries}):`,
        error.message
      );

      // Check if it's a time synchronization error
      if (error.message && error.message.includes("Invalid JWT Signature")) {
        console.error(
          "Time synchronization issue detected. This is common in production environments."
        );

        if (attempt === maxRetries) {
          console.error(
            "Max retries reached. This appears to be a persistent time synchronization issue."
          );
          console.error(
            "Please check your server's clock synchronization or contact your hosting provider."
          );

          // In production, we might want to continue without failing the entire request
          if (process.env.NODE_ENV === "production") {
            console.warn(
              "Continuing without push notification due to Firebase authentication issues"
            );
            return {
              success: false,
              error:
                "Firebase authentication failed due to time synchronization issues",
              skipped: true,
            };
          }

          throw new Error(
            "Firebase authentication failed due to time synchronization issues. Please ensure server clock is properly synchronized."
          );
        }

        // Try to reinitialize Firebase before retrying
        if (attempt === 1) {
          try {
            console.log("Attempting to reinitialize Firebase...");
            // Delete existing apps and reinitialize
            admin.apps.forEach((app) => {
              if (app) app.delete();
            });
            initializeFirebase();
            console.log("Firebase reinitialized successfully");
          } catch (reinitError) {
            console.error(
              "Failed to reinitialize Firebase:",
              reinitError.message
            );
          }
        }

        // On second attempt, try time sync
        if (attempt === 2) {
          console.log("Attempting time synchronization...");
          await attemptTimeSync();
        }

        // Wait before retrying
        console.log(`Waiting ${retryDelay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      // For other errors, don't retry
      throw error;
    }
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
      try {
        const pushResult = await sendPushNotification(
          user.fcmToken,
          title,
          message,
          {
            notificationId: notification.id.toString(),
            ...options.data,
          }
        );

        // If push notification was skipped due to Firebase issues, log it
        if (pushResult && pushResult.skipped) {
          console.warn(
            `Push notification skipped for user ${userId} due to Firebase issues`
          );
        }
      } catch (pushError) {
        console.error(
          `Failed to send push notification to user ${userId}:`,
          pushError.message
        );
        // Don't fail the entire notification process if push fails
      }
    }

    return notification;
  } catch (error) {
    console.error("Error in sendUserNotification:", error);
    throw error;
  }
};

/**
 * Attempt to regenerate Firebase service account key
 * This function provides guidance for manual key regeneration
 * @returns {object}
 */
const getServiceAccountRegenerationGuidance = () => {
  return {
    steps: [
      "1. Go to Firebase Console: https://console.firebase.google.com",
      "2. Select your project: sid-clinic",
      "3. Go to Project Settings (gear icon)",
      "4. Click on 'Service accounts' tab",
      "5. Click 'Generate new private key'",
      "6. Download the new JSON file",
      "7. Convert to single line: cat new-service-account.json | jq -c .",
      "8. Set as environment variable FIREBASE_SERVICE_ACCOUNT in Render.com",
      "9. Redeploy your application",
    ],
    currentKeyInfo: {
      projectId: "sid-clinic",
      clientEmail: "firebase-adminsdk-fbsvc@sid-clinic.iam.gserviceaccount.com",
      privateKeyId: "dfc3994b66d5c5c1d599465bc3be92f17e0bcf56",
    },
    note: "The current key might be revoked or expired. Generating a new key should resolve the JWT signature issue.",
  };
};

module.exports = {
  sendPushNotification,
  sendUserNotification,
  checkFirebaseHealth,
  attemptTimeSync,
  getServiceAccountRegenerationGuidance,
};
