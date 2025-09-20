const crypto = require('crypto');
const axios = require('axios');

class PhonePeService {
  constructor() {
    this.merchantId = process.env.PHONEPE_MERCHANT_ID;
    this.saltKey = process.env.PHONEPE_SALT_KEY;
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || 1;
    this.baseUrl = process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    this.redirectUrl = process.env.PHONEPE_REDIRECT_URL || 'https://your-app.com/payment/callback';
    this.callbackUrl = process.env.PHONEPE_CALLBACK_URL || 'https://your-app.com/api/payment/phonepe/callback';
  }

  /**
   * Generate SHA256 hash for PhonePe API
   */
  generateHash(payload) {
    const hash = crypto
      .createHash('sha256')
      .update(payload + this.saltKey)
      .digest('hex');
    return hash + '###' + this.saltIndex;
  }

  /**
   * Verify PhonePe callback hash
   */
  verifyHash(payload, receivedHash) {
    const expectedHash = this.generateHash(payload);
    return expectedHash === receivedHash;
  }

  /**
   * Initiate payment with PhonePe
   */
  async initiatePayment(paymentData) {
    try {
      const {
        merchantTransactionId,
        amount,
        userId,
        appointmentId,
        userInfo
      } = paymentData;

      // Create payment request payload
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: merchantTransactionId,
        merchantUserId: userId.toString(),
        amount: amount * 100, // PhonePe expects amount in paise
        redirectUrl: this.redirectUrl,
        redirectMode: 'POST',
        callbackUrl: this.callbackUrl,
        mobileNumber: userInfo.phone,
        paymentInstrument: {
          type: 'PAY_PAGE'
        }
      };

      // Convert payload to base64
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

      // Generate checksum
      const checksum = this.generateHash(base64Payload);

      // Prepare request
      const requestData = {
        request: base64Payload
      };

      // Make API call to PhonePe
      const response = await axios.post(
        `${this.baseUrl}/pg/v1/pay`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'accept': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          data: {
            paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
            transactionId: response.data.data.merchantTransactionId,
            phonepeTransactionId: response.data.data.transactionId
          }
        };
      } else {
        throw new Error(response.data.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('PhonePe payment initiation error:', error);
      return {
        success: false,
        error: error.message || 'Payment initiation failed'
      };
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(merchantTransactionId) {
    try {
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: merchantTransactionId,
        merchantUserId: 'USER_ID' // This can be dynamic based on your needs
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const checksum = this.generateHash(base64Payload);

      const response = await axios.get(
        `${this.baseUrl}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': this.merchantId,
            'accept': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'Status check failed');
      }
    } catch (error) {
      console.error('PhonePe status check error:', error);
      return {
        success: false,
        error: error.message || 'Status check failed'
      };
    }
  }

  /**
   * Process PhonePe callback
   */
  async processCallback(callbackData) {
    try {
      const { response, checksum } = callbackData;

      // Verify checksum
      const base64Payload = Buffer.from(JSON.stringify(response)).toString('base64');
      if (!this.verifyHash(base64Payload, checksum)) {
        throw new Error('Invalid checksum');
      }

      // Decode the response
      const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString());

      return {
        success: true,
        data: {
          merchantTransactionId: decodedResponse.data.merchantTransactionId,
          transactionId: decodedResponse.data.transactionId,
          amount: decodedResponse.data.amount / 100, // Convert from paise to rupees
          status: decodedResponse.data.state,
          code: decodedResponse.code,
          message: decodedResponse.message,
          responseCode: decodedResponse.data.responseCode,
          responseMessage: decodedResponse.data.responseMessage,
          paymentInstrument: decodedResponse.data.paymentInstrument
        }
      };
    } catch (error) {
      console.error('PhonePe callback processing error:', error);
      return {
        success: false,
        error: error.message || 'Callback processing failed'
      };
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(refundData) {
    try {
      const {
        merchantTransactionId,
        originalTransactionId,
        amount,
        reason
      } = refundData;

      const payload = {
        merchantId: this.merchantId,
        merchantUserId: 'USER_ID', // This can be dynamic
        originalTransactionId: originalTransactionId,
        merchantTransactionId: merchantTransactionId,
        amount: amount * 100, // Convert to paise
        callbackUrl: this.callbackUrl
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const checksum = this.generateHash(base64Payload);

      const response = await axios.post(
        `${this.baseUrl}/pg/v1/refund`,
        {
          request: base64Payload
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'accept': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'Refund failed');
      }
    } catch (error) {
      console.error('PhonePe refund error:', error);
      return {
        success: false,
        error: error.message || 'Refund failed'
      };
    }
  }

  /**
   * Get payment methods
   */
  getPaymentMethods() {
    return [
      {
        type: 'UPI',
        name: 'UPI',
        description: 'Pay using UPI ID or QR code'
      },
      {
        type: 'CARD',
        name: 'Credit/Debit Card',
        description: 'Pay using credit or debit card'
      },
      {
        type: 'NETBANKING',
        name: 'Net Banking',
        description: 'Pay using net banking'
      },
      {
        type: 'WALLET',
        name: 'Digital Wallet',
        description: 'Pay using digital wallet'
      }
    ];
  }

  /**
   * Validate payment amount
   */
  validateAmount(amount) {
    if (!amount || amount <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }
    if (amount < 1) {
      return { valid: false, error: 'Minimum amount is ₹1' };
    }
    if (amount > 100000) {
      return { valid: false, error: 'Maximum amount is ₹1,00,000' };
    }
    return { valid: true };
  }

  /**
   * Generate merchant transaction ID
   */
  generateMerchantTransactionId(userId, appointmentId) {
    const timestamp = Date.now();
    return `TXN_${userId}_${appointmentId}_${timestamp}`;
  }
}

module.exports = new PhonePeService();



