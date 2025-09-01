const express = require('express');
const router = express.Router();
const adminSettingController = require('../controllers/adminSetting.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /admin/settings:
 *   get:
 *     summary: Get admin settings for the authenticated admin user
 *     description: Retrieve admin settings including virtual appointment times and alert emails
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin settings retrieved successfully
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
 *                   example: "Admin settings retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AdminSetting'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/settings:
 *   put:
 *     summary: Update admin settings for the authenticated admin user
 *     description: Update virtual appointment times and alert emails
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminSettingUpdate'
 *     responses:
 *       200:
 *         description: Admin settings updated successfully
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
 *                   example: "Admin settings updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AdminSetting'
 *       400:
 *         description: Validation error
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
 *                   example: "Invalid start time format. Use HH:MM:SS format."
 *                 data:
 *                   type: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/settings/all:
 *   get:
 *     summary: Get all admin settings (for system overview)
 *     description: Retrieve all admin settings from all admin users
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All admin settings retrieved successfully
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
 *                   example: "All admin settings retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminSetting'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /admin/settings:
 *   delete:
 *     summary: Delete admin settings for the authenticated admin user
 *     description: Remove admin settings (for cleanup purposes)
 *     tags: [Admin Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin settings deleted successfully
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
 *                   example: "Admin settings deleted successfully"
 *                 data:
 *                   type: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Admin settings not found
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
 *                   example: "Admin settings not found"
 *                 data:
 *                   type: null
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

// Routes
router.get('/', authenticate(), authorize('admin'), adminSettingController.getAdminSettings);
router.put('/', authenticate(), authorize('admin'), adminSettingController.updateAdminSettings);
router.get('/all', authenticate(), authorize('admin'), adminSettingController.getAllAdminSettings);
router.delete('/', authenticate(), authorize('admin'), adminSettingController.deleteAdminSettings);

module.exports = router;

