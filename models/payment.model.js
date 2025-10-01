const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Appointment = require('./appoinment.model');

const Payment = sequelize.define('Payment', {
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
    },
    comment: 'Patient who made the payment'
  },
  appointmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Appointment,
      key: 'id'
    },
    comment: 'Associated appointment'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    },
    comment: 'Payment amount in INR'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR',
    comment: 'Currency code'
  },
  paymentMethod: {
    type: DataTypes.ENUM('phonepe', 'upi', 'card', 'netbanking', 'wallet'),
    allowNull: false,
    defaultValue: 'phonepe',
    comment: 'Payment method used'
  },
  // integrationType: {
  //   type: DataTypes.ENUM('web', 'sdk', 'api'),
  //   allowNull: true,
  //   defaultValue: 'web',
  //   comment: 'Integration type (web, sdk, api)'
  // },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'initiated',
      'processing',
      'success',
      'failed',
      'cancelled',
      'refunded',
      'expired'
    ),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Payment status'
  },
  
  // PhonePe specific fields
  phonepeTransactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'PhonePe transaction ID'
  },
  phonepeMerchantTransactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Merchant transaction ID for PhonePe'
  },
  phonepeResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'PhonePe API response data'
  },
  phonepeCallbackData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'PhonePe callback data'
  },
  
  // Payment gateway response
  gatewayTransactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Gateway transaction ID'
  },
  gatewayResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Gateway response data'
  },
  
  // Payment URLs
  paymentUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Payment gateway URL for user to complete payment'
  },
  callbackUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Callback URL for payment status updates'
  },
  
  // Timestamps
  initiatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When payment was initiated'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When payment was completed'
  },
  failedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When payment failed'
  },
  
  // Failure details
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for payment failure'
  },
  failureCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Failure error code'
  },
  
  // Refund details
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Refunded amount'
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for refund'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When refund was processed'
  },
  
  // Additional metadata
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional payment metadata'
  },
  
  // Device and location info
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Device information'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'IP address of the user'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['appointmentId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['phonepeTransactionId']
    },
    {
      fields: ['phonepeMerchantTransactionId']
    },
    {
      fields: ['gatewayTransactionId']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['userId', 'appointmentId']
    }
  ]
});

// Define associations
User.hasMany(Payment, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
Payment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Appointment.hasMany(Payment, {
  foreignKey: 'appointmentId',
  onDelete: 'CASCADE'
});
Payment.belongsTo(Appointment, {
  foreignKey: 'appointmentId',
  as: 'appointment'
});

// Instance methods
Payment.prototype.isSuccessful = function() {
  return this.status === 'success';
};

Payment.prototype.isPending = function() {
  return ['pending', 'initiated', 'processing'].includes(this.status);
};

Payment.prototype.isFailed = function() {
  return ['failed', 'cancelled', 'expired'].includes(this.status);
};

Payment.prototype.canBeRefunded = function() {
  return this.status === 'success' && !this.refundAmount;
};

Payment.prototype.getRefundableAmount = function() {
  if (!this.canBeRefunded()) return 0;
  return this.amount - (this.refundAmount || 0);
};

// Class methods
Payment.getByStatus = async function(status) {
  return await this.findAll({
    where: { status },
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'phone'] },
      { model: Appointment, as: 'appointment', attributes: ['id', 'appointmentDateTime', 'type'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};

Payment.getByUser = async function(userId, options = {}) {
  const { status, limit = 10, offset = 0 } = options;
  
  const where = { userId };
  if (status) where.status = status;
  
  return await this.findAndCountAll({
    where,
    include: [
      { model: Appointment, as: 'appointment', attributes: ['id', 'appointmentDateTime', 'type', 'status'] }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });
};

Payment.getByAppointment = async function(appointmentId) {
  return await this.findAll({
    where: { appointmentId },
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'phone'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};

Payment.getTotalRevenue = async function(startDate, endDate) {
  const where = {
    status: 'success',
    completedAt: {
      [require('sequelize').Op.between]: [startDate, endDate]
    }
  };
  
  const result = await this.findOne({
    where,
    attributes: [
      [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'totalRevenue'],
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalTransactions']
    ],
    raw: true
  });
  
  return {
    totalRevenue: parseFloat(result.totalRevenue) || 0,
    totalTransactions: parseInt(result.totalTransactions) || 0
  };
};

module.exports = Payment;







