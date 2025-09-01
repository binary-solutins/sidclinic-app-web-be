const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AdminSetting = sequelize.define('AdminSetting', {
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
      model: 'Users',
      key: 'id'
    }
  },
  virtualAppointmentStartTime: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '09:00:00',
    comment: 'Start time for virtual appointments (HH:MM:SS format)'
  },
  virtualAppointmentEndTime: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '18:00:00',
    comment: 'End time for virtual appointments (HH:MM:SS format)'
  },
  alertEmails: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comma-separated list of email addresses for alerts'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this admin setting is active'
  }
}, {
  tableName: 'admin_settings',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId']
    }
  ]
});

// Define associations
AdminSetting.associate = (models) => {
  AdminSetting.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'User'
  });
};

module.exports = AdminSetting;
