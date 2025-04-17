const { Notification } = require('../models');

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
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        status: 'success',
        code: 200,
        data: notifications,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
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
          userId: req.user.id
        }
      });

      if (!notification) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Notification not found',
        });
      }

      notification.isRead = true;
      await notification.save();

      res.json({
        status: 'success',
        code: 200,
        data: notification,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
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
            isRead: false
          }
        }
      );

      res.json({
        status: 'success',
        code: 200,
        data: { count },
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  }
};