const Payment = require('../models/payment.model');
const Appointment = require('../models/appoinment.model');
const User = require('../models/user.model');
const Price = require('../models/price.model');
const phonepeService = require('../services/phonepe.service');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

/**
 * Initiate payment for virtual appointment
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { appointmentId, paymentMethod = 'phonepe' } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!appointmentId) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Appointment ID is required'
      });
    }

    // Get appointment details
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'name', 'phone', 'email'] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Appointment not found'
      });
    }

    // Check if appointment belongs to the user
    if (appointment.userId !== userId) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'You are not authorized to pay for this appointment'
      });
    }

    // Check if appointment is virtual
    if (appointment.type !== 'virtual') {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Payment is only available for virtual appointments'
      });
    }

    // Check if appointment is in pending status
    if (appointment.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Payment can only be initiated for pending appointments'
      });
    }

    // Get virtual appointment price
    const virtualAppointmentPrice = await Price.findOne({
      where: { serviceName: 'Virtual Appointment', isActive: true }
    });

    if (!virtualAppointmentPrice || !virtualAppointmentPrice.price) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Virtual appointment pricing is not configured'
      });
    }

    const amount = parseFloat(virtualAppointmentPrice.price);

    // Check if payment already exists for this appointment
    const existingPayment = await Payment.findOne({
      where: {
        appointmentId,
        status: { [Op.in]: ['pending', 'initiated', 'processing', 'success'] }
      }
    });

    if (existingPayment) {
      if (existingPayment.status === 'success') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Payment already completed for this appointment'
        });
      } else {
        // Return existing payment details
        return res.json({
          status: 'success',
          code: 200,
          message: 'Payment already initiated',
          data: {
            paymentId: existingPayment.id,
            paymentUrl: existingPayment.paymentUrl,
            status: existingPayment.status,
            amount: existingPayment.amount
          }
        });
      }
    }

    // Generate merchant transaction ID
    const merchantTransactionId = phonepeService.generateMerchantTransactionId(userId, appointmentId);

    // Create payment record
    const payment = await Payment.create({
      userId,
      appointmentId,
      amount,
      currency: 'INR',
      paymentMethod,
      status: 'initiated',
      phonepeMerchantTransactionId: merchantTransactionId,
      initiatedAt: new Date(),
      ipAddress: req.ip,
      deviceInfo: {
        userAgent: req.get('User-Agent'),
        platform: req.get('Platform') || 'web'
      }
    });

    // Initiate payment with PhonePe
    const paymentResult = await phonepeService.initiatePayment({
      merchantTransactionId,
      amount,
      userId,
      appointmentId,
      userInfo: appointment.patient
    });

    if (!paymentResult.success) {
      // Update payment status to failed
      await payment.update({
        status: 'failed',
        failureReason: paymentResult.error,
        failedAt: new Date()
      });

      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Payment initiation failed',
        error: paymentResult.error
      });
    }

    // Update payment with PhonePe response
    await payment.update({
      status: 'initiated',
      phonepeTransactionId: paymentResult.data.phonepeTransactionId,
      paymentUrl: paymentResult.data.paymentUrl,
      phonepeResponse: paymentResult.data
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Payment initiated successfully',
      data: {
        paymentId: payment.id,
        paymentUrl: paymentResult.data.paymentUrl,
        amount: amount,
        currency: 'INR',
        merchantTransactionId: merchantTransactionId
      }
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Handle PhonePe callback
 */
