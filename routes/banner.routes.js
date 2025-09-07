const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/banner.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: Banners
 *     description: Banner management endpoints
 */

// Public routes (no authentication required)
/**
 * @swagger
 * /banners:
 *   get:
 *     summary: Get all active banners
 *     description: Retrieve all active banners. Returns different data based on isDoctorApp flag - full data for doctor app (isDoctorApp=1) or only images for patient app (isDoctorApp=0).
 *     tags: [Banners]
 *     parameters:
 *       - in: query
 *         name: isDoctorApp
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by app type. 1 = Doctor app (returns all fields), 0 = Patient app (returns only images)
 *         example: "1"
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
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
 *                   example: "Banners retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - $ref: '#/components/schemas/DoctorAppBanner'
 *                       - $ref: '#/components/schemas/PatientAppBanner'
 *       500:
 *         description: Internal server error
 */
router.get('/banners', bannerController.getAllBanners);

/**
 * @swagger
 * /banners/{id}:
 *   get:
 *     summary: Get banner by ID
 *     description: Retrieve a specific banner by ID. Returns different data based on isDoctorApp flag.
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Banner ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Banner retrieved successfully
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
 *                   example: "Banner retrieved successfully"
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/DoctorAppBanner'
 *                     - $ref: '#/components/schemas/PatientAppBanner'
 *       404:
 *         description: Banner not found
 *       500:
 *         description: Internal server error
 */
router.get('/banners/:id', bannerController.getBannerById);

// Admin routes (authentication required)
/**
 * @swagger
 * /admin/banners:
 *   post:
 *     summary: Create a new banner (Admin only)
 *     description: Create a new banner with title, subtitle, image, and app type flag.
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               title:
 *                 type: string
 *                 description: Banner title
 *                 example: "Modern Dental Care"
 *               subtitle:
 *                 type: string
 *                 description: Banner subtitle
 *                 example: "Advanced Technology for Perfect Smiles"
 *               image:
 *                 type: string
 *                 description: Banner image URL
 *                 example: "https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=800"
 *               isDoctorApp:
 *                 type: boolean
 *                 description: Flag to determine app type (true = doctor app, false = patient app)
 *                 example: true
 *               order:
 *                 type: integer
 *                 description: Display order for banners
 *                 example: 1
 *     responses:
 *       201:
 *         description: Banner created successfully
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
 *                   example: "Banner created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Banner'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/admin/banners', 
  authenticate(['admin']), 
  bannerController.createBanner
);

/**
 * @swagger
 * /admin/banners:
 *   get:
 *     summary: Get all banners for admin (Admin only)
 *     description: Retrieve all banners with admin controls including inactive banners and pagination.
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isDoctorApp
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by app type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by active status
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
 *     responses:
 *       200:
 *         description: Banners retrieved successfully
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
 *                   example: "Banners retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Banner'
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
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/banners', 
  authenticate(['admin']), 
  bannerController.getAllBannersAdmin
);

/**
 * @swagger
 * /admin/banners/{id}:
 *   put:
 *     summary: Update banner (Admin only)
 *     description: Update an existing banner with new information.
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Banner ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Banner title
 *                 example: "Updated Dental Care"
 *               subtitle:
 *                 type: string
 *                 description: Banner subtitle
 *                 example: "Updated subtitle"
 *               image:
 *                 type: string
 *                 description: Banner image URL
 *                 example: "https://example.com/new-image.jpg"
 *               isDoctorApp:
 *                 type: boolean
 *                 description: Flag to determine app type
 *                 example: false
 *               order:
 *                 type: integer
 *                 description: Display order for banners
 *                 example: 2
 *               isActive:
 *                 type: boolean
 *                 description: Banner active status
 *                 example: true
 *     responses:
 *       200:
 *         description: Banner updated successfully
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
 *                   example: "Banner updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Banner'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Banner not found
 *       500:
 *         description: Internal server error
 */
router.put('/admin/banners/:id', 
  authenticate(['admin']), 
  bannerController.updateBanner
);

/**
 * @swagger
 * /admin/banners/{id}:
 *   delete:
 *     summary: Delete banner (Admin only)
 *     description: Delete a banner permanently.
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Banner ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Banner deleted successfully
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
 *                   example: "Banner deleted successfully"
 *                 data:
 *                   type: null
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Banner not found
 *       500:
 *         description: Internal server error
 */
router.delete('/admin/banners/:id', 
  authenticate(['admin']), 
  bannerController.deleteBanner
);

module.exports = router;

