const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate(), controller.getUserNotifications);
router.patch('/:id/read', authenticate(), controller.markAsRead);
router.patch('/read-all', authenticate(), controller.markAllAsRead);

module.exports = router;