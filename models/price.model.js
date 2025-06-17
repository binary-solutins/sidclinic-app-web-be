const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Price = sequelize.define('Price', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  serviceName: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  price: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: true,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'prices',
  timestamps: true,
});

module.exports = Price;