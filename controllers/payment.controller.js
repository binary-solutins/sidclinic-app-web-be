const Payment = require('../models/payment.model');
const Appointment = require('../models/appoinment.model');
const User = require('../models/user.model');
const Price = require('../models/price.model');
const RedeemCode = require('../models/redeemCode.model');
const RedeemCodeUsage = require('../models/redeemCodeUsage.model');
const phonepeService = require('../services/phonepe.service');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

/**
 * Initiate payment for virtual appointment
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { appointmentId, paymentMethod = 'phonepe', redeemCode } = req.body;
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
        { model: User, as: 'patient', attributes: ['id', 'name', 'phone'] }
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

    let originalAmount = parseFloat(virtualAppointmentPrice.price);
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let redeemCodeData = null;
    let redeemCodeUsage = null;

    // Process redeem code if provided
    if (redeemCode) {
      const redeemCodeRecord = await RedeemCode.findOne({
        where: { 
          code: redeemCode.toUpperCase(),
          applicableFor: { [Op.in]: ['all', 'virtual_appointment'] }
        }
      });

      if (!redeemCodeRecord) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid redeem code'
        });
      }

      // Validate redeem code
      if (!redeemCodeRecord.isValid()) {
        let reason = 'Redeem code is not valid';
        
        if (!redeemCodeRecord.isActive) reason = 'Redeem code is inactive';
        else if (redeemCodeRecord.validFrom && new Date() < redeemCodeRecord.validFrom) reason = 'Redeem code is not yet active';
        else if (redeemCodeRecord.validUntil && new Date() > redeemCodeRecord.validUntil) reason = 'Redeem code has expired';
        else if (redeemCodeRecord.usageLimit && redeemCodeRecord.usageCount >= redeemCodeRecord.usageLimit) reason = 'Redeem code usage limit exceeded';

        return res.status(400).json({
          status: 'error',
          code: 400,
          message: reason
        });
      }

      // Check user usage limit
      if (redeemCodeRecord.userUsageLimit) {
        const userUsageCount = await RedeemCodeUsage.count({
          where: {
            userId,
            redeemCodeId: redeemCodeRecord.id
          }
        });

        if (userUsageCount >= redeemCodeRecord.userUsageLimit) {
          return res.status(400).json({
            status: 'error',
            code: 400,
            message: 'You have already used this redeem code maximum number of times'
          });
        }
      }

      // Check minimum order amount
      if (redeemCodeRecord.minOrderAmount && originalAmount < redeemCodeRecord.minOrderAmount) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Minimum order amount is ₹${redeemCodeRecord.minOrderAmount} to use this redeem code`
        });
      }

      // Calculate discount
      discountAmount = redeemCodeRecord.calculateDiscount(originalAmount);
      finalAmount = originalAmount - discountAmount;
      redeemCodeData = redeemCodeRecord;

      // Create redeem code usage record (will be linked to payment later)
      redeemCodeUsage = await RedeemCodeUsage.create({
        userId,
        redeemCodeId: redeemCodeRecord.id,
        appointmentId,
        originalAmount,
        discountAmount,
        finalAmount,
        status: 'applied',
        usedAt: new Date()
      });

      // Update redeem code usage count
      await redeemCodeRecord.increment('usageCount');
    }

    const amount = finalAmount;

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
    console.log('🔄 Updating payment record with PhonePe response:', {
      paymentId: payment.id,
      phonepeResponse: paymentResult.data
    });

    await payment.update({
      status: 'initiated',
      phonepeTransactionId: paymentResult.data.phonepeTransactionId,
      paymentUrl: paymentResult.data.paymentUrl,
      phonepeResponse: paymentResult.data
    });

    console.log('✅ Payment record updated successfully for ID:', payment.id);

    // Link redeem code usage to payment if applicable
    if (redeemCodeUsage) {
      await redeemCodeUsage.update({ paymentId: payment.id });
    }

    // Schedule auto-check for payment status after 2 minutes (fallback mechanism)
    setTimeout(async () => {
      try {
        await exports.autoCheckPaymentStatus(payment.id);
      } catch (error) {
        console.error('Error in scheduled payment status check:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    res.json({
      status: 'success',
      code: 200,
      message: 'Payment initiated successfully',
      data: {
        paymentId: payment.id,
        paymentUrl: paymentResult.data.paymentUrl,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        finalAmount: amount,
        currency: 'INR',
        merchantTransactionId: merchantTransactionId,
        redeemCode: redeemCodeData ? {
          code: redeemCodeData.code,
          name: redeemCodeData.name,
          discountType: redeemCodeData.discountType,
          discountValue: redeemCodeData.discountValue
        } : null
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
    console.log('🔔🔔🔔 PHONEPE CALLBACK RECEIVED 🔔🔔🔔');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🌐 IP Address:', req.ip);
    console.log('📱 User Agent:', req.get('User-Agent'));
    console.log('📋 Request Method:', req.method);
    console.log('🔗 Request URL:', req.url);
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔔🔔🔔 CALLBACK DATA END 🔔🔔🔔');

    const { response, checksum } = req.body;

    if (!response || !checksum) {
      console.log('❌ Invalid callback data - missing response or checksum');
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid callback data'
      });
    }

    // Process callback with PhonePe service
    console.log('🔄 Processing callback with PhonePe service...');
    const callbackResult = await phonepeService.processCallback({ response, checksum });

    if (!callbackResult.success) {
      console.log('❌ Callback processing failed:', callbackResult.error);
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Callback processing failed',
        error: callbackResult.error
      });
    }

    const callbackData = callbackResult.data;
    console.log('✅ Callback processed successfully:', callbackData);

    // Find payment record
    console.log(`🔍 Looking for payment with merchantTransactionId: ${callbackData.merchantTransactionId}`);
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
      console.log('❌ Payment record not found for merchantTransactionId:', callbackData.merchantTransactionId);
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Payment record not found'
      });
    }

    console.log(`✅ Payment found - ID: ${payment.id}, Current Status: ${payment.status}, Appointment Status: ${payment.appointment.status}`);

    // Update payment status based on callback
    let paymentStatus = 'failed';
    let appointmentStatus = payment.appointment.status;

    console.log(`📊 Processing callback status: ${callbackData.status}`);
    switch (callbackData.status) {
      case 'COMPLETED':
        paymentStatus = 'success';
        if (payment.appointment.status === 'pending') {
          appointmentStatus = 'confirmed';
        }
        console.log('✅ Payment marked as successful');
        break;
      case 'FAILED':
        paymentStatus = 'failed';
        console.log('❌ Payment marked as failed');
        break;
      case 'CANCELLED':
        paymentStatus = 'cancelled';
        console.log('🚫 Payment marked as cancelled');
        break;
      default:
        paymentStatus = 'failed';
        console.log('⚠️ Unknown status, marking as failed:', callbackData.status);
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
    if (paymentStatus === 'success' && payment.appointment.status === 'pending') {
      await payment.appointment.update({
        status: 'confirmed',
        confirmedAt: new Date(),
        paymentId: payment.id  // Add payment ID to appointment
      });
      console.log(`✅ Appointment ${payment.appointment.id} status updated to confirmed with payment ID ${payment.id} after successful payment`);
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
    console.error('❌ Callback processing error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Auto-check payment status (fallback mechanism)
 */
