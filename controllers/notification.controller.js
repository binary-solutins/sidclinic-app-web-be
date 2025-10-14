const { Notification } = require("../models");
const { User } = require("../models");
const sequelize = require("../config/db");
const { Op } = require("sequelize");
const { sendPushNotification } = require("../services/firebase.services");

// Utility function to clean up invalid FCM tokens
const cleanupInvalidTokens = async () => {
  try {
    console.log('🧹 Starting FCM token cleanup...');
    
    // Find all users with FCM tokens
    const usersWithTokens = await User.findAll({
      where: {
        fcmToken: { [Op.ne]: null }
      },
      attributes: ['id', 'fcmToken', 'name', 'role']
    });
    
    console.log(`Found ${usersWithTokens.length} users with FCM tokens`);
    
    let cleanedCount = 0;
    
    for (const user of usersWithTokens) {
      try {
        // Test the token by sending a test message
        await sendPushNotification(
          user.fcmToken,
          'Test',
          'Token validation',
          { test: true }
        );
        console.log(`✅ Token valid for user ${user.id} (${user.name})`);
      } catch (error) {
        if (error.code === 'messaging/registration-token-not-registered' || 
            error.code === 'messaging/invalid-registration-token') {
          console.log(`🗑️ Removing invalid token for user ${user.id} (${user.name})`);
          await user.update({ fcmToken: null });
          cleanedCount++;
        }
      }
    }
    
    console.log(`🧹 Cleanup completed: ${cleanedCount} invalid tokens removed`);
    return { cleanedCount, totalUsers: usersWithTokens.length };
  } catch (error) {
    console.error('Error during token cleanup:', error);
    throw error;
  }
};

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

      let users = [];

      if (type === "both") {
        users = await User.findAll({
          attributes: ["id", "fcmToken"],
        });
      } else if (type === "user") {
        users = await User.findAll({
          where: { role: "user" },
          attributes: ["id", "fcmToken"],
        });
        console.log(
          `[DEBUG] sendNotification - Found ${users.length} users with FCM tokens`
        );
      } else {
        users = await User.findAll({
          where: { role: { [Op.in]: ["doctor", "virtual-doctor"] } },
          attributes: ["id", "fcmToken"],
        });
        console.log(
          `[DEBUG] sendNotification - Found ${users.length} doctors with FCM tokens`
        );
      }

      if (users.length === 0) {
        console.log(
          `[DEBUG] sendNotification - No ${type}s found with FCM tokens`
        );
        return res.status(404).json({
          success: false,
          message: `No ${type}s found with FCM tokens`,
        });
      }

      const fcmTokens = users.map((user) => user.fcmToken).filter(token => token);

      if (fcmTokens.length === 0) {
        console.log(
          `[DEBUG] sendNotification - No valid FCM tokens found for ${type}s`
        );
        return res.status(404).json({
          success: false,
          message: `No valid FCM tokens found for ${type}s`,
        });
      }

      const CHUNK_SIZE = 50;
      const results = [];
      let successfulSends = 0;
      let failedSends = 0;

      console.log(
        `[DEBUG] sendNotification - Starting to send notifications in ${Math.ceil(
          fcmTokens.length / CHUNK_SIZE
        )} chunks`
      );

      // Store notifications in database for users with valid FCM tokens
      const usersWithTokens = users.filter(user => user.fcmToken);
      const notificationPromises = usersWithTokens.map(async (user) => {
        try {
          await Notification.create({
            userId: user.id,
            title: title,
            message: body,
            type: 'system',
            data: data || {},
            isRead: false
          });
          return { userId: user.id, success: true };
        } catch (error) {
          console.error(`[ERROR] Failed to store notification for user ${user.id}:`, error.message);
          return { userId: user.id, success: false, error: error.message };
        }
      });

      const storageResults = await Promise.all(notificationPromises);
      const storageSuccess = storageResults.filter(r => r.success).length;
      const storageFailed = storageResults.filter(r => !r.success).length;

      console.log(
        `[DEBUG] sendNotification - Stored notifications: ${storageSuccess} successful, ${storageFailed} failed`
      );

      // Debug: Check if notifications were actually stored
      if (storageSuccess > 0) {
        const storedNotifications = await Notification.findAll({
          where: {
            userId: { [Op.in]: usersWithTokens.map(u => u.id) },
            title: title,
            message: body
          },
          limit: 5
        });
        console.log(`[DEBUG] Verified ${storedNotifications.length} notifications in database`);
      }

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

            // Check if token should be removed
            if (response && response.shouldRemoveToken) {
              console.log(`🗑️ Removing invalid FCM token: ${fcmToken.substring(0, 20)}...`);
              // Find and update user with invalid token
              const userWithInvalidToken = await User.findOne({
                where: { fcmToken: fcmToken }
              });
              if (userWithInvalidToken) {
                await userWithInvalidToken.update({ fcmToken: null });
                console.log(`✅ Removed invalid FCM token for user ${userWithInvalidToken.id}`);
              }
            }

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

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);

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
        message: `Notification sent to ${successfulSends} ${type}s, ${failedSends} failed. Stored ${storageSuccess} notifications in database.`,
        results: results,
        storage: {
          total: usersWithTokens.length,
          successful: storageSuccess,
          failed: storageFailed,
        },
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

  // Test endpoint to verify notification storage
  testNotificationStorage: async (req, res) => {
    try {
      const { userId, title, body } = req.body;
      
      if (!userId || !title || !body) {
        return res.status(400).json({
          success: false,
          message: "userId, title, and body are required"
        });
      }

      // Create a test notification
      const notification = await Notification.create({
        userId: userId,
        title: title,
        message: body,
        type: 'system',
        data: { test: true },
        isRead: false
      });

      console.log(`[DEBUG] Test notification created with ID: ${notification.id}`);

      // Verify it was stored
      const storedNotification = await Notification.findByPk(notification.id);
      
      res.json({
        success: true,
        message: "Test notification stored successfully",
        notification: storedNotification
      });
    } catch (error) {
      console.error(`[ERROR] testNotificationStorage - Error:`, error.message);
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

  /**
   * @swagger
   * /notifications/admin/all:
   *   get:
   *     summary: Get all notifications for admin (admin only)
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of notifications to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of notifications to skip
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [appointment, system, other]
   *         description: Filter by notification type
   *       - in: query
   *         name: isRead
   *         schema:
   *           type: boolean
   *         description: Filter by read status
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *         description: Filter by specific user ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter notifications from this date (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter notifications until this date (YYYY-MM-DD)
   *     responses:
   *       200:
   *         description: List of all notifications with pagination
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
   *                 data:
   *                   type: object
   *                   properties:
   *                     notifications:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Notification'
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: integer
   *                         limit:
   *                           type: integer
   *                         offset:
   *                           type: integer
   *                         totalPages:
   *                           type: integer
   *                         currentPage:
   *                           type: integer
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       500:
   *         description: Server error
   */

  // Cleanup invalid FCM tokens endpoint
  cleanupInvalidTokens: async (req, res) => {
    try {
      const result = await cleanupInvalidTokens();
      res.json({
        status: "success",
        code: 200,
        message: "FCM token cleanup completed",
        data: result
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({
        status: "error",
        code: 500,
        message: "Failed to cleanup invalid tokens",
        error: error.message
      });
    }
  },

  getAllNotificationsForAdmin: async (req, res) => {
    try {
      console.log(
        `[DEBUG] getAllNotificationsForAdmin - Admin ID: ${req.user.id}, Query params:`,
        req.query
      );

      const {
        limit = 20,
        offset = 0,
        type,
        isRead,
        userId,
        startDate,
        endDate,
      } = req.query;

      // Build where clause for filtering
      const whereClause = {};

      if (type) {
        whereClause.type = type;
      }

      if (isRead !== undefined) {
        whereClause.isRead = isRead === 'true';
      }

      if (userId) {
        whereClause.userId = parseInt(userId);
      }

      // Date range filtering
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          // Ensure startDate starts at beginning of day
          const startDateObj = new Date(startDate);
          startDateObj.setHours(0, 0, 0, 0);
          whereClause.createdAt[Op.gte] = startDateObj;
        }
        if (endDate) {
          // Ensure endDate ends at end of day
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          whereClause.createdAt[Op.lte] = endDateObj;
        }
      }

      // Get total count for pagination
      const totalCount = await Notification.count({
        where: whereClause,
      });

      // Get notifications with pagination and include user information
      const notifications = await Notification.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'phone', 'role'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / parseInt(limit));
      const currentPage = Math.floor(parseInt(offset) / parseInt(limit)) + 1;

      console.log(
        `[DEBUG] getAllNotificationsForAdmin - Found ${notifications.length} notifications out of ${totalCount} total for admin ${req.user.id}`
      );

      res.json({
        status: 'success',
        code: 200,
        data: {
          notifications,
          pagination: {
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
            totalPages,
            currentPage,
          },
        },
      });
    } catch (error) {
      console.error(
        `[ERROR] getAllNotificationsForAdmin - Admin ID: ${req.user.id}, Error:`,
        error.message
      );
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  /**
   * @swagger
   * /notifications/admin/stats:
   *   get:
   *     summary: Get notification statistics for admin (admin only)
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Notification statistics
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
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalNotifications:
   *                       type: integer
   *                     unreadNotifications:
   *                       type: integer
   *                     readNotifications:
   *                       type: integer
   *                     notificationsByType:
   *                       type: object
   *                     recentActivity:
   *                       type: array
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       500:
   *         description: Server error
   */
  getNotificationStats: async (req, res) => {
    try {
      console.log(
        `[DEBUG] getNotificationStats - Admin ID: ${req.user.id}`
      );

      // Get total notifications count
      const totalNotifications = await Notification.count();

      // Get unread notifications count
      const unreadNotifications = await Notification.count({
        where: { isRead: false }
      });

      // Get read notifications count
      const readNotifications = await Notification.count({
        where: { isRead: true }
      });

      // Get notifications by type
      const notificationsByType = await Notification.findAll({
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['type'],
        raw: true
      });

      // Get recent notifications (last 10)
      const recentActivity = await Notification.findAll({
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'phone', 'role'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 10,
      });

      // Convert notificationsByType to a more usable format
      const typeStats = {};
      notificationsByType.forEach(item => {
        typeStats[item.type] = parseInt(item.count);
      });

      console.log(
        `[DEBUG] getNotificationStats - Retrieved stats for admin ${req.user.id}: Total=${totalNotifications}, Unread=${unreadNotifications}`
      );

      res.json({
        status: 'success',
        code: 200,
        data: {
          totalNotifications,
          unreadNotifications,
          readNotifications,
          notificationsByType: typeStats,
          recentActivity,
        },
      });
    } catch (error) {
      console.error(
        `[ERROR] getNotificationStats - Admin ID: ${req.user.id}, Error:`,
        error.message
      );
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },
};