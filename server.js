require('dotenv').config();
const express = require("express");
const sequelize = require("./config/db");
const swaggerUi = require("swagger-ui-express");
const specs = require("./swagger");
const multer = require("multer");
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const doctorRoutes = require("./routes/doctor.route");
const appointmentRoutes = require("./routes/appoinment.routes");
const notificationRoutes = require("./routes/notification.route");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const videoRoutes = require("./routes/video.routes");
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const blogRoutes = require("./routes/blog.routes");
const patientRoutes = require("./routes/patient.routes");
const priceRoutes = require("./routes/price.route");
const adminRoutes = require('./routes/admin.routes');
const adminSettingRoutes = require('./routes/adminSetting.routes');
const locationRoutes = require('./routes/location.routes');
const queryRoutes = require('./routes/query.routes');
const oralHealthScoreRoutes = require('./routes/oralHealthScore.routes');
const medicalReportRoutes = require('./routes/medicalReport.routes');
const dentalImageRoutes = require('./routes/dentalImage.routes');
const personalPatientRoutes = require('./routes/personalPatient.routes');
const virtualDoctorRoutes = require('./routes/virtualDoctor.routes');
const reportRoutes = require('./routes/report.routes');
const paymentRoutes = require('./routes/payment.routes');

// Import new production-ready features
const healthRoutes = require('./routes/health.routes');
const logger = require('./utils/logger');
const GracefulShutdown = require('./utils/gracefulShutdown');
const ProcessMonitor = require('./utils/processMonitor');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
      ],
      "media-src": ["'self'", "blob:"],
      "connect-src": ["'self'", "wss:", "ws:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer middleware for multipart/form-data
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now, but you can add restrictions here
    cb(null, true);
  }
});

// Apply multer middleware to handle multipart/form-data
app.use(upload.any());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Logging middleware
app.use(logger.requestLogger);

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/", authLimiter);
app.use("/api/", generalLimiter);


// Database connection
sequelize
  .authenticate()
  .then(() => logger.info("Database connected successfully"))
  .catch((err) => logger.error("Unable to connect to the database:", err));

// Database sync (temporary for schema update)

sequelize.sync({ alter: false })
  .then(() => {
    logger.info('Database synchronized successfully');
  })
  .catch(err => {
    logger.error('Database sync error:', err);
  });

io.on("connection", (socket) => {
  socket.on("join-room", (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;

    socket.join(roomId);
    socket.emit("room-info", { isInitiator: numClients === 0 });

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", socket.id);
    });

    // WebRTC signaling relay
    socket.on("offer", (offer) => socket.to(roomId).emit("offer", offer));
    socket.on("answer", (answer) => socket.to(roomId).emit("answer", answer));
    socket.on("ice-candidate", (candidate) =>
      socket.to(roomId).emit("ice-candidate", candidate)
    );
  });
});

// Health check routes
app.use("/", healthRoutes);

// Root route to indicate server status
app.get("/", (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: "SID Clinic Backend API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});


// Add this middleware to catch ALL payment-related requests
app.use((req, res, next) => {
  if (req.url.includes('/payment/') || req.url.includes('/callback')) {
    console.log('🚨🚨🚨 PAYMENT ENDPOINT ACCESS 🚨🚨🚨');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🔗 URL:', req.url);
    console.log('📋 Method:', req.method);
    console.log('🌐 IP:', req.ip);
    console.log('📱 User Agent:', req.get('User-Agent') || 'None');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    console.log('🚨🚨🚨 PAYMENT ACCESS END 🚨🚨🚨');
  }
  next();
});
// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/video-call", videoRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/settings", adminSettingRoutes);
app.use("/api/price", priceRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/queries", queryRoutes);
app.use("/api/oral-health-scores", oralHealthScoreRoutes);
app.use("/api/medical-reports", medicalReportRoutes);
app.use("/api/dental-images", dentalImageRoutes);
app.use("/api/personal-patients", personalPatientRoutes);
app.use("/api", virtualDoctorRoutes);
app.use("/api", reportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/redeem-code", require("./routes/redeemCode.routes"));
app.use("/api/banners", require("./routes/banner.routes"));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
        ],
        "script-src-attr": ["'self'", "'unsafe-inline'"], // Add this line
        "media-src": ["'self'", "blob:"],
        "connect-src": ["'self'", "wss:", "ws:"],
      },
    },
  })
);

// Error handling middleware
app.use(logger.errorLogger);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method
  });
});

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Initialize process monitoring
const processMonitor = new ProcessMonitor();

// Initialize graceful shutdown
const gracefulShutdown = new GracefulShutdown(server);

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`🚀 SID Clinic Backend API running on ${HOST}:${PORT}`);
  logger.info(`📚 API Documentation available at http://${HOST}:${PORT}/api-docs`);
  logger.info(`🏥 Health check available at http://${HOST}:${PORT}/health`);
  logger.info(`🔍 Detailed health check at http://${HOST}:${PORT}/health/detailed`);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = { app, server };
