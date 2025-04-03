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
  status: {
    type: DataTypes.ENUM('booked', 'completed', 'canceled'),
    defaultValue: 'booked'
  },
  videoCallLink: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Define associations directly
User.hasMany(Appointment, { foreignKey: 'userId' });
Appointment.belongsTo(User, { foreignKey: 'userId', as: 'patient' });

Doctor.hasMany(Appointment, { foreignKey: 'doctorId' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

module.exports = Appointment;