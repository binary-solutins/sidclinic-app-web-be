const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Doctor = require('./doctor.model');

const Appointment = sequelize.define('Appointment', {
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
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { 
      model: Doctor, 
      key: 'id' 
    }
  },
  appointmentDateTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('physical', 'virtual'),
    defaultValue: 'physical'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'canceled', 'rejected'),
    defaultValue: 'pending'
  },
  videoCallLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Define associations
User.hasMany(Appointment, { foreignKey: 'userId' });
Appointment.belongsTo(User, { foreignKey: 'userId', as: 'patient' });

Doctor.hasMany(Appointment, { foreignKey: 'doctorId' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

module.exports = Appointment;