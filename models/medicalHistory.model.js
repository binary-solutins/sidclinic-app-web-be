const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Patient = require('./patient.model');

const MedicalHistory = sequelize.define('MedicalHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  patientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Patient,
      key: 'id'
    }
  },
  hasDiabetes: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasHighBloodPressure: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasThyroidDisorder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasAsthma: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  otherConditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  allergies: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pastDentalHistory: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  currentMedications: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  smokesTobacco: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tobaccoForm: {
    type: DataTypes.ENUM('Cigarette', 'Gutkha', 'Pan Masala', 'Other'),
    allowNull: true
  },
  tobaccoFrequencyPerDay: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  tobaccoDurationYears: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['patientId']
    }
  ]
});

Patient.hasOne(MedicalHistory, { foreignKey: 'patientId', onDelete: 'CASCADE' });
MedicalHistory.belongsTo(Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });

module.exports = MedicalHistory;