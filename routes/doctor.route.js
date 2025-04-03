const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor profile management
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
 *         - specialty
 *         - yearsOfExperience
 *       properties:
 *         doctorPhoto:
 *           type: string
 *           description: URL or Base64 encoded string of doctor's photo
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
 *         locationPin:
 *           type: string
 *           description: Geographic coordinates or location pin
 *           example: "125"
 *         isApproved:
 *           type: boolean
 *           description: Approval status (set by admin)
 *           default: false
 *           readOnly: true
 *     
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error description
 *         code:
 *           type: string
 *           description: Error code for client handling
 *
 *   responses:
 *     Unauthorized:
 *       description: Authentication required or token expired
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Authentication required"
 *               code:
 *                 type: string
 *                 example: "UNAUTHORIZED"
 *     
 *     Forbidden:
 *       description: User doesn't have required permissions
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Insufficient permissions"
 *               code:
 *                 type: string
 *                 example: "FORBIDDEN"
 *     
 *     ServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Internal server error"
 *               code:
 *                 type: string
 *                 example: "SERVER_ERROR"
 *
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
 *     description: Allows doctors to create or update their professional profile information
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DoctorProfile'
 *     responses:
 *       201:
 *         description: Doctor profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile created successfully"
 *                 doctor:
 *                   $ref: '#/components/schemas/DoctorProfile'
 *       200:
 *         description: Doctor profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 doctor:
 *                   $ref: '#/components/schemas/DoctorProfile'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - example:
 *                     message: "Validation failed"
 *                     code: "VALIDATION_ERROR"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: User is not registered as a doctor
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - example:
 *                     message: "User is not registered as a doctor"
 *                     code: "INVALID_USER_ROLE"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - example:
 *                     message: "User not found"
 *                     code: "USER_NOT_FOUND"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /doctors/profile:
 *   get:
 *     summary: Get doctor profile
 *     description: Retrieve the profile information of the authenticated doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Doctor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - example:
 *                     message: "Doctor profile not found or not associated with user"
 *                     code: "PROFILE_NOT_FOUND"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/profile', authenticate(), doctorController.setupProfile);
router.get('/profile', authenticate(), doctorController.getProfile);

// Admin Approval Routes
/**
 * @swagger
 * /doctors/pending:
 *   get:
 *     summary: Get list of pending doctor approvals (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DoctorProfileResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 * /doctors/approved:
 *   get:
 *     summary: Get list of approved doctor (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DoctorProfileResponse'
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
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DoctorProfileResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 * 
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
 *     responses:
 *       200:
 *         description: Doctor approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Doctor approved successfully"
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

module.exports = router;