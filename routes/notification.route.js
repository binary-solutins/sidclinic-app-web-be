const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const { authenticate, authorize } = require("../middleware/auth");

router.get("/", authenticate(), controller.getUserNotifications);
router.get("/admin", authenticate(), authorize("admin"), controller.getAdminNotifications);
router.patch("/:id/read", authenticate(), controller.markAsRead);
router.patch("/read-all", authenticate(), controller.markAllAsRead);
router.post(
  "/send-notification",
  authenticate(),
  authorize("admin"),
  controller.sendNotification
);
router.post("/add-fcm-token", authenticate(), controller.updateFcmToken);

module.exports = router;
