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
      return res.status(400).json({ message: 'User already exists' });
    }

    await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: phone, channel: 'sms' });

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to send OTP' });
  }
};

exports.register = async (req, res) => {
  try {
    const { phone, otp, name, password, gender, role = 'user' } = req.body;
    
    const verificationCheck = await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: phone, code: otp });

    if (verificationCheck.status !== 'approved') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, phone, password, gender, role });
    const token = generateToken(user);
    
    res.status(201).json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
};
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ where: { phone } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'phone', 'role', 'gender']
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};