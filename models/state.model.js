const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Country = require('./country.model');

const State = sequelize.define('State', {
  state_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  country_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Country,
      key: 'country_id'
    }
  },
  state_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  state_short_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'State Short Name'
  },
  mailchimp_list_id: {
    type: DataTypes.STRING(55),
    allowNull: true,
    comment: 'mailchimp id for state'
  },
  is_active: {
    type: DataTypes.ENUM('0', '1'),
    defaultValue: '1',
    comment: '1 = Active, 0 = Suspend'
  }
}, {
  tableName: 'm_state_list',
  timestamps: false,
  indexes: [
    {
      fields: ['country_id']
    },
    {
      fields: ['state_name']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Define associations
Country.hasMany(State, { foreignKey: 'country_id', onDelete: 'CASCADE' });
State.belongsTo(Country, { foreignKey: 'country_id', onDelete: 'CASCADE' });

module.exports = State;