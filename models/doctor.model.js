const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');

const Doctor = sequelize.define('Doctor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { 
      model: User, 
      key: 'id' 
    }
  },
  doctorPhoto: {
    type: DataTypes.STRING,
    allowNull: true
  },
  degree: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  registrationNumber: { 
    type: DataTypes.STRING, 
    unique: true, 
    allowNull: false 
  },
  clinicName: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  clinicPhotos: {
    type: DataTypes.JSON,
    allowNull: true
  },
  yearsOfExperience: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  specialty: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clinicContactNumber: { 
    type: DataTypes.STRING(15), 
    allowNull: false 
  },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    validate: { isEmail: true } 
  },
  address: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  locationPin: { 
    type: DataTypes.STRING(6), 
    allowNull: false 
  },
  isApproved: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['registrationNumber']
    },
    {
      fields: ['city']
    }
  ]
});

// Define association with alias
User.hasOne(Doctor, { foreignKey: 'userId', as: 'Doctor', onDelete: 'CASCADE' });
Doctor.belongsTo(User, { foreignKey: 'userId', as: 'User', onDelete: 'CASCADE' });

module.exports = Doctor;