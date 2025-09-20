const RedeemCode = require('../models/redeemCode.model');
const RedeemCodeUsage = require('../models/redeemCodeUsage.model');
const User = require('../models/user.model');
const { Op } = require('sequelize');

/**
 * Admin: Create new redeem code
 */
exports.createRedeemCode = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      usageLimit,
      userUsageLimit,
      validFrom,
      validUntil,
      isActive,
      applicableFor
    } = req.body;

    const adminId = req.user.id;

    // Validate required fields
    if (!code || !name || !discountType || !discountValue) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Code, name, discount type, and discount value are required'
      });
    }

    // Validate discount type and value
    if (!['percentage', 'amount'].includes(discountType)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Discount type must be either "percentage" or "amount"'
      });
    }

    if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Percentage discount must be between 1 and 100'
      });
    }

    if (discountType === 'amount' && discountValue <= 0) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Amount discount must be greater than 0'
      });
    }

    // Check if code already exists
    const existingCode = await RedeemCode.findOne({
      where: { code: code.toUpperCase() }
    });

    if (existingCode) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Redeem code already exists'
      });
    }

    // Create redeem code
    const redeemCode = await RedeemCode.create({
      code: code.toUpperCase(),
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount: minOrderAmount || 0,
      usageLimit,
      userUsageLimit: userUsageLimit || 1,
      validFrom: validFrom || new Date(),
      validUntil,
      isActive: isActive !== undefined ? isActive : true,
      applicableFor: applicableFor || 'virtual_appointment',
      createdBy: adminId
    });

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Redeem code created successfully',
      data: redeemCode
    });

  } catch (error) {
    console.error('Create redeem code error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Admin: Get all redeem codes
 */
exports.getAllRedeemCodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive,
      discountType,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (discountType) {
      where.discountType = discountType;
    }

    if (search) {
      where[Op.or] = [
        { code: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: redeemCodes } = await RedeemCode.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add usage statistics
    const codesWithStats = await Promise.all(
      redeemCodes.map(async (code) => {
        const totalUsage = await RedeemCodeUsage.count({
          where: { redeemCodeId: code.id }
        });

        return {
          ...code.toJSON(),
          totalUsage,
          remainingUsage: code.usageLimit ? code.usageLimit - totalUsage : null,
          isExpired: code.validUntil ? new Date() > code.validUntil : false,
          isValidNow: code.isValid()
        };
      })
    );

    res.json({
      status: 'success',
      code: 200,
      message: 'Redeem codes retrieved successfully',
      data: codesWithStats,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get all redeem codes error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Admin: Update redeem code
 */
exports.updateRedeemCode = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const redeemCode = await RedeemCode.findByPk(id);

    if (!redeemCode) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Redeem code not found'
      });
    }

    // If updating code, check for duplicates
    if (updates.code && updates.code.toUpperCase() !== redeemCode.code) {
      const existingCode = await RedeemCode.findOne({
        where: {
          code: updates.code.toUpperCase(),
          id: { [Op.ne]: id }
        }
      });

      if (existingCode) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Redeem code already exists'
        });
      }

      updates.code = updates.code.toUpperCase();
    }

    // Validate discount type and value if being updated
    if (updates.discountType && updates.discountValue) {
      if (updates.discountType === 'percentage' && (updates.discountValue <= 0 || updates.discountValue > 100)) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Percentage discount must be between 1 and 100'
        });
      }

      if (updates.discountType === 'amount' && updates.discountValue <= 0) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Amount discount must be greater than 0'
        });
      }
    }

    await redeemCode.update(updates);

    res.json({
      status: 'success',
      code: 200,
      message: 'Redeem code updated successfully',
      data: redeemCode
    });

  } catch (error) {
    console.error('Update redeem code error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Admin: Delete redeem code
 */
exports.deleteRedeemCode = async (req, res) => {
  try {
    const { id } = req.params;

    const redeemCode = await RedeemCode.findByPk(id);

    if (!redeemCode) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Redeem code not found'
      });
    }

    // Check if code has been used
    const usageCount = await RedeemCodeUsage.count({
      where: { redeemCodeId: id }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Cannot delete redeem code that has been used. Consider deactivating it instead.'
      });
    }

    await redeemCode.destroy();

    res.json({
      status: 'success',
      code: 200,
      message: 'Redeem code deleted successfully'
    });

  } catch (error) {
    console.error('Delete redeem code error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * User: Validate redeem code
 */
exports.validateRedeemCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { amount } = req.query;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Redeem code is required'
      });
    }

    const redeemCode = await RedeemCode.findOne({
      where: { code: code.toUpperCase() }
    });

    if (!redeemCode) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Invalid redeem code'
      });
    }

    // Check if code is valid
    if (!redeemCode.isValid()) {
      let reason = 'Redeem code is not valid';
      
      if (!redeemCode.isActive) reason = 'Redeem code is inactive';
      else if (redeemCode.validFrom && new Date() < redeemCode.validFrom) reason = 'Redeem code is not yet active';
      else if (redeemCode.validUntil && new Date() > redeemCode.validUntil) reason = 'Redeem code has expired';
      else if (redeemCode.usageLimit && redeemCode.usageCount >= redeemCode.usageLimit) reason = 'Redeem code usage limit exceeded';

      return res.status(400).json({
        status: 'error',
        code: 400,
        message: reason
      });
    }

    // Check user usage limit
    if (redeemCode.userUsageLimit) {
      const userUsageCount = await RedeemCodeUsage.count({
        where: {
          userId,
          redeemCodeId: redeemCode.id
        }
      });

      if (userUsageCount >= redeemCode.userUsageLimit) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'You have already used this redeem code maximum number of times'
        });
      }
    }

    // Calculate discount if amount provided
    let discountAmount = 0;
    let finalAmount = 0;
    let isApplicable = true;
    let applicabilityMessage = '';

    if (amount) {
      const orderAmount = parseFloat(amount);
      
      if (redeemCode.minOrderAmount && orderAmount < redeemCode.minOrderAmount) {
        isApplicable = false;
        applicabilityMessage = `Minimum order amount is ₹${redeemCode.minOrderAmount}`;
      } else {
        discountAmount = redeemCode.calculateDiscount(orderAmount);
        finalAmount = orderAmount - discountAmount;
      }
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Redeem code is valid',
      data: {
        code: redeemCode.code,
        name: redeemCode.name,
        description: redeemCode.description,
        discountType: redeemCode.discountType,
        discountValue: redeemCode.discountValue,
        maxDiscountAmount: redeemCode.maxDiscountAmount,
        minOrderAmount: redeemCode.minOrderAmount,
        isApplicable,
        applicabilityMessage,
        discountAmount,
        finalAmount,
        validUntil: redeemCode.validUntil
      }
    });

  } catch (error) {
    console.error('Validate redeem code error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Admin: Get redeem code usage statistics
 */
exports.getRedeemCodeStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const redeemCode = await RedeemCode.findByPk(id);

    if (!redeemCode) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Redeem code not found'
      });
    }

    const offset = (page - 1) * limit;

    // Get usage history
    const { count, rows: usageHistory } = await RedeemCodeUsage.findAndCountAll({
      where: { redeemCodeId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['usedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get statistics
    const totalUsage = await RedeemCodeUsage.count({
      where: { redeemCodeId: id }
    });

    const totalDiscountGiven = await RedeemCodeUsage.sum('discountAmount', {
      where: { redeemCodeId: id }
    });

    const totalRevenueImpact = await RedeemCodeUsage.sum('originalAmount', {
      where: { redeemCodeId: id }
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Redeem code statistics retrieved successfully',
      data: {
        redeemCode: {
          ...redeemCode.toJSON(),
          isValidNow: redeemCode.isValid()
        },
        statistics: {
          totalUsage,
          remainingUsage: redeemCode.usageLimit ? redeemCode.usageLimit - totalUsage : null,
          totalDiscountGiven: totalDiscountGiven || 0,
          totalRevenueImpact: totalRevenueImpact || 0,
          averageDiscount: totalUsage > 0 ? (totalDiscountGiven / totalUsage) : 0
        },
        usageHistory,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get redeem code stats error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = exports;