exports.autoCheckPaymentStatus = async (paymentId) => {
  try {
    console.log(`🔄 Auto-checking payment status for payment ID: ${paymentId}`);
    
    const payment = await Payment.findByPk(paymentId, {
      include: [
        { model: Appointment, as: 'appointment' }
      ]
    });

    if (!payment) {
      console.log(`❌ Payment ${paymentId} not found for auto-check`);
      return;
    }

    // Only check if payment is still pending/initiated/processing
    if (['pending', 'initiated', 'processing'].includes(payment.status)) {
      console.log(`📋 Payment ${paymentId} status is ${payment.status}, checking with PhonePe...`);
      
      const statusResult = await phonepeService.checkPaymentStatus(payment.phonepeMerchantTransactionId);
      
      if (statusResult.success) {
        const statusData = statusResult.data;
        let newStatus = payment.status;

        // Map PhonePe status to our internal status
        switch (statusData.state) {
          case 'COMPLETED':
          case 'SUCCESS':
            newStatus = 'success';
            break;
          case 'FAILED':
          case 'FAILURE':
            newStatus = 'failed';
            break;
          case 'CANCELLED':
          case 'CANCELED':
            newStatus = 'cancelled';
            break;
          case 'PENDING':
          case 'PROCESSING':
            newStatus = 'processing';
            break;
          default:
            console.log('⚠️ Unknown PhonePe status:', statusData.state);
        }

        // Update database with latest status from PhonePe
        if (newStatus !== payment.status) {
          console.log(`🔄 Auto-updating payment ${payment.id} status from ${payment.status} to ${newStatus}`);
          await payment.update({
            status: newStatus,
            completedAt: newStatus === 'success' ? new Date() : null,
            failedAt: newStatus === 'failed' ? new Date() : null,
            failureReason: newStatus === 'failed' ? statusData.responseMessage : null,
            phonepeStatusResponse: statusData
          });

          // Update appointment status if payment is successful
          if (newStatus === 'success' && payment.appointment.status === 'pending') {
            await payment.appointment.update({
              status: 'confirmed',
              confirmedAt: new Date()
            });
            console.log(`✅ Auto-updated appointment ${payment.appointment.id} to confirmed status`);
          }
        }
      } else {
        console.log('⚠️ Could not get status from PhonePe during auto-check:', statusResult.error);
      }
    } else {
      console.log(`💡 Payment ${paymentId} already in final state: ${payment.status}`);
    }
  } catch (error) {
    console.error('❌ Auto-check payment status error:', error);
  }
};

