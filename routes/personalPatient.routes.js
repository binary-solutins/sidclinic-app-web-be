const express = require('express');
const router = express.Router();
const personalPatientController = require('../controllers/personalPatient.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Personal Patients
 *   description: Doctor's personal patient management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PersonalPatient:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the personal patient
 *           example: 1
 *         doctorId:
 *           type: integer
 *           description: ID of the doctor who owns this patient
 *           example: 1
 *         name:
 *           type: string
 *           description: Patient's name
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           maxLength: 15
 *           description: Patient's phone number
 *           example: "+1234567890"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: Patient's gender
 *           example: "Male"
 *         description:
 *           type: string
 *           description: Patient description or notes
 *           example: "Regular patient with good oral hygiene"
 *         medicalHistory:
 *           type: string
 *           description: Patient's medical history
 *           example: "No major medical conditions. Allergic to penicillin."
 *         date:
 *           type: string
 *           format: date
 *           description: Date of first visit or registration
 *           example: "2024-01-15"
 *         time:
 *           type: string
 *           format: time
 *           description: Time of first visit or registration
 *           example: "14:30:00"
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the patient record is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Record creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Record last update timestamp
 *     
 *     PersonalPatientCreate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Patient's name
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           maxLength: 15
 *           description: Patient's phone number
 *           example: "+1234567890"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: Patient's gender
 *           example: "Male"
 *         description:
 *           type: string
 *           description: Patient description or notes
 *           example: "Regular patient with good oral hygiene"
 *         medicalHistory:
 *           type: string
 *           description: Patient's medical history
 *           example: "No major medical conditions. Allergic to penicillin."
 *         date:
 *           type: string
 *           format: date
 *           description: Date of first visit or registration
 *           example: "2024-01-15"
 *         time:
 *           type: string
 *           format: time
 *           description: Time of first visit or registration
 *           example: "14:30:00"
 *     
 *     PersonalPatientUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Patient's name
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           maxLength: 15
 *           description: Patient's phone number
 *           example: "+1234567890"
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: Patient's gender
 *           example: "Male"
 *         description:
 *           type: string
 *           description: Patient description or notes
 *           example: "Regular patient with good oral hygiene"
 *         medicalHistory:
 *           type: string
 *           description: Patient's medical history
 *           example: "No major medical conditions. Allergic to penicillin."
 *         date:
 *           type: string
 *           format: date
 *           description: Date of first visit or registration
 *           example: "2024-01-15"
 *         time:
 *           type: string
 *           format: time
 *           description: Time of first visit or registration
 *           example: "14:30:00"
 *     
 *     PersonalPatientList:
 *       type: object
 *       properties:
 *         patients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PersonalPatient'
 *         pagination:
 *           type: object
 *           properties:
 *             currentPage:
 *               type: integer
 *               example: 1
 *             totalPages:
 *               type: integer
 *               example: 5
 *             totalItems:
 *               type: integer
 *               example: 50
 *             itemsPerPage:
 *               type: integer
 *               example: 10
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "error"
 *         code:
 *           type: integer
 *           example: 400
 *         message:
 *           type: string
 *           example: "Bad request"
 *         data:
 *           type: null
 *     
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         code:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           example: "Operation completed successfully"
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/PersonalPatient'
 *             - $ref: '#/components/schemas/PersonalPatientList'
 *             - type: null
 */

/**
 * @swagger
 * /personal-patients:
 *   post:
 *     summary: Create a new personal patient
 *     description: Create a new personal patient record for the authenticated doctor
 *     tags: [Personal Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonalPatientCreate'
 *           example:
 *             name: "John Doe"
 *             phone: "+1234567890"
 *             gender: "Male"
 *             description: "Regular patient with good oral hygiene"
 *             medicalHistory: "No major medical conditions. Allergic to penicillin."
 *             date: "2024-01-15"
 *             time: "14:30:00"
 *     responses:
 *       201:
 *         description: Personal patient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PersonalPatient'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Doctor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate(['doctor']), personalPatientController.createPersonalPatient);

/**
 * @swagger
 * /personal-patients:
 *   get:
 *     summary: Get all personal patients
 *     description: Retrieve all personal patients for the authenticated doctor with pagination and search
 *     tags: [Personal Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter patients by name, phone, or description
 *     responses:
 *       200:
 *         description: Personal patients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PersonalPatientList'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Doctor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate(['doctor']), personalPatientController.getAllPersonalPatients);

/**
 * @swagger
 * /personal-patients/{id}:
 *   get:
 *     summary: Get a specific personal patient
 *     description: Retrieve a specific personal patient by ID for the authenticated doctor
 *     tags: [Personal Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Personal patient ID
 *     responses:
 *       200:
 *         description: Personal patient retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PersonalPatient'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Personal patient or doctor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate(['doctor']), personalPatientController.getPersonalPatientById);

/**
 * @swagger
 * /personal-patients/{id}:
 *   put:
 *     summary: Update a personal patient
 *     description: Update a specific personal patient record for the authenticated doctor
 *     tags: [Personal Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Personal patient ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonalPatientUpdate'
 *           example:
 *             name: "John Doe Updated"
 *             phone: "+1234567890"
 *             gender: "Male"
 *             description: "Updated patient description"
 *             medicalHistory: "Updated medical history"
 *             date: "2024-01-15"
 *             time: "14:30:00"
 *     responses:
 *       200:
 *         description: Personal patient updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PersonalPatient'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Personal patient or doctor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', authenticate(['doctor']), personalPatientController.updatePersonalPatient);

/**
 * @swagger
 * /personal-patients/{id}:
 *   delete:
 *     summary: Delete a personal patient
 *     description: Soft delete a personal patient record (sets isActive to false)
 *     tags: [Personal Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Personal patient ID
 *     responses:
 *       200:
 *         description: Personal patient deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: null
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Personal patient or doctor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate(['doctor']), personalPatientController.deletePersonalPatient);

/**
 * @swagger
 * /personal-patients/{id}/restore:
 *   post:
 *     summary: Restore a deleted personal patient
 *     description: Restore a soft-deleted personal patient record (sets isActive to true)
 *     tags: [Personal Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Personal patient ID
 *     responses:
 *       200:
 *         description: Personal patient restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PersonalPatient'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Personal patient or doctor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/restore', authenticate(['doctor']), personalPatientController.restorePersonalPatient);

module.exports = router;
