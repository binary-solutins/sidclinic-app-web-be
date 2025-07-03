const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserCreate:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *         - gender
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           description: User's phone number
 *           example: "+1234567890"
 *         password:
 *           type: string
 *           description: User's password (required for new users)
 *           example: "password123"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: User's gender
 *           example: "Male"
 *         role:
 *           type: string
 *           enum: [user, doctor, admin]
 *           description: User's role
 *           default: "user"
 *           example: "user"
 *         fcmToken:
 *           type: string
 *           description: Firebase Cloud Messaging token
 *           example: "fcm_token_string"
 *         notificationEnabled:
 *           type: boolean
 *           description: Whether notifications are enabled
 *           default: true
 *           example: true
 *     
 *     UserSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: User's unique identifier
 *           example: 1
 *         name:
 *           type: string
 *           description: User's full name
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           description: User's phone number
 *           example: "+1234567890"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: User's gender
 *           example: "Male"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation timestamp
 *           example: "2024-01-15T10:30:00.000Z"
 *         notificationEnabled:
 *           type: boolean
 *           description: Whether notifications are enabled
 *           example: true
 *     
 *     DoctorCreate:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *         - gender
 *         - degree
 *         - registrationNumber
 *         - clinicName
 *         - yearsOfExperience
 *         - clinicContactNumber
 *         - email
 *         - address
 *         - country
 *         - state
 *         - city
 *         - locationPin
 *       properties:
 *         name:
 *           type: string
 *           description: Doctor's full name
 *           example: "Dr. Jane Smith"
 *         phone:
 *           type: string
 *           description: Doctor's phone number
 *           example: "+1234567890"
 *         password:
 *           type: string
 *           description: Doctor's password (required for new doctors)
 *           example: "password123"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: Doctor's gender
 *           example: "Female"
 *         doctorPhoto:
 *           type: string
 *           description: URL or Base64 encoded string of doctor's photo
 *           example: "https://example.com/photo.jpg"
 *         degree:
 *           type: string
 *           description: Doctor's medical degree(s)
 *           example: "MBBS, MD"
 *         registrationNumber:
 *           type: string
 *           description: Doctor's medical registration number
 *           example: "MCI-12345"
 *         clinicName:
 *           type: string
 *           description: Name of the doctor's clinic
 *           example: "HealthCare Medical Center"
 *         clinicPhotos:
 *           type: array
 *           description: URLs or Base64 encoded strings of clinic photos
 *           items:
 *             type: string
 *           example: ["https://example.com/clinic1.jpg", "https://example.com/clinic2.jpg"]
 *         yearsOfExperience:
 *           type: integer
 *           description: Number of years of professional experience
 *           example: 10
 *         specialty:
 *           type: string
 *           description: Doctor's medical specialty
 *           example: "Cardiology"
 *         clinicContactNumber:
 *           type: string
 *           description: Contact number for the clinic
 *           example: "+1234567890"
 *         email:
 *           type: string
 *           format: email
 *           description: Professional email address
 *           example: "doctor@example.com"
 *         address:
 *           type: string
 *           description: Physical address of the clinic
 *           example: "123 Medical Street, Healthcare City"
 *         country:
 *           type: string
 *           description: Country of the clinic
 *           example: "India"
 *         state:
 *           type: string
 *           description: State/province of the clinic
 *           example: "Maharashtra"
 *         city:
 *           type: string
 *           description: City of the clinic
 *           example: "Mumbai"
 *         locationPin:
 *           type: string
 *           description: Geographic coordinates or location pin
 *           example: "400001"
 *         startTime:
 *           type: string
 *           format: time
 *           description: Start time of doctor's availability
 *           example: "09:00:00"
 *         endTime:
 *           type: string
 *           format: time
 *           description: End time of doctor's availability
 *           example: "18:00:00"
 *         is_active:
 *           type: boolean
 *           description: Whether the doctor profile is active
 *           default: true
 *           example: true
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: "Users retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSummary'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/user:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "User created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     phone:
 *                       type: string
 *                       example: "+1234567890"
 *                     role:
 *                       type: string
 *                       example: "user"
 *                     gender:
 *                       type: string
 *                       example: "Male"
 *                     notificationEnabled:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error or phone number already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 code:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Phone number already exists"
 *                 data:
 *                   type: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/user/{id}:
 *   put:
 *     summary: Update an existing user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/UserCreate'
 *               - type: object
 *                 properties:
 *                   password:
 *                     description: Password (optional for updates)
 *                     required: false
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                   example: "User updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "John Doe Updated"
 *                     phone:
 *                       type: string
 *                       example: "+1234567890"
 *                     role:
 *                       type: string
 *                       example: "user"
 *                     gender:
 *                       type: string
 *                       example: "Male"
 *                     notificationEnabled:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error or phone number already exists
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 code:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *                 data:
 *                   type: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/doctor:
 *   post:
 *     summary: Create a new doctor (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DoctorCreate'
 *     responses:
 *       201:
 *         description: Doctor created successfully
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
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Doctor created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DoctorProfile'
 *       400:
 *         description: Validation error, phone number or registration number already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 code:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Registration number already exists"
 *                 data:
 *                   type: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/doctor/{id}:
 *   put:
 *     summary: Update an existing doctor (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/DoctorCreate'
 *               - type: object
 *                 properties:
 *                   password:
 *                     description: Password (optional for updates)
 *                     required: false
 *     responses:
 *       200:
 *         description: Doctor updated successfully
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
 *                   example: "Doctor updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DoctorProfile'
 *       400:
 *         description: Validation error, phone number or registration number already exists
 *       404:
 *         description: Doctor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 code:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Doctor not found"
 *                 data:
 *                   type: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

// Routes
router.get('/users', authenticate(), authorize('admin'), adminController.listAllUsers);
router.post('/user', authenticate(), authorize('admin'), adminController.createOrUpdateUser);
router.put('/user/:id', authenticate(), authorize('admin'), adminController.createOrUpdateUser); 
router.post('/doctor', authenticate(), authorize('admin'), adminController.createOrUpdateDoctor);
router.put('/doctor/:id', authenticate(), authorize('admin'), adminController.createOrUpdateDoctor);

module.exports = router;