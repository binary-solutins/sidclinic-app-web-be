const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use environment variables directly, ignore config.json
const sequelize = new Sequelize(
  process.env.DB_NAME || 'bsrd6tgetkctpmuz6s73',
  process.env.DB_USER || 'uww73sjuuwwnxrod',
  process.env.DB_PASSWORD || '7DgjRO7ySKYjsv9EnQ8x',
  {
    host: process.env.DB_HOST || 'bsrd6tgetkctpmuz6s73-mysql.services.clever-cloud.com',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    pool: {
      max: 10,     // Increased for better performance
      min: 2,      // Maintain minimum connections
      acquire: 10000, // Reduced timeout
      idle: 5000   // Reduced idle time
    },
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);

module.exports = sequelize;