const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');

const Query = sequelize.define('Query', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000]
    }
  },
  category: {
    type: DataTypes.ENUM('General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other'),
    allowNull: false,
    defaultValue: 'General'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Urgent'),
    allowNull: false,
    defaultValue: 'Medium'
  },
  status: {
    type: DataTypes.ENUM('Open', 'In Progress', 'Resolved', 'Closed'),
    allowNull: false,
    defaultValue: 'Open'
  },
  raisedBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  raisedByRole: {
    type: DataTypes.ENUM('user', 'doctor'),
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'Queries',
  timestamps: true,
  indexes: [
    {
      fields: ['raisedBy']
    },
    {
      fields: ['status']
    },
    {
      fields: ['category']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Define associations
User.hasMany(Query, { foreignKey: 'raisedBy', as: 'queries', onDelete: 'CASCADE' });
Query.belongsTo(User, { foreignKey: 'raisedBy', as: 'user', onDelete: 'CASCADE' });

// Assigned to associations
User.hasMany(Query, { foreignKey: 'assignedTo', as: 'assignedQueries', onDelete: 'SET NULL' });
Query.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedToUser', onDelete: 'SET NULL' });

module.exports = Query;