const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const { authenticate, authorize } = require("../middleware/auth");
const { checkFirebaseHealth } = require("../services/firebase.services");

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

// Health check endpoint for Firebase
router.get("/health", async (req, res) => {
  try {
    const healthStatus = await checkFirebaseHealth();
    res.json({
      status: "success",
      firebase: healthStatus.healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      details: healthStatus,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      firebase: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
      details: {
        healthy: false,
        error: error.message,
        message: "Health check failed to execute",
      },
    });
  }
});

module.exports = router;
