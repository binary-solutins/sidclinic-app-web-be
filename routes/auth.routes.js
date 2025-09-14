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
 *           description: 10-digit Indian mobile number (without country code)
 *           example: "9876543210"
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - phone
 *         - name
 *         - password
 *         - gender
 *       properties:
 *         phone:
 *           type: string
 *           description: 10-digit Indian mobile number (without country code)
 *           example: "9876543210"
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
 *           description: 10-digit Indian mobile number (without country code)
 *           example: "9876543210"
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
 *           description: 10-digit Indian mobile number (without country code)
 *           example: "9876543210"
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - phone
 *         - otp
 *         - newPassword
 *       properties:
 *         phone:
 *           type: string
 *           description: 10-digit Indian mobile number (without country code)
 *           example: "9876543210"
 *         otp:
 *           type: string
 *           example: "123456"
 *         newPassword:
 *           type: string
 *           example: "newSecurePassword123"
 *     LoginWithOtpRequest:
 *       type: object
 *       required:
 *         - phone
 *         - otp
 *       properties:
 *         phone:
 *           type: string
 *           description: 10-digit Indian mobile number (without country code)
 *           example: "9876543210"
 *         otp:
 *           type: string
 *           description: 6-digit OTP received via SMS
 *           example: "123456"
 *         name:
 *           type: string
 *           description: Required only for new user registration
 *           example: "John Doe"
 *         password:
 *           type: string
 *           description: Required only for new user registration
 *           example: "securePassword123"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: Required only for new user registration
 *           example: "Male"
 *         role:
 *           type: string
 *           enum: [user, doctor, admin]
 *           default: user
 *           description: Required only for new user registration
 *     UserResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful" or "Registration completed successfully"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             name:
 *               type: string
 *               example: "John Doe"
 *             phone:
 *               type: string
 *               example: "9876543210"
 *             role:
 *               type: string
 *               example: "user"
 *             token:
 *               type: string
 *               description: JWT token for authentication
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             doctorId:
 *               type: integer
 *               description: Present if user role is doctor
 *               example: 1
 *             patientId:
 *               type: integer
 *               description: Present if user role is user
 *               example: 1
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
 *     summary: Send OTP to a phone number (works for both login and registration)
 *     description: |
 *       Sends OTP to the provided phone number. The system automatically detects if the user exists:
 *       - If user exists: OTP is sent for login
 *       - If user doesn't exist: OTP is sent for registration
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully for login"
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiresIn:
 *                       type: string
 *                       example: "5 minutes"
 *                     isExistingUser:
 *                       type: boolean
 *                       description: "true if user exists (login), false if new user (registration)"
 *                       example: true
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
router.post('/send-otp', authController.sendOtp);

/**
 * @swagger
 * /auth/send-login-otp:
 *   post:
 *     summary: Send OTP for login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOtpRequest'
 *     responses:
 *       200:
 *         description: Login OTP sent successfully
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
router.post('/send-login-otp', authController.sendLoginOtp);

/**
 * @swagger
 * /auth/login-with-otp:
 *   post:
 *     summary: Login or Register with OTP verification (Unified API)
 *     description: |
 *       This API handles both login and registration based on whether the user exists:
 *       
 *       **For Existing Users (Login):**
 *       - Only phone and otp are required
 *       - Returns user data and JWT token
 *       
 *       **For New Users (Registration):**
 *       - phone, otp, name, password, and gender are required
 *       - Creates new user account and returns user data with JWT token
 *       - Automatically creates patient record for 'user' role
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginWithOtpRequest'
 *     responses:
 *       200:
 *         description: Login successful (existing user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       201:
 *         description: Registration completed successfully (new user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid OTP, validation error, or missing registration data for new users
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
router.post('/login-with-otp', authController.loginWithOtp);

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
 *     summary: Register a new user
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
// Register route removed - now handled by login-with-otp

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

/**
 * @swagger
 * components:
 *   examples:
 *     SendOtpExample:
 *       summary: Send OTP for existing user
 *       value:
 *         phone: "9876543210"
 *     SendOtpNewUserExample:
 *       summary: Send OTP for new user
 *       value:
 *         phone: "9876543211"
 *     LoginWithOtpExistingUserExample:
 *       summary: Login with OTP (existing user)
 *       value:
 *         phone: "9876543210"
 *         otp: "123456"
 *     LoginWithOtpNewUserExample:
 *       summary: Register with OTP (new user)
 *       value:
 *         phone: "9876543211"
 *         otp: "123456"
 *         name: "John Doe"
 *         password: "securePassword123"
 *         gender: "Male"
 *         role: "user"
 *     SendOtpResponseExample:
 *       summary: Send OTP response
 *       value:
 *         status: "success"
 *         code: 200
 *         message: "OTP sent successfully for login"
 *         data:
 *           expiresIn: "5 minutes"
 *           isExistingUser: true
 *     LoginResponseExample:
 *       summary: Login response
 *       value:
 *         success: true
 *         message: "Login successful"
 *         data:
 *           id: 1
 *           name: "John Doe"
 *           phone: "9876543210"
 *           role: "user"
 *           token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *           patientId: 1
 *     RegisterResponseExample:
 *       summary: Registration response
 *       value:
 *         success: true
 *         message: "Registration completed successfully"
 *         data:
 *           id: 2
 *           name: "Jane Doe"
 *           phone: "9876543211"
 *           role: "user"
 *           token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *           patientId: 2
 */

module.exports = router;