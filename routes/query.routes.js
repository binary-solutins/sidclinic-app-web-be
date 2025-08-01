const express = require('express');
const router = express.Router();
const queryController = require('../controllers/query.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Queries
 *   description: Query management and support ticket system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Query:
 *       type: object
 *       required:
 *         - title
 *         - description
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the query
 *           example: 1
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Query title
 *           example: "Appointment booking issue"
 *         description:
 *           type: string
 *           description: Detailed description of the query
 *           example: "I'm unable to book an appointment for tomorrow"
 *         category:
 *           type: string
 *           enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other']
 *           default: 'General'
 *           description: Category of the query
 *         priority:
 *           type: string
 *           enum: ['Low', 'Medium', 'High', 'Urgent']
 *           default: 'Medium'
 *           description: Priority level of the query
 *         status:
 *           type: string
 *           enum: ['Open', 'In Progress', 'Resolved', 'Closed']
 *           default: 'Open'
 *           description: Current status of the query
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of attachment URLs
 *           example: ["https://example.com/file1.jpg"]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags for categorizing the query
 *           example: ["urgent", "billing"]
 *         isPublic:
 *           type: boolean
 *           default: false
 *           description: Whether the query is public (FAQ-like)
 *         adminResponse:
 *           type: string
 *           description: Admin's response to the query
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: User rating for resolved queries
 *         feedback:
 *           type: string
 *           description: User feedback for resolved queries
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Query creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Query last update timestamp
 *     
 *     CreateQueryRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Query title
 *           example: "Payment issue"
 *         description:
 *           type: string
 *           description: Detailed description of the query
 *           example: "I was charged twice for the same appointment"
 *         category:
 *           type: string
 *           enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other']
 *           default: 'General'
 *         priority:
 *           type: string
 *           enum: ['Low', 'Medium', 'High', 'Urgent']
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isPublic:
 *           type: boolean
 *           default: false
 *     
 *     UpdateQueryRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 200
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other']
 *         priority:
 *           type: string
 *           enum: ['Low', 'Medium', 'High', 'Urgent']
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isPublic:
 *           type: boolean
 *     
 *     QueryResponse:
 *       type: object
 *       required:
 *         - adminResponse
 *       properties:
 *         adminResponse:
 *           type: string
 *           description: Admin's response to the query
 *           example: "Thank you for your query. We have resolved the issue."
 *     
 *     QueryStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: ['Open', 'In Progress', 'Resolved', 'Closed']
 *           description: New status for the query
 *         adminResponse:
 *           type: string
 *           description: Optional admin response when updating status
 *     
 *     QueryRating:
 *       type: object
 *       required:
 *         - rating
 *       properties:
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1 to 5
 *           example: 5
 *         feedback:
 *           type: string
 *           description: Optional feedback text
 *           example: "Great service, issue resolved quickly"
 */

/**
 * @swagger
 * /queries:
 *   post:
 *     summary: Create a new query
 *     description: Create a new support query/ticket (for users and doctors)
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQueryRequest'
 *     responses:
 *       201:
 *         description: Query created successfully
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
 *                   example: "Query created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Query'
 *       400:
 *         description: Bad request - missing required fields
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
 *                   example: "Title and description are required"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticate(['user', 'doctor']), queryController.createQuery);

/**
 * @swagger
 * /queries:
 *   get:
 *     summary: Get all queries (Admin only)
 *     description: Retrieve all queries with filtering and pagination (admin access)
 *     tags: [Queries]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['Open', 'In Progress', 'Resolved', 'Closed']
 *         description: Filter by query status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other']
 *         description: Filter by query category
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: ['Low', 'Medium', 'High', 'Urgent']
 *         description: Filter by query priority
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: Queries retrieved successfully
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
 *                   example: "Queries retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Query'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticate(['admin']), queryController.getAllQueries);

/**
 * @swagger
 * /queries/my:
 *   get:
 *     summary: Get user's own queries
 *     description: Retrieve queries created by the authenticated user
 *     tags: [Queries]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['Open', 'In Progress', 'Resolved', 'Closed']
 *         description: Filter by query status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other']
 *         description: Filter by query category
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: ['createdAt', 'updatedAt', 'priority', 'status']
 *           default: 'createdAt'
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: ['ASC', 'DESC']
 *           default: 'DESC'
 *         description: Sort order
 *     responses:
 *       200:
 *         description: User queries retrieved successfully
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
 *                   example: "User queries retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Query'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 15
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 2
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/my', authenticate(['user', 'doctor']), queryController.getUserQueries);

/**
 * @swagger
 * /queries/public:
 *   get:
 *     summary: Get public queries (FAQ-like)
 *     description: Retrieve public queries that can be viewed by anyone
 *     tags: [Queries]
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
 *         name: category
 *         schema:
 *           type: string
 *           enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other']
 *         description: Filter by query category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, description, and admin response
 *     responses:
 *       200:
 *         description: Public queries retrieved successfully
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
 *                   example: "Public queries retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Query'
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
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/public', queryController.getPublicQueries);

/**
 * @swagger
 * /queries/{id}:
 *   get:
 *     summary: Get query by ID
 *     description: Retrieve a specific query by its ID
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Query ID
 *     responses:
 *       200:
 *         description: Query retrieved successfully
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
 *                   example: "Query retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Query'
 *       404:
 *         description: Query not found
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
 *                   example: "Query not found"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', authenticate(), queryController.getQueryById);

/**
 * @swagger
 * /queries/{id}:
 *   put:
 *     summary: Update query
 *     description: Update a query (users can only update their own queries, admins can update any query)
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Query ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQueryRequest'
 *     responses:
 *       200:
 *         description: Query updated successfully
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
 *                   example: "Query updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Query'
 *       404:
 *         description: Query not found
 *       403:
 *         description: Access denied - can only update own queries
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id', authenticate(), queryController.updateQuery);

/**
 * @swagger
 * /queries/{id}:
 *   delete:
 *     summary: Delete query
 *     description: Delete a query (soft delete - users can only delete their own queries, admins can delete any query)
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Query ID
 *     responses:
 *       200:
 *         description: Query deleted successfully
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
 *                   example: "Query deleted successfully"
 *       404:
 *         description: Query not found
 *       403:
 *         description: Access denied - can only delete own queries
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', authenticate(), queryController.deleteQuery);

/**
 * @swagger
 * /queries/{id}/respond:
 *   post:
 *     summary: Respond to query (Admin only)
 *     description: Admin response to a query
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Query ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QueryResponse'
 *     responses:
 *       200:
 *         description: Response added successfully
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
 *                   example: "Response added successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Query'
 *       404:
 *         description: Query not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/respond', authenticate(['admin']), queryController.respondToQuery);

/**
 * @swagger
 * /queries/{id}/status:
 *   put:
 *     summary: Update query status (Admin only)
 *     description: Update the status of a query
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Query ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QueryStatusUpdate'
 *     responses:
 *       200:
 *         description: Status updated successfully
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
 *                   example: "Status updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Query'
 *       404:
 *         description: Query not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id/status', authenticate(['admin']), queryController.updateQueryStatus);

/**
 * @swagger
 * /queries/{id}/rate:
 *   post:
 *     summary: Rate a resolved query
 *     description: Rate a resolved query (users can only rate their own resolved queries)
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Query ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QueryRating'
 *     responses:
 *       200:
 *         description: Query rated successfully
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
 *                   example: "Query rated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     rating:
 *                       type: integer
 *                       example: 5
 *                     feedback:
 *                       type: string
 *                       example: "Great service!"
 *       400:
 *         description: Invalid rating or query not resolved
 *       404:
 *         description: Query not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/rate', authenticate(['user', 'doctor']), queryController.rateQuery);

/**
 * @swagger
 * /queries/{id}/admin-delete:
 *   delete:
 *     summary: Delete query (Admin only)
 *     description: Admin can delete any query permanently
 *     tags: [Queries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Query ID
 *     responses:
 *       200:
 *         description: Query deleted successfully
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
 *                   example: "Query deleted successfully"
 *       404:
 *         description: Query not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id/admin-delete', authenticate(['admin']), queryController.deleteQueryAdmin);

module.exports = router; 