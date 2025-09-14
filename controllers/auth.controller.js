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

    // Format phone number consistently - remove any +91 prefix and non-digits
    const formattedPhone = phone ? phone.replace(/^\+?91/, '').replace(/\D/g, '') : '';

    // Validate phone number format (must be exactly 10 digits, no country code)
    if (!formattedPhone || !/^[6-9]\d{9}$/.test(formattedPhone)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Please provide a valid 10-digit Indian mobile number (without country code)',
        data: null
      });
    }

    // Check if user exists to determine the type of OTP
    const existingUser = await User.findOne({ where: { phone: formattedPhone } });
    const isExistingUser = !!existingUser;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Always use the approved template
    const message = SMS_TEMPLATE.OTP_MESSAGE(otp);

    // Send OTP via SMSGatewayHub - pass OTP for variable replacement
    // Ensure the OTP is passed as a string for replacement
    await sendSMSViaGatewayHub(formattedPhone, message, String(otp));

    // Store OTP temporarily with expiration (5 minutes)
    global.otpCache = global.otpCache || {};
    global.otpCache[formattedPhone] = {
      otp: otp,
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes from now
      verified: false, // Mark as not verified initially
      type: isExistingUser ? 'login' : 'registration' // Mark type based on user existence
    };

    // Clean up expired OTPs
    setTimeout(() => {
      if (global.otpCache && global.otpCache[formattedPhone]) {
        delete global.otpCache[formattedPhone];
      }
    }, 5 * 60 * 1000);

    res.status(200).json({
      status: 'success',
      code: 200,
      message: isExistingUser ? 'OTP sent successfully for login' : 'OTP sent successfully for registration',
      data: {
        expiresIn: '5 minutes',
        isExistingUser: isExistingUser
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

    // Format phone number consistently - remove any +91 prefix and non-digits
    const formattedPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');

    // Check if OTP exists and is valid
    if (!global.otpCache || !global.otpCache[formattedPhone]) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'OTP not found or expired',
        data: null
      });
    }

    const storedOtpData = global.otpCache[formattedPhone];

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      delete global.otpCache[formattedPhone];
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
    global.otpCache[formattedPhone].verified = true;

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


exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Format phone number consistently - remove any +91 prefix and non-digits
    const formattedPhone = phone ? phone.replace(/^\+?91/, '').replace(/\D/g, '') : '';

    // Validate phone number format (must be exactly 10 digits, no country code)
    if (!formattedPhone || !/^[6-9]\d{9}$/.test(formattedPhone)) {
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
    await sendSMSViaGatewayHub(formattedPhone, message, String(otp));

    // Update OTP cache
    global.otpCache = global.otpCache || {};
    global.otpCache[formattedPhone] = {
      otp: otp,
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes from now
      verified: false, // Mark as not verified initially
      type: 'registration' // Mark this as registration OTP
    };

    // Clean up expired OTPs
    setTimeout(() => {
      if (global.otpCache && global.otpCache[formattedPhone]) {
        delete global.otpCache[formattedPhone];
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

    // Format phone number consistently - remove any +91 prefix and non-digits
    const formattedPhone = phone ? phone.replace(/^\+?91/, '').replace(/\D/g, '') : '';

    // Debug log: incoming login request
    console.debug(`[LOGIN] Attempting login for phone: ${formattedPhone}, password entered: "${password}"`);

    // Find user by phone
    const user = await User.findOne({ where: { phone: formattedPhone } });

    // Debug log: user lookup result
    if (!user) {
      console.debug(`[LOGIN] No user found for phone: ${formattedPhone}. Entered password: "${password}"`);
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Invalid credentials (user not found)',
        data: null
      });
    } else {
      console.debug(`[LOGIN] User found for phone: ${formattedPhone}, userId: ${user.id}`);
      // For debugging only: log the real password hash and entered password
      // WARNING: Never log real passwords in production!
      console.debug(`[LOGIN] User's password hash: ${user.password}`);
      // If you want to log the result of password comparison:
      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        console.debug(`[LOGIN] Password mismatch for phone: ${formattedPhone}. Entered: "${password}", Expected hash: "${user.password}"`);
        return res.status(401).json({
          status: 'error',
          code: 401,
          message: 'Invalid credentials (password mismatch)',
          data: null
        });
      }
    }

    // Check if user is a doctor and if they are approved
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { userId: user.id } });
      if (doctor && !doctor.isApproved) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'User currently in verification, not approved',
          data: null
        });
      }
    }

    const token = generateToken(user);

    // Debug log: successful login
    console.debug(`[LOGIN] Login successful for userId: ${user.id}, phone: ${phone}`);

    // If user is a doctor, fetch doctor id
    let doctorId = null;
    let patientId = null;
    if (user.role === 'doctor') {
      // Lazy require to avoid circular dependency if any
      const Doctor = require('../models/doctor.model');
      const doctor = await Doctor.findOne({ where: { userId: user.id }, attributes: ['id'] });
      if (doctor) {
        doctorId = doctor.id;
      }
    } else if (user.role === 'user') {
      // Lazy require to avoid circular dependency if any
      const Patient = require('../models/patient.model');
      const patient = await Patient.findOne({ where: { userId: user.id }, attributes: ['id'] });
      if (patient) {
        patientId = patient.id;
      }
    }

    // Build response data
    const responseData = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token
    };
    if (doctorId) {
      responseData.doctorId = doctorId;
    }
    if (patientId) {
      responseData.patientId = patientId;
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Login successful',
      data: responseData
    });
  } catch (error) {
    console.error('[LOGIN] Error during login:', error);
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

/**
 * Check if a user exists by phone number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkUserExists = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Format phone number - remove any +91 prefix and non-digits
    const formattedPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');

    if (formattedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please enter a valid 10-digit number.'
      });
    }

    // Check if user exists - use the formatted phone number without +91 prefix
    const user = await User.findOne({
      where: {
        phone: formattedPhone
      }
    });

    return res.status(200).json({
      success: true,
      exists: !!user,
      message: user ? 'User exists' : 'User does not exist'
    });

  } catch (error) {
    console.error('Check user exists error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Send OTP for password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendResetOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Format phone number - remove any +91 prefix and non-digits
    const formattedPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');

    if (formattedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please enter a valid 10-digit number.'
      });
    }

    // Check if user exists - use the formatted phone number without +91 prefix
    const user = await User.findOne({
      where: {
        phone: formattedPhone
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found with this phone number'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database - use formatted phone number
    const OTP = require('../models/Otp.model');

    // Check if OTP already exists for this phone number
    const existingOtp = await OTP.findByPk(formattedPhone);

    if (existingOtp) {
      // Update existing OTP
      await existingOtp.update({
        otp,
        expirationTime
      });
    } else {
      // Create new OTP
      await OTP.create({
        phone: formattedPhone,
        otp,
        expirationTime
      });
    }

    // Send OTP via SMS
    try {
      await sendSMSViaGatewayHub(formattedPhone, SMS_TEMPLATE.OTP_MESSAGE(otp), otp);

      return res.status(200).json({
        success: true,
        message: 'Reset OTP sent successfully'
      });
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

  } catch (error) {
    console.error('Send reset OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Reset password with OTP verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    // Validate input
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, OTP, and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Format phone number - remove any +91 prefix and non-digits
    const formattedPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');

    if (formattedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Check if user exists - use the formatted phone number without +91 prefix
    const user = await User.findOne({
      where: {
        phone: formattedPhone
      }
    });
    //! maybe need to update here
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP using in-memory cache
    if (!global.otpCache || !global.otpCache[formattedPhone]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const storedOtpData = global.otpCache[formattedPhone];

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      delete global.otpCache[formattedPhone];
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if OTP matches (compare as string to avoid type issues)
    if (String(storedOtpData.otp) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // OTP verified - delete from cache to prevent reuse
    delete global.otpCache[formattedPhone];

    // Update user password
    user.password = newPassword; // Will be hashed by the model hook
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Send OTP for login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendLoginOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Format phone number - remove any +91 prefix and non-digits
    const formattedPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');

    if (formattedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please enter a valid 10-digit number.'
      });
    }

    // Check if user exists - use the formatted phone number without +91 prefix
    const user = await User.findOne({
      where: {
        phone: formattedPhone
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found with this phone number'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationTime = Date.now() + (10 * 60 * 1000); // 10 minutes from now

    // Store OTP in cache memory
    global.otpCache = global.otpCache || {};
    global.otpCache[formattedPhone] = {
      otp: otp,
      expiresAt: expirationTime,
      verified: false, // Mark as not verified initially
      type: 'login' // Mark this as login OTP
    };

    // Clean up expired OTPs after 10 minutes
    setTimeout(() => {
      if (global.otpCache && global.otpCache[formattedPhone]) {
        delete global.otpCache[formattedPhone];
      }
    }, 10 * 60 * 1000);

    // Send OTP via SMS
    try {
      await sendSMSViaGatewayHub(formattedPhone, SMS_TEMPLATE.OTP_MESSAGE(otp), otp);

      return res.status(200).json({
        success: true,
        message: 'Login OTP sent successfully'
      });
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Clean up the OTP from cache if SMS fails
      if (global.otpCache && global.otpCache[formattedPhone]) {
        delete global.otpCache[formattedPhone];
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

  } catch (error) {
    console.error('Send login OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Login with OTP verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const loginWithOtp = async (req, res) => {
  try {
    const { phone, otp, name, password, gender, role = 'user' } = req.body;

    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Format phone number - remove any +91 prefix and non-digits
    const formattedPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');

    if (formattedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Verify OTP using in-memory cache
    if (!global.otpCache || !global.otpCache[formattedPhone]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const storedOtpData = global.otpCache[formattedPhone];

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      delete global.otpCache[formattedPhone];
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if OTP matches (compare as string to avoid type issues)
    if (String(storedOtpData.otp) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Check if user already exists
    let user = await User.findOne({
      where: {
        phone: formattedPhone
      }
    });

    if (user) {
      // EXISTING USER - LOGIN
      // Check if user is a doctor and if they are approved
      if (user.role === 'doctor') {
        const doctor = await Doctor.findOne({ where: { userId: user.id } });
        if (doctor && !doctor.isApproved) {
          return res.status(403).json({
            success: false,
            message: 'User currently in verification, not approved'
          });
        }
      }

      // Generate token
      const token = generateToken(user);

      // Get patient/doctor ID if applicable
      let doctorId = null;
      let patientId = null;
      if (user.role === 'doctor') {
        const doctor = await Doctor.findOne({ where: { userId: user.id }, attributes: ['id'] });
        if (doctor) {
          doctorId = doctor.id;
        }
      } else if (user.role === 'user') {
        const Patient = require('../models/patient.model');
        const patient = await Patient.findOne({ where: { userId: user.id }, attributes: ['id'] });
        if (patient) {
          patientId = patient.id;
        }
      }

      // Build response data
      const responseData = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        token
      };
      if (doctorId) {
        responseData.doctorId = doctorId;
      }
      if (patientId) {
        responseData.patientId = patientId;
      }

      // Clean up OTP cache
      delete global.otpCache[formattedPhone];

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: responseData
      });

    } else {
      // NEW USER - REGISTRATION
      // Check if registration data is provided
      if (!name || !password || !gender) {
        return res.status(400).json({
          success: false,
          message: 'Registration data required: name, password, and gender are needed for new user registration'
        });
      }

      try {
        // Create the user
        user = await User.create({ name, phone: formattedPhone, password, gender, role });
        
        // If user role is 'user', automatically create a patient record
        if (role === 'user') {
          try {
            const Patient = require('../models/patient.model');
            await Patient.create({
              userId: user.id,
              email: `${formattedPhone}@temp.com`, // Temporary email using phone
              dateOfBirth: null, // Will be updated later
              languagePreference: 'English',
              isActive: true
            });
            console.log(`Patient record created for user ${user.id}`);
          } catch (patientError) {
            console.error('Error creating patient record:', patientError);
            // Don't fail the registration if patient creation fails
          }
        }
        
        // If user role is 'admin', automatically create admin settings
        if (role === 'admin') {
          try {
            const AdminSetting = require('../models/adminSetting.model');
            await AdminSetting.create({
              userId: user.id,
              virtualAppointmentStartTime: '09:00:00',
              virtualAppointmentEndTime: '18:00:00',
              alertEmails: null,
              isActive: true
            });
            console.log(`Admin settings created for user ${user.id}`);
          } catch (adminSettingError) {
            console.error('Error creating admin settings:', adminSettingError);
            // Don't fail the registration if admin settings creation fails
          }
        }

        // Generate token
        const token = generateToken(user);

        // Get patient/doctor ID if applicable
        let doctorId = null;
        let patientId = null;
        if (role === 'doctor') {
          const doctor = await Doctor.findOne({ where: { userId: user.id }, attributes: ['id'] });
          if (doctor) {
            doctorId = doctor.id;
          }
        } else if (role === 'user') {
          const Patient = require('../models/patient.model');
          const patient = await Patient.findOne({ where: { userId: user.id }, attributes: ['id'] });
          if (patient) {
            patientId = patient.id;
          }
        }

        // Build response data
        const responseData = {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          token
        };
        if (doctorId) {
          responseData.doctorId = doctorId;
        }
        if (patientId) {
          responseData.patientId = patientId;
        }

        // Clean up OTP cache
        delete global.otpCache[formattedPhone];

        return res.status(201).json({
          success: true,
          message: 'Registration completed successfully',
          data: responseData
        });

      } catch (userCreationError) {
        console.error('User creation error:', userCreationError);
        // Clean up OTP cache on error
        delete global.otpCache[formattedPhone];
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account'
        });
      }
    }

  } catch (error) {
    console.error('Login/Register with OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  sendOtp: exports.sendOtp,
  verifyOtp: exports.verifyOtp,
  resendOtp: exports.resendOtp,
  login: exports.login,
  getProfile: exports.getProfile,
  checkUserExists,
  sendResetOtp,
  resetPassword,
  sendLoginOtp,
  loginWithOtp
};
