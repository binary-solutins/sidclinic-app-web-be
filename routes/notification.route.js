const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/auth");

router.get("/", authenticate(), controller.getUserNotifications);
router.patch("/:id/read", authenticate(), controller.markAsRead);
router.patch("/read-all", authenticate(), controller.markAllAsRead);
//! maybe need to add auth
router.post("/send-notification", controller.sendNotification);
router.post("/add-fcm-token", controller.updateFcmToken);

module.exports = router;
