const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: Payment
 *     description: Payment management endpoints
 *   - name: Admin - Payment
 *     description: Admin payment management endpoints
 */

/**
 * @swagger
 * /payment/initiate:
 *   post:
 *     summary: Initiate payment for virtual appointment
 *     description: Initiate payment for a virtual appointment using PhonePe gateway
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *             properties:
 *               appointmentId:
 *                 type: integer
 *                 description: ID of the virtual appointment
 *                 example: 123
 *               paymentMethod:
 *                 type: string
 *                 enum: [phonepe, upi, card, netbanking, wallet]
 *                 default: phonepe
 *                 description: Payment method to use
 *                 example: phonepe
 *     responses:
 *       200:
 *         description: Payment initiated successfully
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
 *                   example: Payment initiated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: integer
 *                       example: 456
 *                     paymentUrl:
 *                       type: string
 *                       example: https://mercury.phonepe.com/transact/...
 *                     amount:
 *                       type: number
 *                       example: 500.00
 *                     currency:
 *                       type: string
 *                       example: INR
 *                     merchantTransactionId:
 *                       type: string
 *                       example: TXN_123_456_1705123456789
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not authorized for this appointment
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Internal server error
 */
router.post('/initiate', 
  authenticate(['user']), 
  paymentController.initiatePayment
);

/**
 * @swagger
 * /payment/phonepe/callback:
 *   post:
 *     summary: Handle PhonePe payment callback
 *     description: Handle webhook callback from PhonePe payment gateway with OAuth2 authentication
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - payload
 *             properties:
 *               event:
 *                 type: string
 *                 description: Event type from PhonePe
 *                 example: "checkout.order.completed"
 *               payload:
 *                 type: object
 *                 description: Payment details from PhonePe
 *                 properties:
 *                   orderId:
 *                     type: string
 *                     description: PhonePe order ID
 *                     example: "OMO2509221347448928334310"
 *                   merchantOrderId:
 *                     type: string
 *                     description: Your merchant transaction ID
 *                     example: "TXN_4_11_1758530847215"
 *                   state:
 *                     type: string
 *                     description: Payment state
 *                     example: "COMPLETED"
 *                   amount:
 *                     type: integer
 *                     description: Payment amount
 *                     example: 100
 *                   paymentDetails:
 *                     type: array
 *                     description: Payment method details
 *                     items:
 *                       type: object
 *                       properties:
 *                         paymentMode:
 *                           type: string
 *                           example: "UPI_COLLECT"
 *                         transactionId:
 *                           type: string
 *                           example: "OM2403282020198651071949"
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Callback processed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: integer
 *                       example: 9
 *                     event:
 *                       type: string
 *                       example: "checkout.order.completed"
 *                     paymentState:
 *                       type: string
 *                       example: "COMPLETED"
 *                     status:
 *                       type: string
 *                       example: "success"
 *                     appointmentStatus:
 *                       type: string
 *                       example: "confirmed"
 *       400:
 *         description: Bad request - invalid callback data
 *       500:
 *         description: Internal server error
 */
router.post('/phonepe/callback', 
  paymentController.handleCallback
);

/**
 * @swagger
 * /payment/status/{paymentId}:
 *   get:
 *     summary: Check payment status
 *     description: Check the current status of a payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *         example: 456
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
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
 *                   example: Payment status retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: integer
 *                       example: 456
 *                     status:
 *                       type: string
 *                       enum: [pending, initiated, processing, success, failed, cancelled, refunded, expired]
 *                       example: success
 *                     amount:
 *                       type: number
 *                       example: 500.00
 *                     currency:
 *                       type: string
 *                       example: INR
 *                     paymentMethod:
 *                       type: string
 *                       example: phonepe
 *                     initiatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-15T10:30:00Z
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-15T10:35:00Z
 *                     appointment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 123
 *                         appointmentDateTime:
 *                           type: string
 *                           format: date-time
 *                           example: 2024-01-16T14:00:00Z
 *                         type:
 *                           type: string
 *                           example: virtual
 *                         status:
 *                           type: string
 *                           example: confirmed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/status/:paymentId', 
  authenticate(['user']), 
  paymentController.checkPaymentStatus
);

/**
 * @swagger
 * /payment/sync/{paymentId}:
 *   post:
 *     summary: Manual sync payment status from PhonePe
 *     description: Force sync payment status from PhonePe for debugging
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID to sync
 *     responses:
 *       200:
 *         description: Payment synced successfully
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.post('/sync/:paymentId',
  authenticate(['user']),
  paymentController.manualSyncPayment
);

/**
 * @swagger
 * /payment/debug/{paymentId}:
 *   get:
 *     summary: Debug payment data (for troubleshooting)
 *     description: Get detailed payment information for debugging
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID to debug
 *     responses:
 *       200:
 *         description: Payment debug data retrieved
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/debug/:paymentId',
  authenticate(['user']),
  paymentController.debugPayment
);

/**
 * @swagger
 * /payment/history:
 *   get:
 *     summary: Get user's payment history
 *     description: Retrieve payment history for the authenticated user
 *     tags: [Payment]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, initiated, processing, success, failed, cancelled, refunded, expired]
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
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
 *                   example: Payment history retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 456
 *                       amount:
 *                         type: number
 *                         example: 500.00
 *                       status:
 *                         type: string
 *                         example: success
 *                       paymentMethod:
 *                         type: string
 *                         example: phonepe
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2024-01-15T10:30:00Z
 *                       appointment:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 123
 *                           appointmentDateTime:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-01-16T14:00:00Z
 *                           type:
 *                             type: string
 *                             example: virtual
 *                           status:
 *                             type: string
 *                             example: confirmed
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
 *       500:
 *         description: Internal server error
 */
