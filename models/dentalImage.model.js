const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const FamilyMember = require('./familyMember.model');

const DentalImage = sequelize.define('DentalImage', {
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
  relativeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: FamilyMember,
      key: 'id'
    },
    comment: 'ID of the family member (relative) if image is for a relative, null if for patient themselves'
  },
  imageUrls: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of image URLs stored in Appwrite'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional description of the dental images'
  },
  imageType: {
    type: DataTypes.ENUM('xray', 'photo', 'scan', 'other'),
    defaultValue: 'other',
    comment: 'Type of dental image'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'dental_images',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['relativeId']
    },
    {
      fields: ['userId', 'relativeId']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Associations
User.hasMany(DentalImage, { foreignKey: 'userId', onDelete: 'CASCADE' });
DentalImage.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

FamilyMember.hasMany(DentalImage, { foreignKey: 'relativeId', onDelete: 'CASCADE' });
DentalImage.belongsTo(FamilyMember, { foreignKey: 'relativeId', onDelete: 'CASCADE' });

module.exports = DentalImage; 