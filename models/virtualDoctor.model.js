const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');

const VirtualDoctor = sequelize.define('VirtualDoctor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    unique: true,
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
    allowNull: true // Virtual doctors might not have physical clinics
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
    allowNull: false
  },
  subSpecialties: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of sub-specialties'
  },
  clinicContactNumber: { 
    type: DataTypes.STRING(15), 
    allowNull: true // Virtual doctors might use different contact methods
  },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    validate: { isEmail: true } 
  },
  address: { 
    type: DataTypes.STRING, 
    allowNull: true // Virtual doctors might not have physical addresses
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  locationPin: { 
    type: DataTypes.STRING(6), 
    allowNull: true // Virtual doctors might not have specific pin codes
  },
  isApproved: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Virtual consultation start time'
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Virtual consultation end time'
  },
  consultationFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Virtual consultation fee'
  },
  languages: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Languages the virtual doctor can communicate in'
  },
  timezone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Asia/Kolkata',
    comment: 'Virtual doctor timezone'
  },
  maxPatientsPerDay: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 20,
    comment: 'Maximum number of patients per day'
  },
  averageConsultationTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
    comment: 'Average consultation time in minutes'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Virtual doctor biography'
  },
  qualifications: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of qualifications and certifications'
  },
  virtualConsultationTypes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Types of virtual consultations offered (video, audio, chat)'
  },
  isAvailableForEmergency: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether available for emergency consultations'
  },
  emergencyFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Emergency consultation fee'
  }
}, {
  tableName: 'virtual_doctors',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['registrationNumber']
    },
    {
      unique: true,
      fields: ['userId']
    },
    {
      fields: ['specialty']
    },
    {
      fields: ['city']
    },
    {
      fields: ['isApproved']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Define association with alias
User.hasOne(VirtualDoctor, { foreignKey: 'userId', as: 'VirtualDoctor', onDelete: 'CASCADE' });
VirtualDoctor.belongsTo(User, { foreignKey: 'userId', as: 'User', onDelete: 'CASCADE' });

// Instance methods
VirtualDoctor.prototype.isAvailable = function() {
  return this.isApproved && this.is_active;
};

VirtualDoctor.prototype.getFullName = function() {
  return this.User ? this.User.name : 'Unknown';
};

VirtualDoctor.prototype.getDisplayName = function() {
  return `Dr. ${this.getFullName()} (${this.specialty})`;
};

// Class methods
VirtualDoctor.getBySpecialty = async function(specialty) {
  return await this.findAll({
    where: { 
      specialty: specialty,
      isApproved: true,
      is_active: true
    },
    include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email', 'phone'] }]
  });
};

VirtualDoctor.getAvailableDoctors = async function() {
  return await this.findAll({
    where: { 
      isApproved: true,
      is_active: true
    },
    include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email', 'phone'] }]
  });
};

module.exports = VirtualDoctor;
