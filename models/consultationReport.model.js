const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Patient = require('./patient.model');

const ConsultationReport = sequelize.define('ConsultationReport', {
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
  doctorName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  consultationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  prescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  followUpDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  indexes: [
    {
      fields: ['patientId']
    },
    {
      fields: ['consultationDate']
    }
  ]
});

Patient.hasMany(ConsultationReport, { foreignKey: 'patientId', onDelete: 'CASCADE' });
ConsultationReport.belongsTo(Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });

module.exports = ConsultationReport;