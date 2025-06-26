const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Patient = require('./patient.model');

const FamilyMember = sequelize.define('FamilyMember', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: false
  },
  relation: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  indexes: [
    {
      fields: ['patientId']
    }
  ]
});

Patient.hasMany(FamilyMember, { foreignKey: 'patientId', onDelete: 'CASCADE' });
FamilyMember.belongsTo(Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });

module.exports = FamilyMember;