const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Doctor = require('./doctor.model');

const PersonalPatient = sequelize.define('PersonalPatient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Doctor,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Patient name'
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    comment: 'Patient phone number'
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true,
    comment: 'Patient gender'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Patient description or notes'
  },
  medicalHistory: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Patient medical history'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date of first visit or registration'
  },
  time: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Time of first visit or registration'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the patient record is active'
  }
}, {
  indexes: [
    {
      fields: ['doctorId']
    },
    {
      fields: ['phone']
    },
    {
      fields: ['name']
    }
  ]
});

// Define association
Doctor.hasMany(PersonalPatient, { foreignKey: 'doctorId', onDelete: 'CASCADE' });
PersonalPatient.belongsTo(Doctor, { foreignKey: 'doctorId', onDelete: 'CASCADE' });

module.exports = PersonalPatient;
