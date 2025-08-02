const express = require('express');
const router = express.Router();
const oralHealthScoreController = require('../controllers/oralHealthScore.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Oral Health Scores
 *   description: Oral health score management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OralHealthScore:
 *       type: object
 *       required:
 *         - patientId
 *         - score
 *       properties:
 *         patientId:
 *           type: integer
 *           description: Patient ID
 *           example: 1
 *         score:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Oral health score (0-100)
 *           example: 85
 *         notes:
 *           type: string
 *           description: Additional notes about the assessment
 *           example: "Good oral hygiene, minor tartar buildup"
 *         assessmentDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of assessment
 *         assessedBy:
 *           type: integer
 *           description: Doctor ID who assessed the score
 */

/**
 * @swagger
 * /oral-health-scores:
 *   post:
 *     summary: Add oral health score for a patient
 *     tags: [Oral Health Scores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - score
 *             properties:
 *               patientId:
 *                 type: integer
 *                 description: Patient ID
 *               score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Oral health score
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Oral health score added successfully
 *       400:
 *         description: Invalid score value
 *       404:
 *         description: Patient not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticate(), oralHealthScoreController.addOralHealthScore);

/**
 * @swagger
 * /oral-health-scores/patient/{patientId}:
 *   get:
 *     summary: Get all oral health scores for a patient
 *     tags: [Oral Health Scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Oral health scores retrieved successfully
 *       404:
 *         description: Patient not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/patient/:patientId', authenticate(), oralHealthScoreController.getPatientOralHealthScores);

/**
 * @swagger
 * /oral-health-scores/patient/{patientId}/latest:
 *   get:
 *     summary: Get latest oral health score for a patient
 *     tags: [Oral Health Scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Latest oral health score retrieved successfully
 *       404:
 *         description: Patient not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/patient/:patientId/latest', authenticate(), oralHealthScoreController.getLatestOralHealthScore);

/**
 * @swagger
 * /oral-health-scores/{id}:
 *   put:
 *     summary: Update oral health score
 *     tags: [Oral Health Scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Oral health score ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Updated oral health score
 *               notes:
 *                 type: string
 *                 description: Updated notes
 *     responses:
 *       200:
 *         description: Oral health score updated successfully
 *       400:
 *         description: Invalid score value
 *       404:
 *         description: Oral health score not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id', authenticate(), oralHealthScoreController.updateOralHealthScore);

/**
 * @swagger
 * /oral-health-scores/{id}:
 *   delete:
 *     summary: Delete oral health score
 *     tags: [Oral Health Scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Oral health score ID
 *     responses:
 *       200:
 *         description: Oral health score deleted successfully
 *       404:
 *         description: Oral health score not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', authenticate(), oralHealthScoreController.deleteOralHealthScore);

/**
 * @swagger
 * /oral-health-scores:
 *   get:
 *     summary: Get all oral health scores (for admin/doctor dashboard)
 *     tags: [Oral Health Scores]
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
 *     responses:
 *       200:
 *         description: Oral health scores retrieved successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticate(), oralHealthScoreController.getAllOralHealthScores);

module.exports = router; 