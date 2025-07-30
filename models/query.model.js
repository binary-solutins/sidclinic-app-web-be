const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Doctor = require('./doctor.model');

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
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  raisedByRole: {
    type: DataTypes.ENUM('user', 'doctor'),
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of file URLs or file information'
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
  ],
  hooks: {
    beforeUpdate: async (query) => {
      // Set resolvedAt when status changes to Resolved or Closed
      if (query.changed('status') && 
          (query.status === 'Resolved' || query.status === 'Closed') && 
          !query.resolvedAt) {
        query.resolvedAt = new Date();
      }
    }
  }
});

module.exports = Query; 