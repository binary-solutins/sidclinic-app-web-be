const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Your database connection

const Otp = sequelize.define('Otp', {
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  otp: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  expirationTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'otps', // Optional: Specify table name
  timestamps: false, // Optional: Disable timestamps (createdAt, updatedAt)
});

module.exports = Otp;