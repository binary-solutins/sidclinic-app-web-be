const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const State = require('./state.model');
const Country = require('./country.model');

const City = sequelize.define('City', {
  city_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  state_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: State,
      key: 'state_id'
    }
  },
  parent_city_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'parent City ID'
  },
  country_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Country,
      key: 'country_id'
    },
    comment: 'Ref By tbl_country'
  },
  city_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  is_active: {
    type: DataTypes.ENUM('0', '1'),
    defaultValue: '1',
    comment: '1 = Active, 0 = Suspend'
  }
}, {
  tableName: 'm_city_list',
  timestamps: false,
  indexes: [
    {
      fields: ['state_id']
    },
    {
      fields: ['country_id']
    },
    {
      fields: ['city_name']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Define associations
State.hasMany(City, { foreignKey: 'state_id', onDelete: 'CASCADE' });
City.belongsTo(State, { foreignKey: 'state_id', onDelete: 'CASCADE' });

Country.hasMany(City, { foreignKey: 'country_id', onDelete: 'CASCADE' });
City.belongsTo(Country, { foreignKey: 'country_id', onDelete: 'CASCADE' });

module.exports = City;