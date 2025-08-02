const express = require('express');
const router = express.Router();
const medicalReportController = require('../controllers/medicalReport.controller');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for medical reports
});

/**
 * @swagger
 * tags:
 *   name: Medical Reports
 *   description: Medical report management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MedicalReport:
 *       type: object
 *       required:
 *         - patientId
 *         - title
 *         - filePath
 *         - fileName
 *       properties:
 *         patientId:
 *           type: integer
 *           description: Patient ID
 *           example: 1
 *         title:
 *           type: string
 *           description: Report title
 *           example: "Blood Test Results"
 *         description:
 *           type: string
 *           description: Report description
 *           example: "Complete blood count and lipid profile"
 *         filePath:
 *           type: string
 *           description: Path to the uploaded file
 *         fileName:
 *           type: string
 *           description: Original filename
 *         fileSize:
 *           type: integer
 *           description: File size in bytes
 *         fileType:
 *           type: string
 *           description: MIME type of the file
 *         reportType:
 *           type: string
 *           enum: ['X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other']
 *           description: Type of medical report
 *         uploadDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of upload
 *         uploadedBy:
 *           type: integer
 *           description: User ID who uploaded the report
 */

/**
 * @swagger
 * /medical-reports:
 *   post:
 *     summary: Upload medical report
 *     tags: [Medical Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - title
 *               - file
 *             properties:
 *               patientId:
 *                 type: integer
 *                 description: Patient ID
 *               title:
 *                 type: string
 *                 description: Report title
 *               description:
 *                 type: string
 *                 description: Report description
 *               reportType:
 *                 type: string
 *                 enum: ['X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other']
 *                 description: Type of medical report
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Medical report file
 *     responses:
 *       201:
 *         description: Medical report uploaded successfully
 *       400:
 *         description: No file uploaded
 *       404:
 *         description: Patient not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticate(), upload.single('file'), medicalReportController.uploadMedicalReport);

/**
 * @swagger
 * /medical-reports/patient/{patientId}:
 *   get:
 *     summary: Get all medical reports for a patient
 *     tags: [Medical Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
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
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: ['X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other']
 *         description: Filter by report type
 *     responses:
 *       200:
 *         description: Medical reports retrieved successfully
 *       404:
 *         description: Patient not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/patient/:patientId', authenticate(), medicalReportController.getPatientMedicalReports);

/**
 * @swagger
 * /medical-reports/{id}/download:
 *   get:
 *     summary: Download medical report file
 *     tags: [Medical Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medical report ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       404:
 *         description: Medical report or file not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id/download', authenticate(), medicalReportController.downloadMedicalReport);

/**
 * @swagger
 * /medical-reports/{id}:
 *   put:
 *     summary: Update medical report details
 *     tags: [Medical Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medical report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated report title
 *               description:
 *                 type: string
 *                 description: Updated report description
 *               reportType:
 *                 type: string
 *                 enum: ['X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other']
 *                 description: Updated report type
 *     responses:
 *       200:
 *         description: Medical report updated successfully
 *       404:
 *         description: Medical report not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id', authenticate(), medicalReportController.updateMedicalReport);

/**
 * @swagger
 * /medical-reports/{id}:
 *   delete:
 *     summary: Delete medical report (soft delete)
 *     tags: [Medical Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medical report ID
 *     responses:
 *       200:
 *         description: Medical report deleted successfully
 *       404:
 *         description: Medical report not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', authenticate(), medicalReportController.deleteMedicalReport);

/**
 * @swagger
 * /medical-reports:
 *   get:
 *     summary: Get all medical reports (for admin/doctor dashboard)
 *     tags: [Medical Reports]
 *     security:
 *       - bearerAuth: []
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
 *         name: patientId
 *         schema:
 *           type: integer
 *         description: Filter by patient ID
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: ['X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other']
 *         description: Filter by report type
 *     responses:
 *       200:
 *         description: Medical reports retrieved successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticate(), medicalReportController.getAllMedicalReports);

module.exports = router; 