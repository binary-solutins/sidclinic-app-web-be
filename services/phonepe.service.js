const crypto = require('crypto');
const axios = require('axios');
const Payment = require('../models/payment.model');

class PhonePeService {
  constructor() {
    // Always use PRODUCTION environment (simplified)
    this.environmentName = 'PRODUCTION';
    this.config = {
      name: 'Production',
      tokenUrl: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
      paymentUrl: 'https://api.phonepe.com/apis/pg/checkout/v2/pay',
      statusBaseUrl: 'https://api.phonepe.com/apis/pg/checkout/v2/order',
      legacyStatusUrl: 'https://api.phonepe.com/apis/hermes/pg/v1/status',
      description: 'Live PhonePe environment - Real money transactions'
    };
    
    // OAuth2 credentials for token generation (with env fallbacks)
    this.clientId = process.env.PHONEPE_CLIENT_ID || 'SU2509171722305638483883';
    this.clientSecret = process.env.PHONEPE_CLIENT_SECRET || '14aa2133-ae84-4b72-9149-5154e703ff07';
    this.clientVersion = process.env.PHONEPE_CLIENT_VERSION || '1';
    
    // Legacy credentials (with env fallbacks)
    this.merchantId = process.env.PHONEPE_MERCHANT_ID || 'M23FV8VNJV8MQ';
    this.saltKey = process.env.PHONEPE_SALT_KEY || '14aa2133-ae84-4b72-9149-5154e703ff07';
    this.saltIndex = parseInt(process.env.PHONEPE_SALT_INDEX) || 1;
    
    // Environment-based API endpoints from config
    this.tokenUrl = this.config.tokenUrl;
    this.paymentUrl = this.config.paymentUrl;
    this.statusBaseUrl = this.config.statusBaseUrl;
    this.legacyStatusBaseUrl = this.config.legacyStatusUrl;
    
    // Production-only URLs (no development mode)
    this.redirectUrl = process.env.REDIRECT_URL || 'https://sidclinic.com/dashboard';
    this.callbackUrl = process.env.CALLBACK_URL || 'https://apis.sidclinic.com/api/payment/phonepe/callback';
    
    // Token storage
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    // Log configuration for debugging
    console.log('🔧 PhonePe Service initialized');
    console.log('🌍 Environment:', this.environmentName, `(${this.config.name})`);
    console.log('📝 Description:', this.config.description);
    console.log('📋 Client ID:', this.clientId);
    console.log('🔑 Client Secret:', this.clientSecret ? '***' + this.clientSecret.slice(-4) : 'MISSING');
    console.log('🌐 Token URL:', this.tokenUrl);
    console.log('🌐 Payment URL:', this.paymentUrl);
    console.log('🌐 Status URL:', this.statusBaseUrl);
    console.log('🔗 Redirect URL:', this.redirectUrl);
    console.log('🔗 Callback URL:', this.callbackUrl);
    console.log('🌍 Environment: PRODUCTION (hardcoded)');
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
   * Generate merchant transaction ID
   */
  generateMerchantTransactionId(userId, appointmentId) {
    return `TXN_${userId}_${appointmentId}_${Date.now()}`;
  }

  /**
   * Generate OAuth2 access token (as per PhonePe official documentation)
   */
  async generateAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt * 1000) {
        console.log('🔄 Using existing valid access token');
        return this.accessToken;
      }

      console.log('🔄 Generating new OAuth2 access token...');

      // Prepare request data as per PhonePe documentation
      const requestData = new URLSearchParams({
        client_id: this.clientId,
        client_version: this.clientVersion,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      });

      console.log('📋 OAuth2 Request Data:', {
        client_id: this.clientId,
        client_version: this.clientVersion,
        client_secret: this.clientSecret ? '***' + this.clientSecret.slice(-4) : 'MISSING',
        grant_type: 'client_credentials'
      });
      console.log('🌐 Token URL:', this.tokenUrl);

