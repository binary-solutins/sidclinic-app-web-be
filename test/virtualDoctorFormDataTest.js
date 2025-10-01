const axios = require('axios');
const FormData = require('form-data');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

/**
 * Test virtual doctor creation with form data
 */
async function testVirtualDoctorFormData() {
  console.log('🧪 Testing Virtual Doctor Creation with Form Data...\n');

  try {
    // Create form data
    const formData = new FormData();
    formData.append('name', 'Dr. Test Virtual');
    formData.append('phone', '9876543210');
    formData.append('password', 'test123');
    formData.append('gender', 'Male');
    formData.append('specialty', 'General Medicine');
    formData.append('degree', 'MBBS');
    formData.append('yearsOfExperience', '5');
    formData.append('clinicName', 'Test Virtual Clinic');
    formData.append('email', 'test.virtual@clinic.com');
    formData.append('address', '123 Test Street');
    formData.append('country', 'India');
    formData.append('state', 'Maharashtra');
    formData.append('city', 'Mumbai');
    formData.append('locationPin', '400001');
    formData.append('startTime', '09:00:00');
    formData.append('endTime', '18:00:00');

    // Test with form data
    console.log('📤 Testing with multipart/form-data...');
    const formDataResponse = await axios.post(
      `${BASE_URL}/api/admin/virtual-doctors`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      }
    );

    console.log('✅ Form Data Response:', {
      status: formDataResponse.status,
      data: formDataResponse.data
    });

    // Test with JSON data
    console.log('\n📤 Testing with application/json...');
    const jsonData = {
      name: 'Dr. Test Virtual JSON',
      phone: '9876543211',
      password: 'test123',
      gender: 'Female',
      specialty: 'Cardiology',
      degree: 'MD',
      yearsOfExperience: 3,
      clinicName: 'Test Virtual Clinic JSON',
      email: 'test.virtual.json@clinic.com',
      address: '456 Test Street',
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      locationPin: '560001',
      startTime: '08:00:00',
      endTime: '17:00:00'
    };

    const jsonResponse = await axios.post(
      `${BASE_URL}/api/admin/virtual-doctors`,
      jsonData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      }
    );

    console.log('✅ JSON Response:', {
      status: jsonResponse.status,
      data: jsonResponse.data
    });

    console.log('\n🎉 Both form data and JSON requests work successfully!');

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

/**
 * Test virtual doctor creation with JSON data
 */
async function testVirtualDoctorJSON() {
  console.log('🧪 Testing Virtual Doctor Creation with JSON...\n');

  try {
    const jsonData = {
      name: 'Dr. Test Virtual JSON',
      phone: '9876543212',
      password: 'test123',
      gender: 'Male',
      specialty: 'General Medicine',
      degree: 'MBBS',
      yearsOfExperience: 2,
      clinicName: 'Test Virtual Clinic JSON',
      email: 'test.virtual.json2@clinic.com',
      address: '789 Test Street',
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      locationPin: '110001',
      startTime: '10:00:00',
      endTime: '19:00:00'
    };

    const response = await axios.post(
      `${BASE_URL}/api/admin/virtual-doctors`,
      jsonData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      }
    );

    console.log('✅ JSON Response:', {
      status: response.status,
      data: response.data
    });

  } catch (error) {
    console.error('❌ JSON Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Virtual Doctor Form Data Tests...\n');
  
  // Check if required dependencies are available
  try {
    require('form-data');
    require('axios');
  } catch (error) {
    console.error('❌ Missing dependencies. Please install:');
    console.error('npm install axios form-data');
    process.exit(1);
  }

  // Run tests
  testVirtualDoctorFormData()
    .then(() => testVirtualDoctorJSON())
    .then(() => {
      console.log('\n✨ All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  testVirtualDoctorFormData,
  testVirtualDoctorJSON
};
