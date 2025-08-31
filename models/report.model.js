const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Patient = require('./patient.model');
const FamilyMember = require('./familyMember.model');

const Report = sequelize.define('Report', {
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
  relativeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '0 for patient themselves, otherwise FamilyMember ID'
  },
  relativeName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reportType: {
    type: DataTypes.ENUM('oral_diagnosis', 'dental_analysis', 'teeth_detection', 'cavity_detection', 'plaque_detection', 'other'),
    allowNull: false,
    defaultValue: 'oral_diagnosis'
  },
  boundingBoxData: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of image analysis data with detections and bounding boxes'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of uploaded image URLs'
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Overall analysis summary'
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
      fields: ['relativeId']
    },
    {
      fields: ['reportType']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Associations
Patient.hasMany(Report, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Report.belongsTo(Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });

// For relativeId > 0, associate with FamilyMember
Report.belongsTo(FamilyMember, { 
  foreignKey: 'relativeId', 
  targetKey: 'id',
  constraints: false,
  scope: {
    relativeId: { [Op.gt]: 0 }
  }
});

module.exports = Report;
