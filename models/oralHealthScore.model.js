const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Patient = require('./patient.model');

const OralHealthScore = sequelize.define('OralHealthScore', {
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
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  assessmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assessedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Doctor ID who assessed the score'
  }
}, {
  indexes: [
    {
      fields: ['patientId']
    },
    {
      fields: ['assessmentDate']
    }
  ]
});

Patient.hasMany(OralHealthScore, { foreignKey: 'patientId', onDelete: 'CASCADE' });
OralHealthScore.belongsTo(Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });

module.exports = OralHealthScore; 