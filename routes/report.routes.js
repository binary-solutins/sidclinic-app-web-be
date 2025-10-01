const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const reportController = require('../controllers/report.controller');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 3 // Exactly 3 files required
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});



/**
 * @swagger
 * /create/user/report:
 *   post:
 *     summary: Create a new dental analysis report (requires exactly 3 images)
 *     description: |
 *       Creates a new dental analysis report. This endpoint requires exactly 3 images:
 *       - Front view of teeth
 *       - Left side view of teeth  
 *       - Right side view of teeth
 *       
 *       The boundingBoxData should contain analysis results for all 3 images.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 minItems: 3
 *                 maxItems: 3
 *                 description: Exactly 3 dental images required for analysis (front, left, right views)
 *               boundingBoxData:
 *                 type: string
 *                 description: JSON string containing bounding box data for all 3 images
 *                 example: '[{"imageName":"front_teeth.jpg","imageType":"front","description":"Front teeth analysis","detections":[{"class_name":"cavity","confidence":0.85,"bbox":[100,150,200,250]}],"teethDetection":{"teeth_count":8,"positions":[]},"imageDimensions":{"width":800,"height":600},"defectSummary":[{"className":"cavity","confidence":0.85,"locations":["front"]}]},{"imageName":"left_teeth.jpg","imageType":"left","description":"Left side teeth analysis","detections":[],"teethDetection":{"teeth_count":4,"positions":[]},"imageDimensions":{"width":800,"height":600},"defectSummary":[]},{"imageName":"right_teeth.jpg","imageType":"right","description":"Right side teeth analysis","detections":[],"teethDetection":{"teeth_count":4,"positions":[]},"imageDimensions":{"width":800,"height":600},"defectSummary":[]}]'
 *               relativeId:
 *                 type: integer
 *                 description: Family member ID (0 for user themselves)
 *                 example: 1
 *               relativeName:
 *                 type: string
 *                 description: Name of the relative or user
 *                 example: "John Doe"
 *               reportType:
 *                 type: string
 *                 enum: [oral_diagnosis, dental_analysis, teeth_detection, cavity_detection, plaque_detection, other]
 *                 description: Type of report
 *                 example: "oral_diagnosis"
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Report created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       400:
 *         description: Bad request - missing required fields, invalid data, or incorrect number of images (exactly 3 required)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Exactly 3 images are required for dental analysis"
 *                 data:
 *                   type: null
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/create/user/report', 
  authenticate(['user', 'doctor', 'admin']), 
  upload.array('images', 3), 
  reportController.createReport
);

/**
 * @swagger
 * /get/user/reports:
 *   get:
 *     summary: Get all reports for the authenticated user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: relativeId
 *         schema:
 *           type: integer
 *         description: Filter by relative ID (0 for user themselves)
 *         example: 1
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/get/user/reports', 
  authenticate(['user', 'doctor', 'admin']), 
  reportController.getUserReports
);

/**
 * @swagger
 * /get/patient/reports/{patientId}:
 *   get:
 *     summary: Get all reports for a specific patient (admin/doctor access)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *         example: 1
 *       - in: query
 *         name: relativeId
 *         schema:
 *           type: integer
 *         description: Filter by relative ID (0 for patient themselves)
 *         example: 1
 *     responses:
 *       200:
 *         description: Patient reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Internal server error
 */
router.get('/get/patient/reports/:patientId', 
  authenticate(['doctor', 'admin']), 
  reportController.getPatientReports
);

/**
 * @swagger
 * /get/report/{reportId}:
 *   get:
 *     summary: Get a specific report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *         example: 123
 *     responses:
 *       200:
 *         description: Report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Report not found
 *       500:
 *         description: Internal server error
 */
router.get('/get/report/:reportId', 
  authenticate(['user', 'doctor', 'admin']), 
  reportController.getReportById
);

/**
 * @swagger
 * /delete/report/{reportId}:
 *   delete:
 *     summary: Delete a report (soft delete)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *         example: 123
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Report deleted successfully"
 *                 data:
 *                   type: null
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Report not found
 *       500:
 *         description: Internal server error
 */
router.delete('/delete/report/:reportId', 
  authenticate(['user', 'doctor', 'admin']), 
  reportController.deleteReport
);

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
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Exactly 3 images are required for dental analysis',
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
