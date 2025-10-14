const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Banner title'
  },
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Banner subtitle'
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Banner image URL'
  },
  isDoctorApp: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Flag to determine if this banner is for doctor app (1) or patient app (0)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Flag to enable/disable banner'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Display order for banners'
  },
  bannerUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Banner URL for navigation'
  }
}, {
  tableName: 'banners',
  timestamps: true,
  indexes: [
    {
      fields: ['isDoctorApp']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['order']
    }
  ]
});

module.exports = Banner;

