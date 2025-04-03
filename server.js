const express = require('express');
const sequelize = require('./config/db');
const swaggerUi = require('swagger-ui-express');
const specs = require('./swagger');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const queryRoutes = require('./routes/query.routes');
const doctorRoutes = require('./routes/doctor.route');
const appoinmentRoute = require('./routes/appoinment.routes')
require('./models/associations');
const cors = require("cors");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many authentication attempts, please try again later'
});
app.use('/api/auth/', authLimiter);


sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Unable to connect to the database:', err));


sequelize.sync({ alter: true });

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments',appoinmentRoute );


// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    sequelize.close();
    process.exit(0);
  });
});

module.exports = app;