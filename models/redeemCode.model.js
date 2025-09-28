const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');

const RedeemCode = sequelize.define('RedeemCode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50]
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'amount'),
    allowNull: false,
    defaultValue: 'percentage'
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  maxDiscountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Maximum discount amount for percentage-based coupons'
  },
  minOrderAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Minimum order amount required to use this coupon'
  },
  usageLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Total number of times this code can be used (null = unlimited)'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times this code has been used'
  },
  userUsageLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Number of times a single user can use this code'
  },
  validFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  applicableFor: {
    type: DataTypes.ENUM('all', 'virtual_appointment'),
    allowNull: false,
    defaultValue: 'virtual_appointment'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata for the redeem code'
  }
}, {
  tableName: 'redeem_codes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['code']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['validFrom', 'validUntil']
    },
    {
      fields: ['applicableFor']
    }
  ]
});

// Associations
RedeemCode.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator',
  onDelete: 'CASCADE'
});

User.hasMany(RedeemCode, { 
  foreignKey: 'createdBy', 
  as: 'createdRedeemCodes' 
});

// Instance methods
RedeemCode.prototype.isValid = function() {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) return false;
  
  // Check date validity
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  
  // Check usage limit
  if (this.usageLimit && this.usageCount >= this.usageLimit) return false;
  
  return true;
};

RedeemCode.prototype.calculateDiscount = function(orderAmount) {
  if (!this.isValid() || orderAmount < (this.minOrderAmount || 0)) {
    return 0;
  }
  
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
    
    // Apply maximum discount limit if set
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else if (this.discountType === 'amount') {
    discount = Math.min(this.discountValue, orderAmount);
  }
  
  return Math.round(discount * 100) / 100; // Round to 2 decimal places
};

module.exports = RedeemCode;




