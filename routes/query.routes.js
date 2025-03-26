const express = require('express');
const router = express.Router();
const queryController = require('../controllers/query.controller');

/**
 * @swagger
 * tags:
 *   name: Queries
 *   description: Query management API
 */

/**
 * @swagger
 * /query/create:
 *   post:
 *     summary: Create a new query (User/Doctor)
 *     tags: [Queries]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               message:
 *                 type: string
 *                 example: "I need medical advice"
 *     responses:
 *       201:
 *         description: Query created successfully
 *       401:
 *         description: Unauthorized (Missing or invalid token)
 */
router.post('/create', queryController.createQuery);

/**
 * @swagger
 * /api/query/all:
 *   get:
 *     summary: Get all queries (Admin Only)
 *     tags: [Queries]
 *     responses:
 *       200:
 *         description: Returns all queries
 *       401:
 *         description: Unauthorized
 */
router.get('/all', queryController.getAllQueries);

/**
 * @swagger
 * /api/query/by-role:
 *   get:
 *     summary: Get queries based on user/doctor role
 *     tags: [Queries]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns queries for the logged-in user's role
 *       401:
 *         description: Unauthorized (Missing or invalid token)
 */
router.get('/by-role', queryController.getQueriesByRole);

/**
 * @swagger
 * /api/query/edit/{id}:
 *   put:
 *     summary: Edit a query by ID
 *     tags: [Queries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The query ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Updated query message"
 *     responses:
 *       200:
 *         description: Query updated successfully
 *       404:
 *         description: Query not found
 */
router.put('/edit/:id', queryController.editQuery);

module.exports = router;
