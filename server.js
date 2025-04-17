const express = require("express");
const sequelize = require("./config/db");
const swaggerUi = require("swagger-ui-express");
const specs = require("./swagger");
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const queryRoutes = require("./routes/query.routes");
const doctorRoutes = require("./routes/doctor.route");
const appointmentRoutes = require("./routes/appoinment.routes");
require("./models/associations");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const path = require('path');
const socketio = require('socket.io');
const videoRoutes = require('./routes/video.routes');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
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
        "media-src": ["'self'", "blob:"],
        "connect-src": ["'self'", "wss:", "ws:"],
      },
    },
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many authentication attempts, please try again later",
});
app.use("/api/auth/", authLimiter);

// Database connection
sequelize
  .authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Unable to connect to the database:", err));

sequelize.sync({ alter: true });
io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;
    
    socket.join(roomId);
    socket.emit('room-info', { isInitiator: numClients === 0 });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', socket.id);
    });

    // WebRTC signaling relay
    socket.on('offer', (offer) => socket.to(roomId).emit('offer', offer));
    socket.on('answer', (answer) => socket.to(roomId).emit('answer', answer));
    socket.on('ice-candidate', (candidate) => socket.to(roomId).emit('ice-candidate', candidate));
  });
});
// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use('/video-call', videoRoutes);
// Global error handler
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        "script-src-attr": ["'self'", "'unsafe-inline'"], // Add this line
        "media-src": ["'self'", "blob:"],
        "connect-src": ["'self'", "wss:", "ws:"],
      },
    },
  })
);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    sequelize.close();
    process.exit(0);
  });
});

module.exports = { app };
