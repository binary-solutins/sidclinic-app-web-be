const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

/**
 * @swagger
 * tags:
 *   - name: Doctors
 *     description: Doctor profile management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DoctorProfile:
 *       type: object
 *       required:
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
 *         doctorPhoto:
 *           type: string
 *           description: URL of the doctor's profile photo
 *           example: "https://example.com/doctor-photo.jpg"
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
 *           description: Array of clinic photo URLs
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
 *           example: "19.0760,72.8777"
 *         isApproved:
 *           type: boolean
 *           description: Approval status (set by admin)
 *           default: false
 *           readOnly: true
 *         is_active:
 *           type: boolean
 *           description: Whether the doctor profile is active
 *           default: true
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
 *     ServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /doctors/profile:
 *   post:
 *     summary: Create or update doctor profile
 *     description: Comprehensive API to create or update doctor profile with all text fields and image uploads. Supports profile photo and multiple clinic photos upload via multipart/form-data. Includes comprehensive validation for all fields and updates user name in the user table. Returns detailed validation error messages for better user experience. The 'name' field will update the user's name in the user table if provided.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - degree
 *               - registrationNumber
 *               - clinicName
 *               - yearsOfExperience
 *               - clinicContactNumber
 *               - email
 *               - address
 *               - country
 *               - state
 *               - city
 *               - locationPin
 *             properties:
 *               doctorPhoto:
 *                 type: string
 *                 format: binary
 *                 description: Doctor's profile photo file (optional)
 *               clinicPhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of clinic photo files (optional, max 5 files)
 *               degree:
 *                 type: string
 *                 description: Doctor's medical degree(s) - required field
 *                 example: "MBBS, MD"
 *               registrationNumber:
 *                 type: string
 *                 description: Doctor's medical registration number - required and must be unique
 *                 example: "MCI-12345"
 *               clinicName:
 *                 type: string
 *                 description: Name of the doctor's clinic - required field
 *                 example: "HealthCare Medical Center"
 *               yearsOfExperience:
 *                 type: integer
 *                 description: Number of years of professional experience - must be a positive number
 *                 minimum: 0
 *                 example: 10
 *               specialty:
 *                 type: string
 *                 description: Doctor's medical specialty - optional field
 *                 example: "Cardiology"
 *               clinicContactNumber:
 *                 type: string
 *                 description: Contact number for the clinic - must be 10-15 digits with valid format
 *                 pattern: '^[0-9+\-\s()]{10,15}$'
 *                 example: "+1234567890"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Professional email address - must be a valid email format
 *                 example: "doctor@example.com"
 *               address:
 *                 type: string
 *                 description: Physical address of the clinic - required field
 *                 example: "123 Medical Street, Healthcare City"
 *               country:
 *                 type: string
 *                 description: Country of the clinic - required field
 *                 example: "India"
 *               state:
 *                 type: string
 *                 description: State/province of the clinic - required field
 *                 example: "Maharashtra"
 *               city:
 *                 type: string
 *                 description: City of the clinic - required field
 *                 example: "Mumbai"
 *               name:
 *                 type: string
 *                 description: Doctor's name (will update user table)
 *                 example: "Dr. John Smith"
 *               locationPin:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: 6-digit location pin code
 *                 example: "400001"
 *               startTime:
 *                 type: string
 *                 format: time
 *                 example: "09:00:00"
 *               endTime:
 *                 type: string
 *                 format: time
 *                 example: "18:00:00"
 *     responses:
 *       201:
 *         description: Doctor profile created successfully
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
 *                   example: "Profile created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DoctorProfile'
 *       200:
 *         description: Doctor profile updated successfully
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
 *                   example: "Profile updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DoctorProfile'
 *       400:
 *         description: Validation error or upload failure
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
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of specific validation error messages
 *                   example: 
 *                     - "Degree is required"
 *                     - "Registration number is required"
 *                     - "Please provide a valid email address"
 *                     - "Years of experience must be a valid positive number"
 *                     - "Location pin must be exactly 6 digits"
 *                     - "Please provide a valid clinic contact number"
 *                     - "Registration number is already taken by another doctor"
 *                 data:
 *                   type: null
 *                   example: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: User is not registered as a doctor
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
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "User is not registered as a doctor"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["User is not registered as a doctor"]
 *                 data:
 *                   type: null
 *                   example: null
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["User not found"]
 *                 data:
 *                   type: null
 *                   example: null
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /doctors/profile:
 *   get:
 *     summary: Get doctor profile
 *     description: Retrieve the profile information of the authenticated doctor.
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor profile retrieved successfully
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
 *                   example: "Profile retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DoctorProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Doctor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

// Profile routes
router.post('/profile', authenticate(), upload.fields([
  { name: 'doctorPhoto', maxCount: 1 },
  { name: 'clinicPhotos', maxCount: 5 }
]), doctorController.setupProfile);
router.get('/profile', authenticate(), doctorController.getProfile);

// Admin Approval Routes
/**
 * @swagger
 * /doctors/pending:
 *   get:
 *     summary: Get list of pending doctor approvals (Admin only)
 *     description: Retrieve paginated list of pending doctors with search and sort capabilities
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
 *         description: Search term for doctor name, phone, clinic name, specialty, or degree
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, phone, clinicName, specialty, degree, yearsOfExperience, createdAt]
 *           default: createdAt
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
 *                   example: "Pending doctors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DoctorProfileResponse'
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
 * /doctors/approved:
 *   get:
 *     summary: Get list of approved doctors (Admin only)
 *     description: Retrieve paginated list of approved doctors with search and sort capabilities
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
 *         description: Search term for doctor name, phone, clinic name, specialty, or degree
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, phone, clinicName, specialty, degree, yearsOfExperience, createdAt]
 *           default: createdAt
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
 *                   example: "Approved doctors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DoctorProfileResponse'
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
 *
 * /doctors/all:
 *   get:
 *     summary: Get list of all doctors (Admin only)
 *     description: Retrieve paginated list of all doctors with search and sort capabilities
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
 *         description: Search term for doctor name, phone, clinic name, specialty, degree, city, state, or registration number
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, phone, clinicName, specialty, degree, yearsOfExperience, city, state, isApproved, is_active, createdAt]
 *           default: createdAt
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
 *                   example: "Doctors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DoctorProfileResponse'
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
router.get('/pending', authenticate(), authorize('admin'), adminController.listPendingDoctors);
router.get('/approved', authenticate(), authorize('admin'), adminController.listApprovedDoctors);
router.get('/all', authenticate(), authorize('admin'), adminController.listAllDoctors);
router.put('/approve/:id', authenticate(), authorize('admin'), adminController.toggleDoctorApproval);

// New route for getting doctor details by admin
/**
 * @swagger
 * /doctors/details/{id}:
 *   get:
 *     summary: Get doctor details by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor user ID
 *     responses:
 *       200:
 *         description: Doctor details retrieved successfully
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
 *                   example: "Doctor details retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/DoctorProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Doctor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/details/:id', authenticate(), authorize('admin'), adminController.getDoctorDetails);

/**
 * @swagger
 * /doctors/city/{city}:
 *   get:
 *     summary: Find doctors by city
 *     description: Retrieves all approved and active doctors in a specific city
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: City name to search for doctors
 *     responses:
 *       200:
 *         description: Doctors retrieved successfully
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
 *                   example: "Doctors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DoctorProfile'
 *       404:
 *         description: No doctors found in the specified city
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - example:
 *                     message: "No doctors found in the specified city"
 *                     code: "NOT_FOUND"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/city/:city', doctorController.findDoctorsByCity);

/**
 * @swagger
 * /doctors/toggle-status/{id}:
 *   put:
 *     summary: Toggle doctor active status (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor user ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               suspensionReason:
 *                 type: string
 *                 description: Reason for suspension (only used when deactivating)
 *                 example: "Administrative review"
 *               reviewDate:
 *                 type: string
 *                 format: date
 *                 description: Date when account will be reviewed (only used when deactivating)
 *                 example: "2024-01-15"
 *     responses:
 *       200:
 *         description: Doctor status toggled successfully
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
 *                   example: "Doctor status toggled successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Doctor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/toggle-status/:id', authenticate(), authorize('admin'), adminController.toggleDoctorStatus);

/**
 * @swagger
 * /doctors/getAllDoctors:
 *   get:
 *     summary: Get all approved and active doctors (regular doctors only)
 *     description: Retrieve all approved and active regular doctors. For virtual doctors, use the dedicated virtual doctor endpoints.
 *     tags: [Doctors]
 *     responses:
 *       200:
 *         description: List of all approved and active doctors
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
 *                   example: "All doctors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DoctorProfile'
 *       404:
 *         description: No doctors found
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
 *                   example: "No doctors found"
 *                 data:
 *                   type: array
 *                   example: []
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/getAllDoctors', doctorController.getAllDoctors);

/**
 * @swagger
 * /doctors/getAllVirtualDoctors:
 *   get:
 *     summary: Get all virtual doctors with complete information
 *     description: Retrieve all virtual doctors with pagination, search, and sorting capabilities. Returns comprehensive virtual doctor information including both User and Doctor data.
 *     tags: [Doctors]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
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
 *         description: Search by name, phone, specialty, clinic name, or degree
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, phone, specialty, clinicName, degree, createdAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order (DESC ensures recent first)
 *     responses:
 *       200:
 *         description: Virtual doctors retrieved successfully
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
 *                   example: "Virtual doctors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VirtualDoctor'
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
 *       404:
 *         description: No virtual doctors found
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
 *                   example: "No virtual doctors found"
 *                 data:
 *                   type: array
 *                   example: []
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/getAllVirtualDoctors', doctorController.getAllVirtualDoctors);

/**
 * @swagger
 * /doctors/approve/{id}:
 *   put:
 *     summary: Approve or disapprove a doctor profile (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor user ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalReason:
 *                 type: string
 *                 description: Reason for disapproval (only used when disapproving)
 *                 example: "Incomplete documentation"
 *     responses:
 *       200:
 *         description: Doctor approved successfully
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
 *                   example: "Doctor approved successfully"
 *                 isApproved:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Doctor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/approve/:id', authenticate(), authorize('admin'), adminController.toggleDoctorApproval);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 25MB',
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