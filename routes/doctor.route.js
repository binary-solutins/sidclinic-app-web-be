const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const adminController = require('../controllers/admin.controller'); // Updated to correct controller
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
 *     DoctorProfileResponse:
 *       type: object
 *       properties:
 *         doctorPhoto:
 *           type: string
 *         degree:
 *           type: string
 *         registrationNumber:
 *           type: string
 *         clinicName:
 *           type: string
 *         clinicPhotos:
 *           type: array
 *           items:
 *             type: string
 *         yearsOfExperience:
 *           type: integer
 *         specialty:
 *           type: string
 *         clinicContactNumber:
 *           type: string
 *         email:
 *           type: string
 *         address:
 *           type: string
 *         locationPin:
 *           type: string
 *         isApproved:
 *           type: boolean
 *         User:
 *           $ref: '#/components/schemas/User'
 */

// Doctor Profile Setup Route
/**
 * @swagger
 * /doctors/profile:
 *   post:
 *     summary: Create or update doctor profile
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
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 * 
 *   get:
 *     summary: Get doctor profile information
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorProfileResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.get('/pending',authenticate(), authorize('admin'), adminController.listPendingDoctors);
router.get('/approved',authenticate(), authorize('admin'), adminController.listApprovedDoctors);
router.get('/all',authenticate(), authorize('admin'), adminController.listAllDoctors);
router.put('/approve/:id', authenticate(), authorize('admin'), adminController.toggleDoctorApproval);

module.exports = router;