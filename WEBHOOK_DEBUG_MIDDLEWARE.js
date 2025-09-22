// Add this middleware to your server.js file BEFORE your routes

const webhookDebugMiddleware = (req, res, next) => {
  // Log ALL requests to payment endpoints
  if (req.url.includes('/payment/') || req.url.includes('/callback')) {
    console.log('🚨🚨🚨 PAYMENT ENDPOINT ACCESS 🚨🚨🚨');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🔗 URL:', req.url);
    console.log('📋 Method:', req.method);
    console.log('🌐 IP:', req.ip);
    console.log('📱 User Agent:', req.get('User-Agent') || 'None');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🚨🚨🚨 PAYMENT ACCESS END 🚨🚨🚨');
  }
  next();
};

module.exports = webhookDebugMiddleware;

// Add this to your server.js:
// const webhookDebugMiddleware = require('./WEBHOOK_DEBUG_MIDDLEWARE');
// app.use(webhookDebugMiddleware);
