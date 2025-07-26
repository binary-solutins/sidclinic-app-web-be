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
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const User = require('../models/user.model');
const { Op } = require('sequelize');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'User already exists',
        data: null
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    if (process.env.USE_PHONE_EMAIL === 'true') {
      // Send OTP via email-to-sms
      const smsEmail = `${phone}@phone.email`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: smsEmail,
        subject: '',
        text: `Your OTP is: ${otp}`
      };

      await transporter.sendMail(mailOptions);
    } else {
      // Send OTP via Twilio
      await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications
        .create({ to: phone, channel: 'sms' });
    }

    // Store OTP temporarily (in-memory)
    global.otpCache = global.otpCache || {};
    global.otpCache[phone] = otp;

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'OTP sent successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to send OTP',
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

    // Validate OTP (if using phone.email fallback)
    if (process.env.USE_PHONE_EMAIL === 'true') {
      if (!global.otpCache || global.otpCache[phone] !== Number(otp)) {
        return res.status(401).json({
          status: 'error',
          code: 401,
          message: 'Invalid or expired OTP',
          data: null
        });
      }
      delete global.otpCache[phone]; // clear it after use
    }

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
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Registration failed',
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
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'phone', 'role', 'gender']
    });
    res.json({
      status: 'success',
      code: 200,
      message: 'Profile retrieved successfully',
      data: user
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
