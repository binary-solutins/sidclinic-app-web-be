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
const User = require('../models/user.model');
const { Op } = require('sequelize');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

    await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: phone, channel: 'sms' });

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
    const { phone, name, password, gender, role = 'user' } = req.body;

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'User already exists',
        data: null
      });
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