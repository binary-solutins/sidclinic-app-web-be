const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const RedeemCode = require('./redeemCode.model');
const Appointment = require('./appoinment.model');
const Payment = require('./payment.model');

const RedeemCodeUsage = sequelize.define('RedeemCodeUsage', {
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
  redeemCodeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: RedeemCode,
      key: 'id'
    }
  },
  appointmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Appointment,
      key: 'id'
    }
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Payment,
      key: 'id'
    }
  },
  originalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Original amount before discount'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Amount discounted'
  },
  finalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Final amount after discount'
  },
  status: {
    type: DataTypes.ENUM('applied', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'applied'
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional usage metadata'
  }
}, {
  tableName: 'redeem_code_usage',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['redeemCodeId']
    },
    {
      fields: ['appointmentId']
    },
    {
      fields: ['paymentId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['usedAt']
    },
    {
      unique: true,
      fields: ['userId', 'redeemCodeId', 'appointmentId'],
      name: 'unique_user_code_appointment'
    }
  ]
});

// Associations
RedeemCodeUsage.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user',
  onDelete: 'CASCADE'
});

RedeemCodeUsage.belongsTo(RedeemCode, { 
  foreignKey: 'redeemCodeId', 
  as: 'redeemCode',
  onDelete: 'CASCADE'
});

RedeemCodeUsage.belongsTo(Appointment, { 
  foreignKey: 'appointmentId', 
  as: 'appointment',
  onDelete: 'SET NULL'
});

RedeemCodeUsage.belongsTo(Payment, { 
  foreignKey: 'paymentId', 
  as: 'payment',
  onDelete: 'SET NULL'
});

// Reverse associations
User.hasMany(RedeemCodeUsage, { 
  foreignKey: 'userId', 
  as: 'redeemCodeUsages' 
});

RedeemCode.hasMany(RedeemCodeUsage, { 
  foreignKey: 'redeemCodeId', 
  as: 'usages' 
});

Appointment.hasOne(RedeemCodeUsage, { 
  foreignKey: 'appointmentId', 
  as: 'redeemCodeUsage' 
});

Payment.hasOne(RedeemCodeUsage, { 
  foreignKey: 'paymentId', 
  as: 'redeemCodeUsage' 
});

module.exports = RedeemCodeUsage;



