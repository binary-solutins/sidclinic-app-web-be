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
      const { limit = 20, offset = 0 } = req.query;

      const notifications = await Notification.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.json({
        status: "success",
        code: 200,
        data: notifications,
      });
    } catch (error) {
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
      const notification = await Notification.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!notification) {
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "Notification not found",
        });
      }

      notification.isRead = true;
      await notification.save();

      res.json({
        status: "success",
        code: 200,
        data: notification,
      });
    } catch (error) {
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
      const [count] = await Notification.update(
        { isRead: true },
        {
          where: {
            userId: req.user.id,
            isRead: false,
          },
        }
      );

      res.json({
        status: "success",
        code: 200,
        data: { count },
      });
    } catch (error) {
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

      console.log(" ==========> ");

      // Validate required fields
      if (!title || !body || !type) {
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
            notificationEnabled: true,
          },
          attributes: ["fcmToken"],
        });
        fcmTokens = users.map((user) => user.fcmToken);
      } else {
        const doctors = await User.findAll({
          where: {
            role: "doctor",
            fcmToken: { [Op.ne]: null },
            notificationEnabled: true,
          },
          attributes: ["fcmToken"],
        });
        fcmTokens = doctors.map((doctor) => doctor.fcmToken);
      }

      if (fcmTokens.length === 0) {
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

      for (let i = 0; i < fcmTokens.length; i += CHUNK_SIZE) {
        const chunk = fcmTokens.slice(i, i + CHUNK_SIZE);

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
        successfulSends += chunkResults.filter((r) => r.success).length;
        failedSends += chunkResults.filter((r) => !r.success).length;

        // Optional: Add a small delay between chunks to prevent rate limiting
        if (i + CHUNK_SIZE < fcmTokens.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

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
      console.error("Error sending notification:", error);
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

      if (!fcmToken) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "FCM token is required",
        });
      }

      // Find and update the user's FCM token
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "User not found",
        });
      }

      // Update the FCM token
      user.fcmToken = fcmToken;
      await user.save();

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
      console.error("Error updating FCM token:", error);
      res.status(500).json({
        status: "error",
        code: 500,
        message: error.message,
      });
    }
  },
};
