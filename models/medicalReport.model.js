const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Patient = require('./patient.model');

const MedicalReport = sequelize.define('MedicalReport', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Appwrite URL to the uploaded file'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes'
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'MIME type of the file'
  },
  reportType: {
    type: DataTypes.ENUM('X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other'),
    allowNull: false,
    defaultValue: 'Other'
  },
  uploadDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who uploaded the report'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  indexes: [
    {
      fields: ['patientId']
    },
    {
      fields: ['reportType']
    },
    {
      fields: ['uploadDate']
    }
  ]
});

Patient.hasMany(MedicalReport, { foreignKey: 'patientId', onDelete: 'CASCADE' });
MedicalReport.belongsTo(Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });

module.exports = MedicalReport; 