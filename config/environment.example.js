// Environment Configuration Example
// Copy this file to .env and update with your actual values

module.exports = {
  // Database Configuration
  DB_HOST: 'localhost',
  DB_PORT: 3306,
  DB_NAME: 'sid_clinic',
  DB_USER: 'your_db_user',
  DB_PASS: 'your_db_password',

  // JWT Configuration
  JWT_SECRET: 'your-super-secure-jwt-secret-key-minimum-32-characters',
  JWT_EXPIRES_IN: '24h',

  // Server Configuration
  NODE_ENV: 'development',
  PORT: 3000,
  HOST: '0.0.0.0',

  // CORS Configuration (comma-separated for production)
  ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',

  // Email Configuration
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: 587,
  EMAIL_USER: 'your-email@gmail.com',
  EMAIL_PASS: 'your-app-password',

  // Firebase Configuration
  FIREBASE_PROJECT_ID: 'your-firebase-project-id',
  FIREBASE_PRIVATE_KEY: 'your-firebase-private-key',
  FIREBASE_CLIENT_EMAIL: 'your-firebase-client-email',

  // Twilio Configuration
  TWILIO_ACCOUNT_SID: 'your-twilio-account-sid',
  TWILIO_AUTH_TOKEN: 'your-twilio-auth-token',
  TWILIO_PHONE_NUMBER: 'your-twilio-phone-number',

  // Azure Communication Services
  AZURE_COMMUNICATION_CONNECTION_STRING: 'your-azure-connection-string',

  // File Upload Configuration
  MAX_FILE_SIZE: 10485760, // 10MB
  UPLOAD_PATH: './uploads',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 1000,

  // Logging
  LOG_LEVEL: 'info',
  LOG_FILE_MAX_SIZE: '20m',
  LOG_FILE_MAX_FILES: 5,

  // Backup Configuration
  BACKUP_RETENTION_DAYS: 30,
  BACKUP_MAX_FILES: 30,

  // Security
  BCRYPT_ROUNDS: 12,
  SESSION_SECRET: 'your-session-secret-key'
};