      const response = await axios.post(this.tokenUrl, requestData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('📋 OAuth2 Response:', response.data);

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiresAt = response.data.expires_at;
        
        console.log('✅ OAuth2 token generated successfully');
        console.log('🕒 Token expires at:', new Date(this.tokenExpiresAt * 1000).toISOString());
        
        return this.accessToken;
      } else {
        throw new Error('Invalid OAuth2 response');
      }

    } catch (error) {
      console.error('❌ OAuth2 token generation failed:');
      console.error('   Status:', error.response?.status);
      console.error('   Status Text:', error.response?.statusText);
      console.error('   Response Data:', error.response?.data);
      console.error('   Request URL:', this.tokenUrl);
      console.error('   Request Headers:', error.config?.headers);
      console.error('   Error Message:', error.message);
      throw new Error('Failed to generate access token: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Legacy Bearer token method (deprecated - keeping for fallback)
   */
  generateAuthToken() {
    // For the new API, we need to create a JWT-like token
    // Using merchant ID and salt key to create the token
    const payload = {
      merchantId: this.merchantId,
      expiresOn: Date.now() + (60 * 60 * 1000) // 1 hour from now
    };

    const payloadString = JSON.stringify(payload);
    const base64Payload = Buffer.from(payloadString).toString('base64');
    
    // Create signature using salt key
    const signature = crypto
      .createHmac('sha256', this.saltKey)
      .update(base64Payload)
      .digest('hex');

    // Create token in JWT-like format
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    return `${header}.${base64Payload}.${signature}`;
  }

  /**
   * Initiate payment with PhonePe (Mock Implementation for Testing)
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

      console.log('🔄 Initiating PhonePe payment:', {
        merchantTransactionId,
        amount,
        userId,
        appointmentId
      });

      // Try PhonePe OAuth2 + v2 API integration
      console.log('🔄 Attempting PhonePe OAuth2 + v2 API integration...');
      
      try {
        // Step 1: Get OAuth2 access token
        const accessToken = await this.generateAccessToken();
        
        // Step 2: Use token to initiate payment (exact format from PhonePe docs)
        const payload = {
          merchantOrderId: merchantTransactionId,
          amount: Math.round(amount * 100), // Convert to paise
          expireAfter: 3600, // 1 hour expiry
          metaInfo: {
            udf1: `appointment_${appointmentId}`,
            udf2: `user_${userId}`,
            udf3: "sid_clinic_payment"
          },
          paymentFlow: {
            type: "PG_CHECKOUT",
            message: "SID Clinic Virtual Appointment Payment",
            merchantUrls: {
              redirectUrl: this.redirectUrl
            }
          }
        };

        console.log('📋 PhonePe v2 API Payload:', payload);

        const response = await axios.post(this.paymentUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });

        console.log('📋 PhonePe v2 API Response:', response.data);

        if (response.data && response.data.orderId && response.data.redirectUrl) {
          console.log('✅ PhonePe v2 API call successful!');
          console.log('🔗 Payment URL:', response.data.redirectUrl);
          return {
            success: true,
            data: {
              phonepeTransactionId: response.data.orderId,
              paymentUrl: response.data.redirectUrl,
              orderState: response.data.state,
              expiresAt: response.data.expireAt
            }
          };
        } else {
          console.log('❌ PhonePe API returned unexpected response:', response.data);
          throw new Error('Invalid response from PhonePe: ' + JSON.stringify(response.data));
        }
        
      } catch (apiError) {
        console.log('❌ PhonePe OAuth2 + v2 API failed:');
        console.log('   Status:', apiError.response?.status);
        console.log('   Status Text:', apiError.response?.statusText);
        console.log('   Headers:', apiError.response?.headers);
        console.log('   Response Data:', apiError.response?.data);
        console.log('   Error Message:', apiError.message);
        
        // Try legacy method as fallback
        console.log('🔄 Trying legacy Bearer token method...');
        try {
          const payload = {
            merchantOrderId: merchantTransactionId,
            amount: Math.round(amount * 100),
            expireAfter: 3600,
            metaInfo: {
              udf1: `appointment_${appointmentId}`,
              udf2: `user_${userId}`,
              udf3: "sid_clinic_payment"
            },
            paymentFlow: {
              type: "PG_CHECKOUT",
              message: "SID Clinic Virtual Appointment Payment",
              merchantUrls: {
                redirectUrl: this.redirectUrl
              }
            }
          };

          const legacyToken = this.generateAuthToken();
          const response = await axios.post(this.paymentUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `O-Bearer ${legacyToken}`,
              'Accept': 'application/json'
            }
          });

          if (response.data && response.data.orderId && response.data.redirectUrl) {
            console.log('✅ PhonePe legacy method successful!');
            console.log('🔗 Payment URL:', response.data.redirectUrl);
            return {
              success: true,
              data: {
                phonepeTransactionId: response.data.orderId,
                paymentUrl: response.data.redirectUrl,
                orderState: response.data.state,
                expiresAt: response.data.expireAt
              }
            };
          }
        } catch (legacyError) {
          console.log('❌ Legacy method also failed:');
          console.log('   Status:', legacyError.response?.status);
          console.log('   Response Data:', legacyError.response?.data);
          console.log('   Error Message:', legacyError.message);
        }
        
        // If all methods fail, return error instead of mock payment
        console.log('❌ All PhonePe methods failed. No mock payment - only real PhonePe integration.');
        throw new Error('PhonePe payment initiation failed. Please check credentials and try again.');
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
   * Process PhonePe callback (Real Implementation Only)
   */
  async processCallback(callbackData) {
    try {
      console.log('🔄 Processing real PhonePe callback:', callbackData);

      // Real PhonePe implementation - no more mock responses
      const { response, checksum } = callbackData;

      if (!response || !checksum) {
        return {
          success: false,
          error: 'Missing required callback parameters (response or checksum)'
        };
      }

      if (!this.verifyHash(response, checksum)) {
        return {
          success: false,
          error: 'Invalid checksum - callback verification failed'
        };
      }

      const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString());

      return {
        success: true,
        data: {
          merchantTransactionId: decodedResponse.data.merchantTransactionId,
          transactionId: decodedResponse.data.transactionId,
          status: decodedResponse.data.state,
          responseCode: decodedResponse.data.responseCode,
          responseMessage: decodedResponse.data.responseMessage,
          amount: decodedResponse.data.amount,
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
   * Check payment status (Real PhonePe Implementation)
   */
  async checkPaymentStatus(merchantTransactionId) {
    try {
      console.log('🔄 Checking real PhonePe payment status for:', merchantTransactionId);

      // First, let's try a simple approach - the transaction might not exist yet
      // This happens when payment is still pending or user didn't complete payment

      // First, get the orderId - this needs to be outside try-catch blocks
      // We need to get the orderId from the payment record first
      const payment = await Payment.findOne({
        where: {
          phonepeMerchantTransactionId: merchantTransactionId
        }
      });

      console.log('📋 Payment record found:', {
        id: payment?.id,
        hasPhonepeResponse: !!payment?.phonepeResponse,
        phonepeResponse: payment?.phonepeResponse
      });

      if (!payment) {
        console.log('❌ Payment record not found for:', merchantTransactionId);
        throw new Error('Payment record not found');
      }

      // Use the merchantTransactionId that was sent to PhonePe during initiation
      // This is the correct identifier for status checks
      const merchantTxnId = payment.phonepeMerchantTransactionId;
      console.log('📋 Using merchantTransactionId for status check:', merchantTxnId);

      const statusUrl = `${this.statusBaseUrl}/${merchantTxnId}/status?details=false`;

      console.log('📋 Status Check URL:', statusUrl);
      console.log('📋 Using merchantTransactionId:', merchantTxnId);

      // Try with OAuth2 token first - generate fresh token for each status check
      try {
        console.log('🔄 Generating new OAuth2 access token for status check...');

        // Force fresh token by clearing cache
        this.accessToken = null;
        this.tokenExpiresAt = null;

        const accessToken = await this.generateAccessToken();

        // Create checksum for v2 API using merchantTransactionId
        const checksumPayload = `/pg/checkout/v2/order/${merchantTxnId}/status?details=false${this.saltKey}`;
        const hash = crypto.createHash('sha256').update(checksumPayload).digest('hex');
        const checksum = `${hash}###${this.saltIndex}`;

        console.log('📋 Checksum payload:', checksumPayload);
        console.log('📋 Generated checksum:', checksum);
        console.log('📋 Using merchantTransactionId for checksum:', merchantTxnId);
        
        const response = await axios.get(statusUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${accessToken}`,
            'X-MERCHANT-ID': this.merchantId,
            'Accept': 'application/json'
          }
        });

        console.log('📋 PhonePe Status Response:', response.data);

        if (response.data) {
          return {
            success: true,
            data: {
              state: response.data.state,
              responseCode: response.data.code || response.data.responseCode,
              responseMessage: response.data.message || response.data.responseMessage,
              amount: response.data.amount,
              merchantTransactionId: response.data.merchantTransactionId,
              transactionId: response.data.transactionId,
              paymentMethod: response.data.paymentMethod,
              rawResponse: response.data
            }
          };
        } else {
          throw new Error('Invalid status response or payment not found');
        }

      } catch (oauthError) {
        console.log('❌ OAuth2 status check failed:', oauthError.response?.status, oauthError.response?.data);
        
        // Check if this is a 404 - means payment doesn't exist or is still pending
        if (oauthError.response?.status === 404) {
          console.log('💡 404 Error: This usually means:');
          console.log('   1. Payment is still PENDING (user hasn\'t completed payment)');
          console.log('   2. Transaction doesn\'t exist in PhonePe system yet');
          console.log('   3. User abandoned payment without completing');
        }
        
        // Fallback to legacy method
        console.log('🔄 Trying legacy status check method...');
        
        // Legacy API uses different checksum format
        const legacyPayload = `/pg/v1/status/${this.merchantId}/${merchantTxnId}${this.saltKey}`;
        const legacyHash = crypto.createHash('sha256').update(legacyPayload).digest('hex');
        const legacyChecksum = `${legacyHash}###${this.saltIndex}`;

        console.log('📋 Legacy checksum payload:', legacyPayload);
        console.log('📋 Legacy generated checksum:', legacyChecksum);

        // Legacy status URL (environment-specific) - use merchantTransactionId for legacy API
        const legacyUrl = `${this.legacyStatusBaseUrl}/${this.merchantId}/${merchantTxnId}`;

        console.log('📋 Legacy Status Check URL:', legacyUrl);
        console.log('📋 Legacy API using merchantTransactionId:', merchantTxnId);

        const response = await axios.get(legacyUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${accessToken}`,
            'X-MERCHANT-ID': this.merchantId,
            'Accept': 'application/json'
          }
        });

        console.log('📋 PhonePe Legacy Status Response:', response.data);

        if (response.data && response.data.success) {
          return {
            success: true,
            data: {
              state: response.data.data.state,
              responseCode: response.data.data.responseCode,
              responseMessage: response.data.data.responseMessage,
              amount: response.data.data.amount,
              merchantTransactionId: response.data.data.merchantTransactionId,
              transactionId: response.data.data.transactionId,
              paymentMethod: response.data.data.paymentInstrument?.type,
              rawResponse: response.data
            }
          };
        } else {
          return {
            success: false,
            error: response.data.message || 'Status check failed',
            code: response.data.code
          };
        }
      }

    } catch (error) {
      console.error('❌ PhonePe status check error:', error.response?.status, error.response?.data || error.message);
      
      // Provide helpful error messages based on status code
      if (error.response?.status === 404) {
        console.log('💡 404 Error means payment is likely still PENDING or user did not complete payment');
        return {
          success: false,
          error: 'Payment not found - likely still pending or user did not complete payment',
          code: 'PAYMENT_NOT_FOUND',
          suggestion: 'Check if user actually completed the payment on PhonePe page'
        };
      }
      
      return {
        success: false,
        error: 'Unable to check payment status: ' + (error.message || 'Unknown error'),
        code: 'STATUS_CHECK_FAILED'
      };
    }
  }

  /**
   * Generate SDK token using PhonePe's token generation (like normal API)
   */
  async generateSDKToken(paymentData) {
    try {
      const {
        merchantTransactionId,
        amount,
        userId,
        mobileNumber,
        email,
        appointmentId
      } = paymentData;

      console.log('🔄 Generating SDK token using PhonePe API:', {
        merchantTransactionId,
        amount,
        userId,
        mobileNumber,
        email
      });

      // Use PhonePe's token generation (same as normal API)
      const accessToken = await this.generateAccessToken();
      
      // Create payment payload for SDK
      const payload = {
        merchantOrderId: merchantTransactionId,
        amount: Math.round(amount * 100), // Convert to paise
        expireAfter: 3600, // 1 hour expiry
        metaInfo: {
          udf1: `appointment_${appointmentId}`,
          udf2: `user_${userId}`,
          udf3: "sid_clinic_sdk_payment"
        },
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: "SID Clinic Virtual Appointment Payment",
          merchantUrls: {
            redirectUrl: this.redirectUrl
          }
        }
      };

      console.log('📋 SDK Payment Payload:', payload);

      // Call PhonePe API to get SDK token
      const response = await axios.post(this.paymentUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      console.log('📋 PhonePe SDK API Response:', response.data);

      if (response.data && response.data.orderId) {
        console.log('✅ PhonePe SDK token generated successfully');
        return {
          success: true,
          data: {
            sdkToken: response.data.orderId, // Use PhonePe's orderId as SDK token
            paymentUrl: response.data.redirectUrl,
            orderState: response.data.state,
            expiresAt: response.data.expireAt,
            phonepeResponse: response.data
          }
        };
      } else {
        throw new Error('Invalid response from PhonePe SDK API: ' + JSON.stringify(response.data));
      }

    } catch (error) {
      console.error('❌ PhonePe SDK token generation error:', error);
      return {
        success: false,
        error: error.message || 'PhonePe SDK token generation failed'
      };
    }
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods() {
    return {
      phonepe: {
        name: 'PhonePe',
        description: 'Pay using PhonePe wallet, UPI, cards, and net banking',
        icon: 'phonepe-icon'
      }
    };
  }
}

module.exports = new PhonePeService();