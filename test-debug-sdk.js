const axios = require('axios');

async function testSDKToken() {
  try {
    console.log('🔍 Testing SDK token generation...');
    
    const response = await axios.post('http://localhost:3000/api/payment/debug-sdk-token', {
      appointmentId: 123,
      amount: 200,
      mobileNumber: "+919876543210",
      email: "test@example.com",
      userId: 4
    });

    console.log('✅ Backend Response:');
    console.log('📊 Status:', response.status);
    console.log('📋 Success:', response.data.success);
    console.log('📋 Message:', response.data.message);
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('\n🔍 Token Analysis:');
      console.log('📏 Token Length:', data.tokenLength);
      console.log('🆔 PhonePe Order ID:', data.phonepeOrderId);
      console.log('📊 State:', data.state);
      console.log('⏰ Expire At:', new Date(data.expireAt).toISOString());
      
      console.log('\n🔍 Decoded Token:');
      console.log(JSON.stringify(data.decodedToken, null, 2));
      
      console.log('\n✅ Backend is working correctly!');
      console.log('📝 The issue might be in the frontend SDK implementation.');
      
      // Test if token can be decoded properly
      try {
        const decoded = Buffer.from(data.sdkToken, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        console.log('\n✅ Token can be decoded successfully!');
        console.log('📋 Required fields check:');
        console.log('  - merchantId:', !!parsed.merchantId);
        console.log('  - merchantTransactionId:', !!parsed.merchantTransactionId);
        console.log('  - amount:', parsed.amount);
        console.log('  - currency:', parsed.currency);
        console.log('  - mobileNumber:', !!parsed.mobileNumber);
        console.log('  - paymentInstrument:', !!parsed.paymentInstrument);
        console.log('  - orderToken:', !!parsed.orderToken);
      } catch (decodeError) {
        console.log('❌ Token decode failed:', decodeError.message);
      }
    } else {
      console.log('❌ Backend Error:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Response:', error.response.data);
    } else {
      console.error('🌐 Network Error:', error.message);
    }
  }
}

testSDKToken();