exports.handleCallback = async (req, res) => {
  try {
    const { response, checksum } = req.body;

    if (!response || !checksum) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid callback data'
      });
    }

    // Process callback with PhonePe service
    const callbackResult = await phonepeService.processCallback({ response, checksum });

    if (!callbackResult.success) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Callback processing failed',
        error: callbackResult.error
      });
    }

    const callbackData = callbackResult.data;

    // Find payment record
    const payment = await Payment.findOne({
      where: {
        phonepeMerchantTransactionId: callbackData.merchantTransactionId
      },
      include: [
        { model: Appointment, as: 'appointment' },
        { model: User, as: 'user' }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Payment record not found'
      });
    }

    // Update payment status based on callback
    let paymentStatus = 'failed';
    let appointmentStatus = payment.appointment.status;

    switch (callbackData.status) {
      case 'COMPLETED':
        paymentStatus = 'success';
        if (payment.appointment.status === 'pending') {
          appointmentStatus = 'confirmed';
        }
        break;
      case 'FAILED':
        paymentStatus = 'failed';
        break;
      case 'CANCELLED':
        paymentStatus = 'cancelled';
        break;
      default:
        paymentStatus = 'failed';
    }

    // Update payment record
    await payment.update({
      status: paymentStatus,
      phonepeCallbackData: callbackData,
      gatewayTransactionId: callbackData.transactionId,
      gatewayResponse: callbackData,
      completedAt: paymentStatus === 'success' ? new Date() : null,
      failedAt: paymentStatus === 'failed' ? new Date() : null,
      failureReason: paymentStatus === 'failed' ? callbackData.responseMessage : null,
      failureCode: paymentStatus === 'failed' ? callbackData.responseCode : null
    });

    // Update appointment status if payment is successful
    if (paymentStatus === 'success' && appointmentStatus === 'confirmed') {
      await payment.appointment.update({
        status: 'confirmed',
        confirmedAt: new Date()
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Callback processed successfully',
      data: {
        paymentId: payment.id,
        status: paymentStatus,
        appointmentStatus: appointmentStatus
      }
    });

  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Check payment status
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: {
        id: paymentId,
        userId: userId
      },
      include: [
        { model: Appointment, as: 'appointment', attributes: ['id', 'appointmentDateTime', 'type', 'status'] }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Payment not found'
      });
    }

    // If payment is still pending, check with PhonePe
    if (payment.status === 'initiated' || payment.status === 'processing') {
      const statusResult = await phonepeService.checkPaymentStatus(payment.phonepeMerchantTransactionId);
      
      if (statusResult.success) {
        const statusData = statusResult.data;
        let newStatus = payment.status;

        switch (statusData.state) {
          case 'COMPLETED':
            newStatus = 'success';
            break;
          case 'FAILED':
            newStatus = 'failed';
            break;
          case 'CANCELLED':
            newStatus = 'cancelled';
            break;
        }

        if (newStatus !== payment.status) {
          await payment.update({
            status: newStatus,
            completedAt: newStatus === 'success' ? new Date() : null,
            failedAt: newStatus === 'failed' ? new Date() : null,
            failureReason: newStatus === 'failed' ? statusData.responseMessage : null
          });

          // Update appointment status if payment is successful
          if (newStatus === 'success' && payment.appointment.status === 'pending') {
            await payment.appointment.update({
              status: 'confirmed',
              confirmedAt: new Date()
            });
          }
        }
      }
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Payment status retrieved successfully',
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        initiatedAt: payment.initiatedAt,
        completedAt: payment.completedAt,
        appointment: payment.appointment
      }
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user's payment history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;
    const where = { userId };
    
    if (status) {
      where.status = status;
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      include: [
        { 
          model: Appointment, 
          as: 'appointment', 
          attributes: ['id', 'appointmentDateTime', 'type', 'status', 'notes'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Payment history retrieved successfully',
      data: payments,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get payment details by ID
 */
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: {
        id: paymentId,
        userId: userId
      },
      include: [
        { 
          model: Appointment, 
          as: 'appointment',
          include: [
            { model: User, as: 'patient', attributes: ['id', 'name', 'phone'] }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Payment not found'
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Payment details retrieved successfully',
      data: payment
    });

  } catch (error) {
    console.error('Payment details error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get available payment methods
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = phonepeService.getPaymentMethods();

    res.json({
      status: 'success',
      code: 200,
      message: 'Payment methods retrieved successfully',
      data: paymentMethods
    });

  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Admin: Get all payments with filters
 */
exports.getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentMethod,
      fromDate,
      toDate,
      userId
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (userId) where.userId = userId;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt[Op.gte] = new Date(fromDate);
      if (toDate) where.createdAt[Op.lte] = new Date(`${toDate}T23:59:59.999Z`);
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'phone', 'email'] },
        { 
          model: Appointment, 
          as: 'appointment', 
          attributes: ['id', 'appointmentDateTime', 'type', 'status'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Payments retrieved successfully',
      data: payments,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Admin: Get payment statistics
 */
exports.getPaymentStats = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    
    const startDate = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const endDate = toDate ? new Date(`${toDate}T23:59:59.999Z`) : new Date();

    // Get total revenue and transaction count
    const revenueStats = await Payment.getTotalRevenue(startDate, endDate);

    // Get status-wise counts
    const statusCounts = await Payment.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'totalAmount']
      ],
      group: ['status'],
      raw: true
    });

    // Get payment method distribution
    const methodCounts = await Payment.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'paymentMethod',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['paymentMethod'],
      raw: true
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Payment statistics retrieved successfully',
      data: {
        period: {
          fromDate: startDate,
          toDate: endDate
        },
        revenue: revenueStats,
        statusDistribution: statusCounts,
        methodDistribution: methodCounts
      }
    });

  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};



