/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *     SendOtpRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - phone
 *         - otp
 *         - name
 *         - password
 *         - gender
 *       properties:
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *         otp:
 *           type: string
 *           example: "123456"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         password:
 *           type: string
 *           example: "securePassword123"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *         role:
 *           type: string
 *           enum: [user, doctor, admin]
 *           default: user
 *     CheckUserExistsRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *     CheckUserExistsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         exists:
 *           type: boolean
 *         message:
 *           type: string
 *     SendResetOtpRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - phone
 *         - otp
 *         - newPassword
 *       properties:
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *         otp:
 *           type: string
 *           example: "123456"
 *         newPassword:
 *           type: string
 *           example: "newSecurePassword123"
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *         token:
 *           type: string
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

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP to a phone number for registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOtpRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: User already exists or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/send-otp', authController.sendOtp);

/**
 * @swagger
 * /auth/check-user-exists:
 *   post:
 *     summary: Check if a user exists by phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckUserExistsRequest'
 *     responses:
 *       200:
 *         description: User existence check result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckUserExistsResponse'
 *       400:
 *         description: Invalid phone number format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/check-user-exists', authController.checkUserExists);

/**
 * @swagger
 * /auth/send-reset-otp:
 *   post:
 *     summary: Send OTP for password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendResetOtpRequest'
 *     responses:
 *       200:
 *         description: Reset OTP sent successfully
 *       400:
 *         description: User not found or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/send-reset-otp', authController.sendResetOtp);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with OTP verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid OTP or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user with OTP verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid OTP, validation error, or user exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate existing user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 role:
 *                   type: string
 *                 gender:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/profile', authenticate(), authController.getProfile);

module.exports = router;