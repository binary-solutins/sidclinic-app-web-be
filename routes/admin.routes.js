const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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
     *         email:
     *           type: string
     *           format: email
     *           description: User's email address (required for user role)
     *           example: "user@example.com"
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
 *           format: binary
 *           description: Doctor's profile photo file (optional)
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
 *           items:
 *             type: string
 *             format: binary
 *           description: Array of clinic photo files (optional, max 5 files)
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
 *     summary: Get list of all users (Admin only)
 *     description: Retrieve paginated list of all users with search and sort capabilities
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for user name, phone, or gender
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, phone, gender, createdAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by patient active status (true for active, false for suspended)
 *     responses:
 *       200:
 *         description: Successful operation
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       phone:
 *                         type: string
 *                         example: "+1234567890"
 *                       gender:
 *                         type: string
 *                         example: "male"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-01-15T10:30:00Z"
 *                       notificationEnabled:
 *                         type: boolean
 *                         example: true
 *                       patient:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           email:
 *                             type: string
 *                             example: "john.doe@example.com"
 *                           languagePreference:
 *                             type: string
 *                             example: "English"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 3
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
     *                   example: "Email is required for new user accounts"
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
 *         multipart/form-data:
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
 *         multipart/form-data:
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

/**
 * @swagger
 * /admin/dental-images:
 *   get:
 *     summary: Get all dental images with pagination (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: relativeId
 *         schema:
 *           type: integer
 *         description: Filter by relative ID
 *       - in: query
 *         name: imageType
 *         schema:
 *           type: string
 *           enum: [xray, photo, scan, other]
 *         description: Filter by image type
 *     responses:
 *       200:
 *         description: All dental images retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: All dental images retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     images:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DentalImageResponse'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/dental-images/urls:
 *   get:
 *     summary: Get all dental image URLs only (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: All image URLs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: All image URLs retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrls:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Array of all image URLs
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *                         totalImageUrls:
 *                           type: integer
 *                           description: Total number of image URLs
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/doctor/{doctorId}/appointments:
 *   get:
 *     summary: Get all appointments of a specific doctor (Admin only)
 *     description: Retrieve paginated list of all appointments for a specific doctor with search, filter, and sort capabilities
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *         example: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, canceled, rejected, reschedule_requested]
 *         description: Filter by appointment status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appointments from this date (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appointments to this date (YYYY-MM-DD)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by patient name or phone
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [appointmentDateTime, status, type, createdAt]
 *           default: appointmentDateTime
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Doctor appointments retrieved successfully
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
 *                   example: "Doctor appointments retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     appointments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           appointmentDateTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           type:
 *                             type: string
 *                             enum: [physical, virtual]
 *                             example: "physical"
 *                           status:
 *                             type: string
 *                             enum: [pending, confirmed, completed, canceled, rejected, reschedule_requested]
 *                             example: "confirmed"
 *                           notes:
 *                             type: string
 *                             example: "Regular checkup"
 *                           consultationNotes:
 *                             type: string
 *                             example: "Patient is healthy"
 *                           prescription:
 *                             type: string
 *                             example: "Take medication as prescribed"
 *                           patient:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                               phone:
 *                                 type: string
 *                                 example: "+1234567890"
 *                           doctor:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "Dr. Jane Smith"
 *                               phone:
 *                                 type: string
 *                                 example: "+1234567890"
 *                               specialty:
 *                                 type: string
 *                                 example: "Cardiology"
 *                               clinicName:
 *                                 type: string
 *                                 example: "HealthCare Medical Center"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                     doctor:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Dr. Jane Smith"
 *                         phone:
 *                           type: string
 *                           example: "+1234567890"
 *                         specialty:
 *                           type: string
 *                           example: "Cardiology"
 *                         clinicName:
 *                           type: string
 *                           example: "HealthCare Medical Center"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Bad request - Doctor ID is required
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
 *                   example: "Doctor ID is required"
 *                 data:
 *                   type: null
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

/**
 * @swagger
 * /admin/patient/{userId}:
 *   get:
 *     summary: Get patient details (Admin only)
 *     description: Retrieve detailed information about a specific patient including user and patient profile data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID of the patient
 *         example: 1
 *     responses:
 *       200:
 *         description: Patient details retrieved successfully
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
 *                   example: "Patient details retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         phone:
 *                           type: string
 *                           example: "+1234567890"
 *                         gender:
 *                           type: string
 *                           example: "Male"
 *                         role:
 *                           type: string
 *                           example: "user"
 *                         notificationEnabled:
 *                           type: boolean
 *                           example: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *                     patient:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         dateOfBirth:
 *                           type: string
 *                           format: date
 *                           example: "1990-01-15"
 *                         languagePreference:
 *                           type: string
 *                           enum: [English, Hindi, Gujarati]
 *                           example: "English"
 *                         profileImage:
 *                           type: string
 *                           example: "https://appwrite.example.com/storage/files/123/view"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - User ID is required
 *       404:
 *         description: User or patient profile not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/patient/{userId}/status:
 *   patch:
 *     summary: Toggle patient active/suspend status (Admin only)
 *     description: Activate or suspend a patient account with optional reason
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID of the patient
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for status change
 *                 example: "Violation of terms of service"
 *     responses:
 *       200:
 *         description: Patient status updated successfully
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
 *                   example: "Patient activated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *                       example: 1
 *                     patientId:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     phone:
 *                       type: string
 *                       example: "+1234567890"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     reason:
 *                       type: string
 *                       example: "Administrative review"
 *       400:
 *         description: Bad request - User ID is required
 *       404:
 *         description: User or patient profile not found
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
router.post('/doctor', authenticate(), authorize('admin'), upload.fields([
  { name: 'doctorPhoto', maxCount: 1 },
  { name: 'clinicPhotos', maxCount: 5 }
]), adminController.createOrUpdateDoctor);
router.put('/doctor/:id', authenticate(), authorize('admin'), upload.fields([
  { name: 'doctorPhoto', maxCount: 1 },
  { name: 'clinicPhotos', maxCount: 5 }
]), adminController.createOrUpdateDoctor);
router.get('/doctor/:doctorId/appointments', authenticate(), authorize('admin'), adminController.getDoctorAppointments);
router.get('/patient/:userId', authenticate(), authorize('admin'), adminController.getPatientDetails);
router.patch('/patient/:userId/status', authenticate(), authorize('admin'), adminController.togglePatientStatus);

// Dental Image Admin Routes
const dentalImageController = require('../controllers/dentalImage.controller');
router.get('/dental-images', authenticate(), authorize('admin'), dentalImageController.getAllDentalImages);
router.get('/dental-images/urls', authenticate(), authorize('admin'), dentalImageController.getAllImageUrls);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB',
        data: null
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 clinic photos allowed',
        data: null
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed',
      data: null
    });
  }
  
  next(error);
});

module.exports = router;