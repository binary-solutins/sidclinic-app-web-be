const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Patient profile management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PatientProfile:
 *       type: object
 *       required:
 *         - dateOfBirth
 *         - email
 *         - languagePreference
 *       properties:
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Patient's date of birth
 *           example: "1990-05-15"
 *         email:
 *           type: string
 *           format: email
 *           description: Patient's email address
 *           example: "patient@example.com"
 *         languagePreference:
 *           type: string
 *           enum: ['English', 'Hindi', 'Gujarati']
 *           default: 'English'
 *           description: Preferred app language
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the patient profile is active
 *     
 *     FamilyMember:
 *       type: object
 *       required:
 *         - name
 *         - dateOfBirth
 *         - gender
 *         - relation
 *       properties:
 *         name:
 *           type: string
 *           description: Family member's name
 *           example: "John Doe"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Family member's date of birth
 *           example: "1985-03-20"
 *         gender:
 *           type: string
 *           enum: ['Male', 'Female', 'Other']
 *           description: Family member's gender
 *         relation:
 *           type: string
 *           description: Relationship to patient
 *           example: "Spouse"
 *     
 *     MedicalHistory:
 *       type: object
 *       properties:
 *         hasDiabetes:
 *           type: boolean
 *           default: false
 *         hasHighBloodPressure:
 *           type: boolean
 *           default: false
 *         hasThyroidDisorder:
 *           type: boolean
 *           default: false
 *         hasAsthma:
 *           type: boolean
 *           default: false
 *         otherConditions:
 *           type: string
 *           description: Other medical conditions
 *         allergies:
 *           type: string
 *           description: Known allergies
 *         pastDentalHistory:
 *           type: string
 *           description: Past dental procedures/issues
 *         currentMedications:
 *           type: string
 *           description: Current medications
 *         smokesTobacco:
 *           type: boolean
 *           default: false
 *           description: Whether patient smokes or uses tobacco
 *         tobaccoForm:
 *           type: string
 *           enum: ['Cigarette', 'Gutkha', 'Pan Masala', 'Other']
 *           description: Form of tobacco used (if applicable)
 *         tobaccoFrequencyPerDay:
 *           type: integer
 *           description: Frequency of tobacco use per day
 *         tobaccoDurationYears:
 *           type: integer
 *           description: Duration of tobacco use in years
 *     
 *     ConsultationReport:
 *       type: object
 *       required:
 *         - doctorName
 *         - consultationDate
 *         - diagnosis
 *       properties:
 *         doctorName:
 *           type: string
 *           description: Name of consulting doctor
 *         consultationDate:
 *           type: string
 *           format: date
 *           description: Date of consultation
 *         diagnosis:
 *           type: string
 *           description: Diagnosis details
 *         prescription:
 *           type: string
 *           description: Prescribed medications
 *         notes:
 *           type: string
 *           description: Additional notes
 *         followUpDate:
 *           type: string
 *           format: date
 *           description: Follow-up appointment date
 */

/**
 * @swagger
 * /patients/profile:
 *   post:
 *     summary: Create or update patient profile
 *     description: Allows patients to create or update their profile information
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientProfile'
 *     responses:
 *       201:
 *         description: Patient profile created successfully
 *       200:
 *         description: Patient profile updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /patients/profile:
 *   get:
 *     summary: Get patient profile
 *     description: Retrieve the profile information of the authenticated patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient profile retrieved successfully
 *       404:
 *         description: Patient profile not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/profile', authenticate(), patientController.setupProfile);
router.get('/profile', authenticate(), patientController.getProfile);

/**
 * @swagger
 * /patients/family-members:
 *   post:
 *     summary: Add family member
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FamilyMember'
 *     responses:
 *       201:
 *         description: Family member added successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /patients/family-members:
 *   get:
 *     summary: Get all family members
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Family members retrieved successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /patients/family-members/{id}:
 *   put:
 *     summary: Update family member
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FamilyMember'
 *     responses:
 *       200:
 *         description: Family member updated successfully
 *       404:
 *         description: Family member not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /patients/family-members/{id}:
 *   delete:
 *     summary: Delete family member
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Family member deleted successfully
 *       404:
 *         description: Family member not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/family-members', authenticate(), patientController.addFamilyMember);
router.get('/family-members', authenticate(), patientController.getFamilyMembers);
router.put('/family-members/:id', authenticate(), patientController.updateFamilyMember);
router.delete('/family-members/:id', authenticate(), patientController.deleteFamilyMember);

/**
 * @swagger
 * /patients/medical-history:
 *   post:
 *     summary: Create or update medical history
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MedicalHistory'
 *     responses:
 *       201:
 *         description: Medical history created successfully
 *       200:
 *         description: Medical history updated successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /patients/medical-history:
 *   get:
 *     summary: Get medical history
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Medical history retrieved successfully
 *       404:
 *         description: Medical history not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/medical-history', authenticate(), patientController.setupMedicalHistory);
router.get('/medical-history', authenticate(), patientController.getMedicalHistory);

/**
 * @swagger
 * /patients/consultation-reports:
 *   post:
 *     summary: Add consultation report
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsultationReport'
 *     responses:
 *       201:
 *         description: Consultation report added successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /patients/consultation-reports:
 *   get:
 *     summary: Get all consultation reports
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consultation reports retrieved successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /patients/consultation-reports/{id}:
 *   get:
 *     summary: Get consultation report by ID
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Consultation report retrieved successfully
 *       404:
 *         description: Consultation report not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/consultation-reports', authenticate(), patientController.addConsultationReport);
router.get('/consultation-reports', authenticate(), patientController.getConsultationReports);
router.get('/consultation-reports/:id', authenticate(), patientController.getConsultationReport);

// Profile Image Routes
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * @swagger
 * /patients/profile-image:
 *   post:
 *     summary: Upload profile image
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *       400:
 *         description: No image uploaded
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /patients/profile-image:
 *   get:
 *     summary: Get profile image
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile image retrieved successfully
 *       404:
 *         description: No profile image found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/profile-image', authenticate(), upload.single('image'), patientController.uploadProfileImage);
router.get('/profile-image', authenticate(), patientController.getProfileImage);

module.exports = router;