router.get('/history', 
  authenticate(['user']), 
  paymentController.getPaymentHistory
);

/**
 * @swagger
 * /payment/details/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     description: Get detailed information about a specific payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *         example: 456
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/details/:paymentId', 
  authenticate(['user']), 
  paymentController.getPaymentDetails
);

/**
 * @swagger
 * /payment/methods:
 *   get:
 *     summary: Get available payment methods
 *     description: Get list of available payment methods
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
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
 *                   example: Payment methods retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: UPI
 *                       name:
 *                         type: string
 *                         example: UPI
 *                       description:
 *                         type: string
 *                         example: Pay using UPI ID or QR code
 *       500:
 *         description: Internal server error
 */
router.get('/methods', 
  paymentController.getPaymentMethods
);

/**
 * @swagger
 * /payment/pending:
 *   get:
 *     summary: Get pending payments for user
 *     description: Get list of appointments that need payment completion
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending payments retrieved successfully
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
 *                   example: Pending payments retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       appointmentId:
 *                         type: integer
 *                         example: 123
 *                       appointmentDateTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-09-25T14:30:00.000Z"
 *                       type:
 *                         type: string
 *                         example: virtual
 *                       status:
 *                         type: string
 *                         example: pending
 *                       patientName:
 *                         type: string
 *                         example: John Doe
 *                       hasPaymentAttempt:
 *                         type: boolean
 *                         example: true
 *                       lastPaymentStatus:
 *                         type: string
 *                         example: failed
 *                       canRetryPayment:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/pending', 
  authenticate(['user']), 
  paymentController.getPendingPayments
);

/**
 * @swagger
 * /payment/complete:
 *   post:
 *     summary: Complete payment for existing appointment
 *     description: Initiate payment for an existing appointment that hasn't been paid for
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *             properties:
 *               appointmentId:
 *                 type: integer
 *                 description: ID of the appointment to pay for
 *                 example: 123
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method (default: phonepe)
 *                 example: phonepe
 *                 default: phonepe
 *     responses:
 *       200:
 *         description: Payment initiated successfully
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
 *                   example: Payment initiated successfully for existing appointment
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: integer
 *                       example: 789
 *                     paymentUrl:
 *                       type: string
 *                       example: https://mercury.phonepe.com/transact/v2?token=...
 *                     amount:
 *                       type: number
 *                       example: 500.00
 *                     currency:
 *                       type: string
 *                       example: INR
 *                     appointmentId:
 *                       type: integer
 *                       example: 123
 *                     appointmentDateTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-25T14:30:00.000Z"
 *       400:
 *         description: Bad request - appointment not found or payment already completed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Internal server error
 */
router.post('/complete', 
  authenticate(['user']), 
  paymentController.completePayment
);

// Admin routes
/**
 * @swagger
 * /payment/admin:
 *   get:
 *     summary: Get all payments (Admin only)
 *     description: Retrieve all payments with filtering and pagination
 *     tags: [Admin - Payment]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, initiated, processing, success, failed, cancelled, refunded, expired]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [phonepe, upi, card, netbanking, wallet]
 *         description: Filter by payment method
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments to this date (YYYY-MM-DD)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin', 
  authenticate(['admin']), 
  paymentController.getAllPayments
);

/**
 * @swagger
 * /payment/admin/stats:
 *   get:
 *     summary: Get payment statistics (Admin only)
 *     description: Get payment statistics and analytics
 *     tags: [Admin - Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
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
 *                   example: Payment statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         fromDate:
 *                           type: string
 *                           format: date-time
 *                           example: 2024-01-01T00:00:00Z
 *                         toDate:
 *                           type: string
 *                           format: date-time
 *                           example: 2024-01-31T23:59:59Z
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                           example: 25000.00
 *                         totalTransactions:
 *                           type: integer
 *                           example: 50
 *                     statusDistribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             example: success
 *                           count:
 *                             type: integer
 *                             example: 45
 *                           totalAmount:
 *                             type: number
 *                             example: 22500.00
 *                     methodDistribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           paymentMethod:
 *                             type: string
 *                             example: phonepe
 *                           count:
 *                             type: integer
 *                             example: 50
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/stats', 
  authenticate(['admin']), 
  paymentController.getPaymentStats
);

module.exports = router;



