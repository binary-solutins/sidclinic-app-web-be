const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const { authenticate, authorize } = require("../middleware/auth");

router.get("/", authenticate(), controller.getUserNotifications);
router.patch("/:id/read", authenticate(), controller.markAsRead);
router.patch("/read-all", authenticate(), controller.markAllAsRead);
router.post(
  "/send-notification",
  authenticate(),
  authorize("admin"),
  controller.sendNotification
);
router.post("/add-fcm-token", authenticate(), controller.updateFcmToken);
router.get(
  "/admin/all",
  authenticate(),
  authorize("admin"),
  controller.getAllNotificationsForAdmin
);
router.get(
  "/admin/stats",
  authenticate(),
  authorize("admin"),
  controller.getNotificationStats
);
router.post(
  "/admin/cleanup-tokens",
  authenticate(),
  authorize("admin"),
  controller.cleanupInvalidTokens
);
router.post(
  "/test-storage",
  authenticate(),
  authorize("admin"),
  controller.testNotificationStorage
);

module.exports = router;