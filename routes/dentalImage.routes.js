const express = require('express');
const router = express.Router();
const multer = require('multer');
const dentalImageController = require('../controllers/dentalImage.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { multerConfigs, createMulterErrorHandler } = require('../config/multer.config');

// Use centralized multer configuration for multiple images
const upload = multerConfigs.multipleImagesUpload;

/**
 * @swagger
 * components:
 *   schemas:
 *     DentalImage:
 *       type: object
 *       required:
 *         - imageUrls
 *       properties:
 *         relativeId:
 *           type: integer
 *           description: ID of the family member (relative) if image is for a relative
 *         description:
 *           type: string
 *           description: Optional description of the dental images
 *         imageType:
 *           type: string
 *           enum: [xray, photo, scan, other]
 *           default: other
 *           description: Type of dental image
 *     DentalImageResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         relativeId:
 *           type: integer
 *           nullable: true
 *         imageUrls:
 *           type: array
 *           items:
 *             type: string
 *         description:
 *           type: string
 *         imageType:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         FamilyMember:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             relation:
 *               type: string
 */

/**
 * @swagger
 * /dental-images:
 *   post:
 *     summary: Upload dental images
 *     tags: [Dental Images]
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
 *                 description: Multiple dental image files
 *               relativeId:
 *                 type: integer
 *                 description: ID of the family member (relative) if image is for a relative
 *               description:
 *                 type: string
 *                 description: Optional description of the dental images
 *               imageType:
 *                 type: string
 *                 enum: [xray, photo, scan, other]
 *                 default: other
 *     responses:
 *       201:
 *         description: Dental images uploaded successfully
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
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Dental images uploaded successfully
 *                 data:
 *                   $ref: '#/components/schemas/DentalImageResponse'
 *       400:
 *         description: No images uploaded or invalid data
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Patient profile or relative not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticate(), upload.array('images', 10), dentalImageController.uploadDentalImages);

// Error handling middleware for multer
router.use(createMulterErrorHandler('10MB', 10));

/**
 * @swagger
 * /dental-images:
 *   get:
 *     summary: Get user's dental images
 *     tags: [Dental Images]
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
 *         description: Dental images retrieved successfully
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
 *                   example: Dental images retrieved successfully
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
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticate(), dentalImageController.getUserDentalImages);

/**
 * @swagger
 * /dental-images/{id}:
 *   get:
 *     summary: Get specific dental image by ID
 *     tags: [Dental Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dental image ID
 *     responses:
 *       200:
 *         description: Dental image retrieved successfully
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
 *                   example: Dental image retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/DentalImageResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Dental image not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', authenticate(), dentalImageController.getDentalImageById);

/**
 * @swagger
 * /dental-images/{id}:
 *   delete:
 *     summary: Delete dental image
 *     tags: [Dental Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dental image ID
 *     responses:
 *       200:
 *         description: Dental image deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Dental image not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', authenticate(), dentalImageController.deleteDentalImage);

module.exports = router; 