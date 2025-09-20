/**
 * PhonePe Configuration
 * 
 * Environment Variables:
 * - PHONEPE_ENVIRONMENT: 'PRODUCTION' or 'SANDBOX' (default: PRODUCTION)
 * 
 * To switch environments:
 * 1. Set PHONEPE_ENVIRONMENT=SANDBOX in .env for testing
 * 2. Set PHONEPE_ENVIRONMENT=PRODUCTION in .env for live payments
 */

const PHONEPE_CONFIG = {
  PRODUCTION: {
    name: 'Production',
    tokenUrl: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
    paymentUrl: 'https://api.phonepe.com/apis/pg/checkout/v2/pay',
    statusBaseUrl: 'https://api.phonepe.com/apis/pg/checkout/v2/status',
    legacyStatusUrl: 'https://api.phonepe.com/apis/hermes/pg/v1/status',
    description: 'Live PhonePe environment - Real money transactions'
  },
  SANDBOX: {
    name: 'Sandbox/Testing',
    tokenUrl: 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
    paymentUrl: 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
    statusBaseUrl: 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/status',
    legacyStatusUrl: 'https://api-preprod.phonepe.com/apis/hermes/pg/v1/status',
    description: 'Testing environment - No real money transactions'
  }
};

// Get current environment
const getCurrentEnvironment = () => {
  const env = (process.env.PHONEPE_ENVIRONMENT || 'PRODUCTION').toUpperCase();
  return PHONEPE_CONFIG[env] || PHONEPE_CONFIG.PRODUCTION;
};

// Get environment name
const getEnvironmentName = () => {
  return (process.env.PHONEPE_ENVIRONMENT || 'PRODUCTION').toUpperCase();
};

// Validate environment
const isValidEnvironment = (env) => {
  return env && (env.toUpperCase() === 'PRODUCTION' || env.toUpperCase() === 'SANDBOX');
};

module.exports = {
  PHONEPE_CONFIG,
  getCurrentEnvironment,
  getEnvironmentName,
  isValidEnvironment
};
