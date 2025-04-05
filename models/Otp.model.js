const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 

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
  tableName: 'otps',
  timestamps: false, 
});

module.exports = Otp;