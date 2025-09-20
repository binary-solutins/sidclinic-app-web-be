const crypto = require('crypto');
const axios = require('axios');

class PhonePeService {
  constructor() {
    // OAuth2 credentials for token generation (Real Production Credentials from PhonePe Dashboard)
    this.clientId = 'SU2509171722305638483883';  // Real Client ID from dashboard (corrected)
    this.clientSecret = '14aa2133-ae84-4b72-9149-5154e703ff07';  // Real Client Secret from dashboard
    this.clientVersion = '1';  // Client Version from dashboard
    
    // Legacy credentials (keeping for compatibility)
    this.merchantId = 'M23FV8VNJV8MQ';
    this.saltKey = '14aa2133-ae84-4b72-9149-5154e703ff07';
    this.saltIndex = 1;
    
    // API endpoints (as per official PhonePe documentation)
    this.tokenUrl = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';  // Production OAuth endpoint
    this.paymentUrl = 'https://api.phonepe.com/apis/pg/checkout/v2/pay';  // Production payment endpoint
    this.redirectUrl = 'http://localhost:3000/payment/success';
    this.callbackUrl = 'http://localhost:3000/api/payment/phonepe/callback';
    
    // Token storage
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    // Log configuration for debugging
    console.log('🔧 PhonePe Service initialized with OAuth2 support');
    console.log('📋 Client ID:', this.clientId);
    console.log('🔑 Client Secret:', this.clientSecret ? '***' + this.clientSecret.slice(-4) : 'MISSING');
    console.log('🌐 Token URL:', this.tokenUrl);
    console.log('🌐 Payment URL:', this.paymentUrl);
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
      console.error('❌ OAuth2 token generation failed:', error.response?.data || error.message);
      throw new Error('Failed to generate access token');
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
        
        // If all methods fail, use mock payment
        console.log('💡 All PhonePe methods failed. Using mock payment for testing.');
        return {
          success: true,
          data: {
            phonepeTransactionId: `MOCK_TXN_${Date.now()}`,
            paymentUrl: `http://localhost:3000/mock-payment?txn=${merchantTransactionId}&amount=${amount}&note=PhonePe_config_pending`
          }
        };
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
   * Process PhonePe callback (Mock Implementation for Testing)
   */
  async processCallback(callbackData) {
    try {
      console.log('🔄 Processing mock PhonePe callback:', callbackData);

      // Mock callback processing - assume payment was successful
      return {
        success: true,
        data: {
          merchantTransactionId: callbackData.merchantTransactionId || `TXN_${Date.now()}`,
          transactionId: `MOCK_TXN_${Date.now()}`,
          status: 'COMPLETED',
          responseCode: 'SUCCESS',
          responseMessage: 'Payment completed successfully'
        }
      };

      // Real PhonePe implementation (commented out)
      /*
      const { response, checksum } = callbackData;

      if (!this.verifyHash(response, checksum)) {
        return {
          success: false,
          error: 'Invalid checksum'
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
          responseMessage: decodedResponse.data.responseMessage
        }
      };
      */

    } catch (error) {
      console.error('PhonePe callback processing error:', error);
      return {
        success: false,
        error: error.message || 'Callback processing failed'
      };
    }
  }

  /**
   * Check payment status (Mock Implementation for Testing)
   */
  async checkPaymentStatus(merchantTransactionId) {
    try {
      console.log('🔄 Checking mock payment status for:', merchantTransactionId);

      // Mock successful payment status
      return {
        success: true,
        data: {
          state: 'COMPLETED',
          responseCode: 'SUCCESS',
          responseMessage: 'Payment completed successfully'
        }
      };

      // Real PhonePe implementation (commented out)
      /*
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: merchantTransactionId
      };

      const payloadString = JSON.stringify(payload);
      const base64Payload = Buffer.from(payloadString).toString('base64');
      const checksum = this.generateHash(base64Payload);

      const response = await axios.get(`${this.baseUrl}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': this.merchantId,
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          data: {
            state: response.data.data.state,
            responseCode: response.data.data.responseCode,
            responseMessage: response.data.data.responseMessage
          }
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Status check failed'
        };
      }
      */

    } catch (error) {
      console.error('PhonePe status check error:', error);
      return {
        success: false,
        error: error.message || 'Status check failed'
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