/**
 * Debug payment data (for troubleshooting)
 */
exports.debugPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findByPk(paymentId, {
      include: [
        { model: Appointment, as: 'appointment' }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }

    // Log detailed payment information
    console.log('🔍 DEBUG PAYMENT DATA:');
    console.log('📋 Payment ID:', payment.id);
    console.log('📋 Status:', payment.status);
    console.log('📋 PhonePe Merchant Transaction ID:', payment.phonepeMerchantTransactionId);
    console.log('📋 PhonePe Transaction ID:', payment.phonepeTransactionId);
    console.log('📋 PhonePe Response:', JSON.stringify(payment.phonepeResponse, null, 2));
    console.log('📋 Has phonepeResponse:', !!payment.phonepeResponse);
    console.log('📋 Order ID from response:', payment.phonepeResponse?.orderId);
    console.log('📋 Payment URL:', payment.paymentUrl);
    console.log('🔍 DEBUG END');

    res.json({
      status: 'success',
      message: 'Payment debug data',
      data: {
        paymentId: payment.id,
        status: payment.status,
        phonepeMerchantTransactionId: payment.phonepeMerchantTransactionId,
        phonepeTransactionId: payment.phonepeTransactionId,
        hasPhonepeResponse: !!payment.phonepeResponse,
        orderId: payment.phonepeResponse?.orderId,
        phonepeResponse: payment.phonepeResponse,
        paymentUrl: payment.paymentUrl
      }
    });
  } catch (error) {
    console.error('❌ Debug payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Manual sync payment status from PhonePe (for debugging)
 */
exports.manualSyncPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log(`🔄 Manual sync for payment ID: ${paymentId}`);
    
    const payment = await Payment.findByPk(paymentId, {
      include: [
        { model: Appointment, as: 'appointment' }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }

    console.log(`📋 Current payment status: ${payment.status}`);
    console.log(`📋 PhonePe merchant transaction ID: ${payment.phonepeMerchantTransactionId}`);

    // Force check status with PhonePe
    const statusResult = await phonepeService.checkPaymentStatus(payment.phonepeMerchantTransactionId);
    
    if (statusResult.success) {
      const statusData = statusResult.data;
      console.log(`📊 PhonePe status response:`, statusData);
      
      let newStatus = payment.status;

      // Map PhonePe status to our internal status
      switch (statusData.state) {
        case 'COMPLETED':
        case 'SUCCESS':
          newStatus = 'success';
          break;
        case 'FAILED':
        case 'FAILURE':
          newStatus = 'failed';
          break;
        case 'CANCELLED':
        case 'CANCELED':
          newStatus = 'cancelled';
          break;
        case 'PENDING':
        case 'PROCESSING':
          newStatus = 'processing';
          break;
        default:
          console.log('⚠️ Unknown PhonePe status:', statusData.state);
      }

      // Update database with latest status from PhonePe
      console.log(`🔄 Updating payment ${payment.id} status from ${payment.status} to ${newStatus}`);
      await payment.update({
        status: newStatus,
        completedAt: newStatus === 'success' ? new Date() : null,
        failedAt: newStatus === 'failed' ? new Date() : null,
        failureReason: newStatus === 'failed' ? statusData.responseMessage : null,
        phonepeStatusResponse: statusData,
        phonepeCallbackData: statusData // Manually set callback data
      });

      // Update appointment status if payment is successful
      if (newStatus === 'success' && payment.appointment.status === 'pending') {
        await payment.appointment.update({
          status: 'confirmed',
          confirmedAt: new Date(),
          paymentId: payment.id  // Add payment ID to appointment
        });
        console.log(`✅ Appointment ${payment.appointment.id} status updated to confirmed with payment ID ${payment.id}`);
      }

      return res.json({
        status: 'success',
        message: 'Payment status synced successfully',
        data: {
          paymentId: payment.id,
          oldStatus: payment.status,
          newStatus: newStatus,
          phonepeStatus: statusData.state,
          appointmentStatus: payment.appointment.status
        }
      });
    } else {
      console.log('⚠️ Could not get status from PhonePe:', statusResult.error);
      return res.status(400).json({
        status: 'error',
        message: 'Could not sync with PhonePe',
        error: statusResult.error
      });
    }
  } catch (error) {
    console.error('❌ Manual sync error:', error);
    res.status(500).json({
      status: 'error',
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

    // Always check with PhonePe for real-time status (unless already completed)
    if (payment.status !== 'success' && payment.status !== 'failed' && payment.status !== 'cancelled') {
      console.log('🔄 Checking real-time PhonePe status for payment:', payment.id);
      const statusResult = await phonepeService.checkPaymentStatus(payment.phonepeMerchantTransactionId);
      
      if (statusResult.success) {
        const statusData = statusResult.data;
        let newStatus = payment.status;

        // Map PhonePe status to our internal status
        switch (statusData.state) {
          case 'COMPLETED':
          case 'SUCCESS':
            newStatus = 'success';
            break;
          case 'FAILED':
          case 'FAILURE':
            newStatus = 'failed';
            break;
          case 'CANCELLED':
          case 'CANCELED':
            newStatus = 'cancelled';
            break;
          case 'PENDING':
          case 'PROCESSING':
            newStatus = 'processing';
            break;
          default:
            // Keep current status if we don't recognize the state
            console.log('Unknown PhonePe status:', statusData.state);
        }

        // Update database with latest status from PhonePe
        if (newStatus !== payment.status) {
          console.log(`🔄 Updating payment ${payment.id} status from ${payment.status} to ${newStatus}`);
          await payment.update({
            status: newStatus,
            completedAt: newStatus === 'success' ? new Date() : null,
            failedAt: newStatus === 'failed' ? new Date() : null,
            failureReason: newStatus === 'failed' ? statusData.responseMessage : null,
            phonepeStatusResponse: statusData
          });

          // Update appointment status if payment is successful
          if (newStatus === 'success' && payment.appointment.status === 'pending') {
            await payment.appointment.update({
              status: 'confirmed',
              confirmedAt: new Date()
            });
          }
        }
      } else {
        console.log('⚠️ Could not get status from PhonePe:', statusResult.error);
      }
    } else {
      console.log('💡 Payment already in final state:', payment.status);
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
        { model: User, as: 'user', attributes: ['id', 'name', 'phone'] },
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

/**
 * Get pending payments for user - appointments that need payment
 */
exports.getPendingPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find appointments with pending payments or no payments
    const appointments = await Appointment.findAll({
      where: {
        patientId: userId,
        status: 'pending' // Appointments waiting for payment
      },
      include: [
        {
          model: Payment,
          as: 'payments',
          required: false,
          where: {
            status: {
              [Op.notIn]: ['success'] // Exclude successful payments
            }
          }
        },
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['appointmentDateTime', 'ASC']]
    });

    // Filter appointments that need payment
    const pendingPayments = appointments.filter(appointment => {
      // If no payments exist, or all payments are not successful
      const hasSuccessfulPayment = appointment.payments?.some(payment => payment.status === 'success');
      return !hasSuccessfulPayment;
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Pending payments retrieved successfully',
      data: pendingPayments.map(appointment => ({
        appointmentId: appointment.id,
        appointmentDateTime: appointment.appointmentDateTime,
        type: appointment.type,
        status: appointment.status,
        patientName: appointment.patient.name,
        hasPaymentAttempt: appointment.payments && appointment.payments.length > 0,
        lastPaymentStatus: appointment.payments?.[0]?.status || null,
        lastPaymentId: appointment.payments?.[0]?.id || null,
        canRetryPayment: true
      }))
    });

  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Initiate payment using PhonePe SDK
 */
exports.initiateSDKPayment = async (req, res) => {
  try {
    const { 
      appointmentId, 
      paymentMethod = 'phonepe', 
      integrationType = 'SDK',
      userId,
      redeemCode,
      mobileNumber,
      email
    } = req.body;

    console.log('🔄 Initiating SDK payment:', {
      appointmentId,
      paymentMethod,
      integrationType,
      userId,
      mobileNumber,
      email
    });

    // Validate input
    if (!appointmentId) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Appointment ID is required'
      });
    }


    if (!mobileNumber) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Mobile number is required for SDK integration'
      });
    }

    if (!email) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Email is required for SDK integration'
      });
    }

    // Get appointment details
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'name', 'phone'] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Appointment not found'
      });
    }

    // Check if appointment belongs to the user (if userId is provided)
    if (userId && appointment.userId !== parseInt(userId)) {
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
        message: 'SDK payment is only available for virtual appointments'
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

    // Get virtual appointment price from services prices table
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

    let originalAmount = parseFloat(virtualAppointmentPrice.price);
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let redeemCodeData = null;
    let redeemCodeUsage = null;

    // Process redeem code if provided
    if (redeemCode) {
      const redeemCodeRecord = await RedeemCode.findOne({
        where: { 
          code: redeemCode.toUpperCase(),
          applicableFor: { [Op.in]: ['all', 'virtual_appointment'] }
        }
      });

      if (!redeemCodeRecord) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid redeem code'
        });
      }

      // Validate redeem code
      if (!redeemCodeRecord.isValid()) {
        let reason = 'Redeem code is not valid';
        
        if (!redeemCodeRecord.isActive) reason = 'Redeem code is inactive';
        else if (redeemCodeRecord.validFrom && new Date() < redeemCodeRecord.validFrom) reason = 'Redeem code is not yet active';
        else if (redeemCodeRecord.validUntil && new Date() > redeemCodeRecord.validUntil) reason = 'Redeem code has expired';
        else if (redeemCodeRecord.usageLimit && redeemCodeRecord.usageCount >= redeemCodeRecord.usageLimit) reason = 'Redeem code usage limit exceeded';

        return res.status(400).json({
          status: 'error',
          code: 400,
          message: reason
        });
      }

      // Check user usage limit
      if (redeemCodeRecord.userUsageLimit) {
        const userUsageCount = await RedeemCodeUsage.count({
          where: {
            userId: appointment.userId,
            redeemCodeId: redeemCodeRecord.id
          }
        });

        if (userUsageCount >= redeemCodeRecord.userUsageLimit) {
          return res.status(400).json({
            status: 'error',
            code: 400,
            message: 'You have already used this redeem code maximum number of times'
          });
        }
      }

      // Check minimum order amount
      if (redeemCodeRecord.minOrderAmount && originalAmount < redeemCodeRecord.minOrderAmount) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Minimum order amount is ₹${redeemCodeRecord.minOrderAmount} to use this redeem code`
        });
      }

      // Calculate discount
      discountAmount = redeemCodeRecord.calculateDiscount(originalAmount);
      finalAmount = originalAmount - discountAmount;
      redeemCodeData = redeemCodeRecord;

      // Create redeem code usage record
      redeemCodeUsage = await RedeemCodeUsage.create({
        userId: appointment.userId,
        redeemCodeId: redeemCodeRecord.id,
        appointmentId,
        originalAmount,
        discountAmount,
        finalAmount,
        status: 'applied',
        usedAt: new Date()
      });

      // Update redeem code usage count
      await redeemCodeRecord.increment('usageCount');
    }

    // Generate merchant transaction ID
    const merchantTransactionId = phonepeService.generateMerchantTransactionId(appointment.userId, appointmentId);

    // Create payment record
    const payment = await Payment.create({
      userId: appointment.userId,
      appointmentId,
      amount: finalAmount,
      currency: 'INR',
      paymentMethod,
      status: 'initiated',
      phonepeMerchantTransactionId: merchantTransactionId,
      initiatedAt: new Date(),
      ipAddress: req.ip,
      deviceInfo: {
        userAgent: req.get('User-Agent'),
        platform: req.get('Platform') || 'sdk'
      },
      // integrationType: 'SDK'
    });

    // Link redeem code usage to payment if applicable
    if (redeemCodeUsage) {
      await redeemCodeUsage.update({ paymentId: payment.id });
    }

    // Generate SDK token using PhonePe API
    const sdkTokenResult = await phonepeService.generateSDKToken({
      merchantTransactionId,
      amount: finalAmount,
      userId: appointment.userId,
      mobileNumber,
      email,
      appointmentId
    });

    if (!sdkTokenResult.success) {
      // Update payment status to failed
      await payment.update({
        status: 'failed',
        failureReason: sdkTokenResult.error,
        failedAt: new Date()
      });

      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'SDK token generation failed',
        error: sdkTokenResult.error
      });
    }

    // Update payment with SDK token
    await payment.update({
      phonepeResponse: {
        sdkToken: sdkTokenResult.data.sdkToken,
        payload: sdkTokenResult.data.payload
      }
    });

    console.log('✅ SDK payment initiated successfully for payment ID:', payment.id);

    res.json({
      success: true,
      data: {
        paymentId: `PAY_${payment.id}`,
        orderId: merchantTransactionId,
        sdkToken: sdkTokenResult.data.sdkToken, // Base64 encoded payload with PhonePe order token
        phonepeOrderId: sdkTokenResult.data.phonepeOrderId,
        state: sdkTokenResult.data.state,
        expireAt: sdkTokenResult.data.expireAt,
        amount: finalAmount,
        currency: 'INR',
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        redeemCode: redeemCodeData ? {
          code: redeemCodeData.code,
          name: redeemCodeData.name,
          discountType: redeemCodeData.discountType,
          discountValue: redeemCodeData.discountValue
        } : null
      }
    });

  } catch (error) {
    console.error('SDK payment initiation error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Debug SDK token generation (for testing)
 */
exports.debugSDKToken = async (req, res) => {
  try {
    const { 
      appointmentId = 123, 
      mobileNumber = "+919876543210",
      email = "test@example.com",
      userId = 4
    } = req.body;

    // Get virtual appointment price from services prices table
    const virtualAppointmentPrice = await Price.findOne({
      where: { serviceName: 'Virtual Appointment', isActive: true }
    });

    if (!virtualAppointmentPrice || !virtualAppointmentPrice.price) {
      return res.status(400).json({
        status: 'error',
        message: 'Virtual appointment pricing is not configured'
      });
    }

    const amount = parseFloat(virtualAppointmentPrice.price);

    console.log('🔍 DEBUG: Testing SDK token generation');

    // Generate merchant transaction ID
    const merchantTransactionId = phonepeService.generateMerchantTransactionId(userId, appointmentId);

    // Test SDK token generation
    const sdkTokenResult = await phonepeService.generateSDKToken({
      merchantTransactionId,
      amount,
      userId,
      mobileNumber,
      email,
      appointmentId
    });

    if (!sdkTokenResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'SDK token generation failed',
        error: sdkTokenResult.error
      });
    }

    // Decode the token to verify it
    let decodedToken = null;
    try {
      const decodedString = Buffer.from(sdkTokenResult.data.sdkToken, 'base64').toString('utf-8');
      decodedToken = JSON.parse(decodedString);
    } catch (decodeError) {
      console.error('❌ Token decode error:', decodeError);
    }

    res.json({
      success: true,
      message: 'SDK token generated successfully',
      data: {
        sdkToken: sdkTokenResult.data.sdkToken,
        decodedToken: decodedToken,
        tokenLength: sdkTokenResult.data.sdkToken.length,
        merchantTransactionId: merchantTransactionId,
        phonepeOrderId: sdkTokenResult.data.phonepeOrderId,
        state: sdkTokenResult.data.state,
        expireAt: sdkTokenResult.data.expireAt
      }
    });

  } catch (error) {
    console.error('Debug SDK token error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Debug failed',
      error: error.message
    });
  }
};

/**
 * Complete payment for existing appointment
 */
exports.completePayment = async (req, res) => {
  try {
    const { appointmentId, paymentMethod = 'phonepe', redeemCode } = req.body;
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
    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        patientId: userId,
        status: 'pending' // Only allow payment for pending appointments
      },
      include: [
        { model: User, as: 'patient', attributes: ['id', 'name', 'phone'] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Appointment not found or payment already completed'
      });
    }

    // Check if there's already a successful payment
    const existingSuccessfulPayment = await Payment.findOne({
      where: {
        appointmentId,
        status: 'success'
      }
    });

    if (existingSuccessfulPayment) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Payment already completed for this appointment'
      });
    }

    // Get virtual appointment pricing
    const pricing = await Price.findOne({
      where: {
        serviceName: 'Virtual Appointment',
        isActive: true
      }
    });

    if (!pricing) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Virtual appointment pricing is not configured'
      });
    }

    let originalAmount = parseFloat(pricing.price);
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let redeemCodeData = null;
    let redeemCodeUsage = null;

    // Process redeem code if provided (same logic as initiatePayment)
    if (redeemCode) {
      const redeemCodeRecord = await RedeemCode.findOne({
        where: { 
          code: redeemCode.toUpperCase(),
          applicableFor: { [Op.in]: ['all', 'virtual_appointment'] }
        }
      });

      if (!redeemCodeRecord) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid redeem code'
        });
      }

      if (!redeemCodeRecord.isValid()) {
        let reason = 'Redeem code is not valid';
        
        if (!redeemCodeRecord.isActive) reason = 'Redeem code is inactive';
        else if (redeemCodeRecord.validFrom && new Date() < redeemCodeRecord.validFrom) reason = 'Redeem code is not yet active';
        else if (redeemCodeRecord.validUntil && new Date() > redeemCodeRecord.validUntil) reason = 'Redeem code has expired';
        else if (redeemCodeRecord.usageLimit && redeemCodeRecord.usageCount >= redeemCodeRecord.usageLimit) reason = 'Redeem code usage limit exceeded';

        return res.status(400).json({
          status: 'error',
          code: 400,
          message: reason
        });
      }

      if (redeemCodeRecord.userUsageLimit) {
        const userUsageCount = await RedeemCodeUsage.count({
          where: {
            userId,
            redeemCodeId: redeemCodeRecord.id
          }
        });

        if (userUsageCount >= redeemCodeRecord.userUsageLimit) {
          return res.status(400).json({
            status: 'error',
            code: 400,
            message: 'You have already used this redeem code maximum number of times'
          });
        }
      }

      if (redeemCodeRecord.minOrderAmount && originalAmount < redeemCodeRecord.minOrderAmount) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Minimum order amount is ₹${redeemCodeRecord.minOrderAmount} to use this redeem code`
        });
      }

      discountAmount = redeemCodeRecord.calculateDiscount(originalAmount);
      finalAmount = originalAmount - discountAmount;
      redeemCodeData = redeemCodeRecord;

      redeemCodeUsage = await RedeemCodeUsage.create({
        userId,
        redeemCodeId: redeemCodeRecord.id,
        appointmentId,
        originalAmount,
        discountAmount,
        finalAmount,
        status: 'applied',
        usedAt: new Date()
      });

      await redeemCodeRecord.increment('usageCount');
    }

    const amount = finalAmount;

    // Generate new merchant transaction ID
    const merchantTransactionId = phonepeService.generateMerchantTransactionId(userId, appointmentId);

    // Create new payment record
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

    // Link redeem code usage to payment if applicable
    if (redeemCodeUsage) {
      await redeemCodeUsage.update({ paymentId: payment.id });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Payment initiated successfully for existing appointment',
      data: {
        paymentId: payment.id,
        paymentUrl: paymentResult.data.paymentUrl,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        finalAmount: amount,
        currency: 'INR',
        merchantTransactionId: merchantTransactionId,
        appointmentId: appointmentId,
        appointmentDateTime: appointment.appointmentDateTime,
        redeemCode: redeemCodeData ? {
          code: redeemCodeData.code,
          name: redeemCodeData.name,
          discountType: redeemCodeData.discountType,
          discountValue: redeemCodeData.discountValue
        } : null
      }
    });

  } catch (error) {
    console.error('Complete payment error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      error: error.message
    });
  }
};