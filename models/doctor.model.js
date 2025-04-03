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
  locationPin: { 
    type: DataTypes.STRING(6), 
    allowNull: false 
  },
  isApproved: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  maxPatientsPerSlot: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  slotDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 30 // minutes
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['registrationNumber']
    }
  ]
});

// Define association without alias
User.hasOne(Doctor, { foreignKey: 'userId', onDelete: 'CASCADE' });
Doctor.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

module.exports = Doctor;
