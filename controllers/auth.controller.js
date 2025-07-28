/**
 * @swagger
 * components:
 *   responses:
 *     Unauthorized:
 *       description: Invalid or missing authentication token
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Forbidden:
 *       description: Insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const { Op } = require('sequelize');

// Use only the approved template exactly as provided
const SMS_TEMPLATE = {
  OTP_MESSAGE: (otp) =>
    `You are trying to log into the SID Clinic. Your OTP is: {#var#}. Do not share it with anyone. If you did not initiate this request, please ignore this message.`
};

// SMSGatewayHub configuration
const SMS_GATEWAY_CONFIG = {
  baseURL: 'https://www.smsgatewayhub.com/api/mt/SendSMS',
  APIKey: process.env.SMS_GATEWAY_API_KEY,
  senderid: process.env.SMS_GATEWAY_SENDER_ID || 'OTPVER',
  channel: '2', // Transactional
  DCS: '0',
  flashsms: '0',
  route: process.env.SMS_GATEWAY_ROUTE || '31',
  EntityId: process.env.SMS_GATEWAY_ENTITY_ID || '', // Registered-Entity-Id
  dlttemplateid: process.env.SMS_GATEWAY_DLT_TEMPLATE_ID || '1707175368420666060' // 
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Always use the approved template and replace {#var#} with OTP
const sendSMSViaGatewayHub = async (phone, message, otp = null) => {
  try {
    // Only use the phone number as provided, do not prepend '91'
    let formattedPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');
    
    // Validate it's exactly 10 digits
    if (formattedPhone.length !== 10) {
      throw new Error('Invalid phone number format');
    }
    // Always replace {#var#} with OTP
    let finalMessage = message;
    if (otp && message.includes('{#var#}')) {
      finalMessage = message.replace('{#var#}', otp);
    }

    // Ensure the message sent to the API has the OTP substituted
    const params = {
      APIKey: SMS_GATEWAY_CONFIG.APIKey,
      senderid: SMS_GATEWAY_CONFIG.senderid,
      channel: SMS_GATEWAY_CONFIG.channel,
      DCS: SMS_GATEWAY_CONFIG.DCS,
      flashsms: SMS_GATEWAY_CONFIG.flashsms,
      number: formattedPhone,
      text: finalMessage,
      route: SMS_GATEWAY_CONFIG.route,
      EntityId: SMS_GATEWAY_CONFIG.EntityId,
      dlttemplateid: SMS_GATEWAY_CONFIG.dlttemplateid
    };

    // Debug log to verify the message and params
    console.log('SMS Params:', { ...params });

    const response = await axios.get(SMS_GATEWAY_CONFIG.baseURL, { params });

    console.log('SMS Gateway Response:', response.data);

    // Check if SMS was sent successfully
    if (response.data && (response.data.ErrorCode === '000' || response.data.ErrorCode === 0)) {
      return { success: true, data: response.data };
    } else {
      throw new Error(response.data?.ErrorMessage || 'SMS sending failed');
    }
  } catch (error) {
    console.error('SMS Gateway Error:', error.message);
    console.error('Full Error:', error.response?.data || error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number format (must be exactly 10 digits, no country code)
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Please provide a valid 10-digit Indian mobile number (without country code)',
        data: null
      });
    }

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'User already exists',
        data: null
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Always use the approved template
    const message = SMS_TEMPLATE.OTP_MESSAGE(otp);

    // Send OTP via SMSGatewayHub - pass OTP for variable replacement
    // Ensure the OTP is passed as a string for replacement
    await sendSMSViaGatewayHub(phone, message, String(otp));

    // Store OTP temporarily with expiration (5 minutes)
    global.otpCache = global.otpCache || {};
    global.otpCache[phone] = {
      otp: otp,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes from now
    };

    // Clean up expired OTPs
    setTimeout(() => {
      if (global.otpCache && global.otpCache[phone]) {
        delete global.otpCache[phone];
      }
    }, 5 * 60 * 1000);

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'OTP sent successfully',
      data: {
        expiresIn: '5 minutes'
      }
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to send OTP',
      data: null
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Phone number and OTP are required',
        data: null
      });
    }

    // Check if OTP exists and is valid
    if (!global.otpCache || !global.otpCache[phone]) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'OTP not found or expired',
        data: null
      });
    }

    const storedOtpData = global.otpCache[phone];

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      delete global.otpCache[phone];
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'OTP has expired',
        data: null
      });
    }

    // Check if OTP matches (compare as string to avoid type issues)
    if (String(storedOtpData.otp) !== String(otp)) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Invalid OTP',
        data: null
      });
    }

    // OTP is valid - mark as verified but don't delete yet (for registration)
    global.otpCache[phone].verified = true;

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'OTP verified successfully',
      data: {
        verified: true
      }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'OTP verification failed',
      data: null
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { phone, name, password, gender, role = 'user', otp } = req.body;

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'User already exists',
        data: null
      });
    }

    // Validate OTP
    if (!global.otpCache || !global.otpCache[phone]) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'OTP not found or expired. Please request a new OTP.',
        data: null
      });
    }

    const storedOtpData = global.otpCache[phone];

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      delete global.otpCache[phone];
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'OTP has expired',
        data: null
      });
    }

    // Check if OTP matches (compare as string to avoid type issues)
    if (String(storedOtpData.otp) !== String(otp)) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Invalid OTP',
        data: null
      });
    }

    // Clear OTP after successful verification
    delete global.otpCache[phone];

    const user = await User.create({ name, phone, password, gender, role });
    const token = generateToken(user);

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'User registered successfully',
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Registration failed',
      data: null
    });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number format (must be exactly 10 digits, no country code)
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Please provide a valid 10-digit Indian mobile number (without country code)',
        data: null
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Always use the approved template
    const message = SMS_TEMPLATE.OTP_MESSAGE(otp);

    // Send OTP via SMSGatewayHub
    await sendSMSViaGatewayHub(phone, message, String(otp));

    // Update OTP cache
    global.otpCache = global.otpCache || {};
    global.otpCache[phone] = {
      otp: otp,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes from now
    };

    // Clean up expired OTPs
    setTimeout(() => {
      if (global.otpCache && global.otpCache[phone]) {
        delete global.otpCache[phone];
      }
    }, 5 * 60 * 1000);

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'OTP resent successfully',
      data: {
        expiresIn: '5 minutes'
      }
    });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to resend OTP',
      data: null
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ where: { phone } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Invalid credentials',
        data: null
      });
    }

    const token = generateToken(user);

    res.json({
      status: 'success',
      code: 200,
      message: 'Login successful',
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    // Defensive: check req.user and req.user.id
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Unauthorized: User not authenticated',
        data: null
      });
    }

    // Find user by id
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'phone', 'role', 'gender'],
      include: [
        {
          model: Doctor,
          as: 'Doctor',
          attributes: [
            'id', 'doctorPhoto', 'degree', 'registrationNumber', 'clinicName', 
            'clinicPhotos', 'yearsOfExperience', 'specialty', 'clinicContactNumber', 
            'email', 'address', 'country', 'state', 'city', 'locationPin', 
            'isApproved', 'is_active', 'startTime', 'endTime'
          ],
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'User not found',
        data: null
      });
    }

    // Format the response
    const profileData = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      gender: user.gender
    };

    // Add doctor information if user is a doctor and has doctor data
    if (user.role === 'doctor' && user.Doctor) {
      profileData.doctorInfo = user.Doctor;
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Profile retrieved successfully',
      data: profileData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};
