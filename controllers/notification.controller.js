const { Notification } = require("../models");
const { User } = require("../models");
const sequelize = require("../config/db");
const { Op } = require("sequelize");
const { sendPushNotification } = require("../services/firebase.services");

module.exports = {
  /**
   * @swagger
   * /notifications:
   *   get:
   *     summary: Get user notifications
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of notifications
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Notification'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  getUserNotifications: async (req, res) => {
    try {
      console.log(
        `[DEBUG] getUserNotifications - User ID: ${req.user.id}, Query params:`,
        req.query
      );

      const { limit = 20, offset = 0 } = req.query;

      const notifications = await Notification.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      console.log(
        `[DEBUG] getUserNotifications - Found ${notifications.length} notifications for user ${req.user.id}`
      );

      res.json({
        status: "success",
        code: 200,
        data: notifications,
      });
    } catch (error) {
      console.error(
        `[ERROR] getUserNotifications - User ID: ${req.user.id}, Error:`,
        error.message
      );
      res.status(500).json({
        status: "error",
        code: 500,
        message: error.message,
      });
    }
  },

  /**
   * @swagger
   * /notifications/{id}/read:
   *   patch:
   *     summary: Mark notification as read
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Notification marked as read
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Notification'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Notification not found
   *       500:
   *         description: Server error
   */
  markAsRead: async (req, res) => {
    try {
      console.log(
        `[DEBUG] markAsRead - User ID: ${req.user.id}, Notification ID: ${req.params.id}`
      );

      const notification = await Notification.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!notification) {
        console.log(
          `[DEBUG] markAsRead - Notification not found for User ID: ${req.user.id}, Notification ID: ${req.params.id}`
        );
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "Notification not found",
        });
      }

      notification.isRead = true;
      await notification.save();

      console.log(
        `[DEBUG] markAsRead - Successfully marked notification ${req.params.id} as read for user ${req.user.id}`
      );

      res.json({
        status: "success",
        code: 200,
        data: notification,
      });
    } catch (error) {
      console.error(
        `[ERROR] markAsRead - User ID: ${req.user.id}, Notification ID: ${req.params.id}, Error:`,
        error.message
      );
      res.status(500).json({
        status: "error",
        code: 500,
        message: error.message,
      });
    }
  },

  /**
   * @swagger
   * /notifications/read-all:
   *   patch:
   *     summary: Mark all notifications as read
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All notifications marked as read
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 count:
   *                   type: integer
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  markAllAsRead: async (req, res) => {
    try {
      console.log(`[DEBUG] markAllAsRead - User ID: ${req.user.id}`);

      const [count] = await Notification.update(
        { isRead: true },
        {
          where: {
            userId: req.user.id,
            isRead: false,
          },
        }
      );

      console.log(
        `[DEBUG] markAllAsRead - Marked ${count} notifications as read for user ${req.user.id}`
      );

      res.json({
        status: "success",
        code: 200,
        data: { count },
      });
    } catch (error) {
      console.error(
        `[ERROR] markAllAsRead - User ID: ${req.user.id}, Error:`,
        error.message
      );
      res.status(500).json({
        status: "error",
        code: 500,
        message: error.message,
      });
    }
  },

  sendNotification: async (req, res) => {
    try {
      const { title, body, data, type } = req.body;

      console.log(
        `[DEBUG] sendNotification - Type: ${type}, Title: ${title}, Body: ${body}`
      );

      // Validate required fields
      if (!title || !body || !type) {
        console.log(
          `[DEBUG] sendNotification - Validation failed: missing required fields`
        );
        return res.status(400).json({
          success: false,
          message: "Title, body, and type are required",
        });
      }

      let fcmTokens = [];

      if (type === "user") {
        const users = await User.findAll({
          where: {
            fcmToken: { [Op.ne]: null },
          },
          attributes: ["fcmToken"],
        });
        fcmTokens = users.map((user) => user.fcmToken);
        console.log(
          `[DEBUG] sendNotification - Found ${fcmTokens.length} users with FCM tokens`
        );
      } else {
        const doctors = await User.findAll({
          where: {
            role: "doctor",
            fcmToken: { [Op.ne]: null },
          },
          attributes: ["fcmToken"],
        });
        fcmTokens = doctors.map((doctor) => doctor.fcmToken);
        console.log(
          `[DEBUG] sendNotification - Found ${fcmTokens.length} doctors with FCM tokens`
        );
      }

      if (fcmTokens.length === 0) {
        console.log(
          `[DEBUG] sendNotification - No ${type}s found with FCM tokens`
        );
        return res.status(404).json({
          success: false,
          message: `No ${type}s found with FCM tokens`,
        });
      }

      // Send notifications in chunks of 50
      const CHUNK_SIZE = 50;
      const results = [];
      let successfulSends = 0;
      let failedSends = 0;

      console.log(
        `[DEBUG] sendNotification - Starting to send notifications in ${Math.ceil(
          fcmTokens.length / CHUNK_SIZE
        )} chunks`
      );

      for (let i = 0; i < fcmTokens.length; i += CHUNK_SIZE) {
        const chunk = fcmTokens.slice(i, i + CHUNK_SIZE);
        console.log(
          `[DEBUG] sendNotification - Processing chunk ${
            Math.floor(i / CHUNK_SIZE) + 1
          }/${Math.ceil(fcmTokens.length / CHUNK_SIZE)} with ${
            chunk.length
          } tokens`
        );

        // Process chunk in parallel
        const chunkPromises = chunk.map(async (fcmToken) => {
          try {
            const response = await sendPushNotification(
              fcmToken,
              title,
              body,
              data || {}
            );

            return {
              token: fcmToken,
              success: true,
              response: response,
            };
          } catch (error) {
            return {
              token: fcmToken,
              success: false,
              error: error.message,
            };
          }
        });

        // Wait for all notifications in the chunk to complete
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);

        // Update counters
        const chunkSuccessful = chunkResults.filter((r) => r.success).length;
        const chunkFailed = chunkResults.filter((r) => !r.success).length;
        successfulSends += chunkSuccessful;
        failedSends += chunkFailed;

        console.log(
          `[DEBUG] sendNotification - Chunk ${
            Math.floor(i / CHUNK_SIZE) + 1
          } completed: ${chunkSuccessful} successful, ${chunkFailed} failed`
        );

        // Optional: Add a small delay between chunks to prevent rate limiting
        if (i + CHUNK_SIZE < fcmTokens.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(
        `[DEBUG] sendNotification - Completed: ${successfulSends} successful, ${failedSends} failed out of ${fcmTokens.length} total`
      );

      res.json({
        success: true,
        message: `Notification sent to ${successfulSends} ${type}s, ${failedSends} failed`,
        results: results,
        summary: {
          total: fcmTokens.length,
          successful: successfulSends,
          failed: failedSends,
          chunks: Math.ceil(fcmTokens.length / CHUNK_SIZE),
        },
      });
    } catch (error) {
      console.error(`[ERROR] sendNotification - Error:`, error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  /**
   * @swagger
   * /notifications/add-fcm-token:
   *   post:
   *     summary: Update user's FCM token
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fcmToken
   *             properties:
   *               fcmToken:
   *                 type: string
   *                 description: Firebase Cloud Messaging token
   *     responses:
   *       200:
   *         description: FCM token updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "success"
   *                 code:
   *                   type: integer
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "FCM token updated successfully"
   *       400:
   *         description: Bad request - missing FCM token
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   *       500:
   *         description: Server error
   */
  updateFcmToken: async (req, res) => {
    try {
      const { fcmToken } = req.body;

      console.log(
        `[DEBUG] updateFcmToken - User ID: ${
          req.user.id
        }, FCM Token provided: ${fcmToken ? "Yes" : "No"}`
      );

      if (!fcmToken) {
        console.log(
          `[DEBUG] updateFcmToken - Validation failed: FCM token is missing`
        );
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "FCM token is required",
        });
      }

      // Find and update the user's FCM token
      const user = await User.findByPk(req.user.id);

      if (!user) {
        console.log(`[DEBUG] updateFcmToken - User not found: ${req.user.id}`);
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "User not found",
        });
      }

      // Update the FCM token
      user.fcmToken = fcmToken;
      await user.save();

      console.log(
        `[DEBUG] updateFcmToken - Successfully updated FCM token for user ${req.user.id}`
      );

      res.json({
        status: "success",
        code: 200,
        message: "FCM token updated successfully",
        data: {
          userId: user.id,
          fcmToken: user.fcmToken,
        },
      });
    } catch (error) {
      console.error(
        `[ERROR] updateFcmToken - User ID: ${req.user.id}, Error:`,
        error.message
      );
      res.status(500).json({
        status: "error",
        code: 500,
        message: error.message,
      });
    }
  },
};
