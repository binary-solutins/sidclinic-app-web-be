const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Country = sequelize.define('Country', {
  country_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  country_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  country_short_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Country Short Name'
  },
  country_code: {
    type: DataTypes.STRING(11),
    allowNull: true
  },
  is_min_max_available: {
    type: DataTypes.ENUM('0', '1'),
    defaultValue: '0',
    comment: '0=Not available 1= available'
  },
  min_max_length: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  min: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  max: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  date_format: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ex. DD/MM/YYYY'
  },
  android_date_format: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ex. DD/MM/YYYY'
  },
  node_date_format: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ex. DD/MM/YYYY'
  },
  sql_report_date_format: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ex DD%MM%YYYY'
  },
  sql_report_date_format_with_time: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ex DD%MM%YYYY %H:%i %p'
  },
  is_active: {
    type: DataTypes.ENUM('0', '1'),
    defaultValue: '1',
    comment: '1 = Active , 0 = Suspend'
  }
}, {
  tableName: 'm_country_list',
  timestamps: false,
  indexes: [
    {
      fields: ['country_name']
    },
    {
      fields: ['country_code']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = Country;