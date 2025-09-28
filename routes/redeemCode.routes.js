const express = require('express');
const router = express.Router();
const redeemCodeController = require('../controllers/redeemCode.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: Redeem Code
 *     description: Redeem code/coupon management endpoints
 *   - name: Admin - Redeem Code
 *     description: Admin redeem code management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RedeemCode:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: WELCOME10
 *         name:
 *           type: string
 *           example: Welcome Discount
 *         description:
 *           type: string
 *           example: 10% discount for new users
 *         discountType:
 *           type: string
 *           enum: [percentage, amount]
 *           example: percentage
 *         discountValue:
 *           type: number
 *           example: 10.00
 *         maxDiscountAmount:
 *           type: number
 *           example: 100.00
 *         minOrderAmount:
 *           type: number
 *           example: 500.00
 *         usageLimit:
 *           type: integer
 *           example: 100
 *         usageCount:
 *           type: integer
 *           example: 25
 *         userUsageLimit:
 *           type: integer
 *           example: 1
 *         validFrom:
 *           type: string
 *           format: date-time
 *         validUntil:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *           example: true
 *         applicableFor:
 *           type: string
 *           enum: [all, virtual_appointment]
 *           example: virtual_appointment
 */

// User routes
/**
 * @swagger
 * /redeem-code/validate/{code}:
 *   get:
 *     summary: Validate redeem code
 *     description: Check if a redeem code is valid and calculate discount
 *     tags: [Redeem Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Redeem code to validate
 *         example: WELCOME10
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         description: Order amount to calculate discount
 *         example: 500.00
 *     responses:
 *       200:
 *         description: Redeem code validation result
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
 *                   example: Redeem code is valid
 *                 data:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: WELCOME10
 *                     name:
 *                       type: string
 *                       example: Welcome Discount
 *                     discountType:
 *                       type: string
 *                       example: percentage
 *                     discountValue:
 *                       type: number
 *                       example: 10.00
 *                     isApplicable:
 *                       type: boolean
 *                       example: true
 *                     discountAmount:
 *                       type: number
 *                       example: 50.00
 *                     finalAmount:
 *                       type: number
 *                       example: 450.00
 *       400:
 *         description: Invalid or expired redeem code
 *       404:
 *         description: Redeem code not found
 *       500:
 *         description: Internal server error
 */
router.get('/validate/:code', 
  authenticate(['user']), 
  redeemCodeController.validateRedeemCode
);

// Admin routes
/**
 * @swagger
 * /redeem-code/admin:
 *   post:
 *     summary: Create new redeem code
 *     description: Create a new redeem code/coupon (Admin only)
 *     tags: [Admin - Redeem Code]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - discountType
 *               - discountValue
 *             properties:
 *               code:
 *                 type: string
 *                 description: Unique redeem code
 *                 example: WELCOME10
 *               name:
 *                 type: string
 *                 description: Display name for the code
 *                 example: Welcome Discount
 *               description:
 *                 type: string
 *                 description: Description of the offer
 *                 example: 10% discount for new users
 *               discountType:
 *                 type: string
 *                 enum: [percentage, amount]
 *                 description: Type of discount
 *                 example: percentage
 *               discountValue:
 *                 type: number
 *                 description: Discount value (percentage or fixed amount)
 *                 example: 10.00
 *               maxDiscountAmount:
 *                 type: number
 *                 description: Maximum discount amount for percentage coupons
 *                 example: 100.00
 *               minOrderAmount:
 *                 type: number
 *                 description: Minimum order amount required
 *                 example: 500.00
 *               usageLimit:
 *                 type: integer
 *                 description: Total usage limit (null for unlimited)
 *                 example: 100
 *               userUsageLimit:
 *                 type: integer
 *                 description: Usage limit per user
 *                 example: 1
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 description: Valid from date
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *                 description: Valid until date
 *               isActive:
 *                 type: boolean
 *                 description: Whether the code is active
 *                 example: true
 *               applicableFor:
 *                 type: string
 *                 enum: [all, virtual_appointment]
 *                 description: What the code is applicable for
 *                 example: virtual_appointment
 *     responses:
 *       201:
 *         description: Redeem code created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/admin', 
  authenticate(['admin']), 
  redeemCodeController.createRedeemCode
);

/**
 * @swagger
 * /redeem-code/admin:
 *   get:
 *     summary: Get all redeem codes
 *     description: Get list of all redeem codes with pagination (Admin only)
 *     tags: [Admin - Redeem Code]
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
 *         description: Items per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: discountType
 *         schema:
 *           type: string
 *           enum: [percentage, amount]
 *         description: Filter by discount type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by code or name
 *     responses:
 *       200:
 *         description: Redeem codes retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin', 
  authenticate(['admin']), 
  redeemCodeController.getAllRedeemCodes
);

/**
 * @swagger
 * /redeem-code/admin/{id}:
 *   put:
 *     summary: Update redeem code
 *     description: Update an existing redeem code (Admin only)
 *     tags: [Admin - Redeem Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Redeem code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME15
 *               name:
 *                 type: string
 *                 example: Updated Welcome Discount
 *               description:
 *                 type: string
 *                 example: 15% discount for new users
 *               discountType:
 *                 type: string
 *                 enum: [percentage, amount]
 *                 example: percentage
 *               discountValue:
 *                 type: number
 *                 example: 15.00
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Redeem code updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Redeem code not found
 *       500:
 *         description: Internal server error
 */
router.put('/admin/:id', 
  authenticate(['admin']), 
  redeemCodeController.updateRedeemCode
);

/**
 * @swagger
 * /redeem-code/admin/{id}:
 *   delete:
 *     summary: Delete redeem code
 *     description: Delete a redeem code (Admin only)
 *     tags: [Admin - Redeem Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Redeem code ID
 *     responses:
 *       200:
 *         description: Redeem code deleted successfully
 *       400:
 *         description: Cannot delete used redeem code
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Redeem code not found
 *       500:
 *         description: Internal server error
 */
router.delete('/admin/:id', 
  authenticate(['admin']), 
  redeemCodeController.deleteRedeemCode
);

/**
 * @swagger
 * /redeem-code/admin/{id}/stats:
 *   get:
 *     summary: Get redeem code statistics
 *     description: Get detailed usage statistics for a redeem code (Admin only)
 *     tags: [Admin - Redeem Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Redeem code ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for usage history
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page for usage history
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Redeem code not found
 *       500:
 *         description: Internal server error
 */
router.get('/admin/:id/stats', 
  authenticate(['admin']), 
  redeemCodeController.getRedeemCodeStats
);

module.exports = router;




