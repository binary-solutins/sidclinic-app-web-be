const priceController = require('../controllers/price.controller');
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Price:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Service ID
 *         serviceName:
 *           type: string
 *           description: Name of the service
 *         price:
 *           type: number
 *           format: decimal
 *           description: Price of the service
 *         isActive:
 *           type: boolean
 *           description: Whether the service is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PriceInput:
 *       type: object
 *       required:
 *         - serviceName
 *         - price
 *       properties:
 *         serviceName:
 *           type: string
 *           description: Name of the service
 *         price:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *           description: Price of the service
 *     PriceUpdateInput:
 *       type: object
 *       required:
 *         - price
 *       properties:
 *         price:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *           description: Price of the service
 */

/**
 * @swagger
 * /api/price/initialize:
 *   post:
 *     summary: Initialize predefined services
 *     description: Creates predefined services in the database (run once for setup)
 *     tags: [Prices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Services initialized successfully
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
 *                   example: Services initialized successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     newServicesAdded:
 *                       type: integer
 *                     totalServices:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Server error
 */
router.post('/initialize', authenticate(), priceController.initializeServices);

/**
 * @swagger
 * /api/price:
 *   get:
 *     summary: Get all services with their prices
 *     description: Retrieve all services with optional filtering
 *     tags: [Prices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hasPrice
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by services that have price set (true) or not (false)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active services
 *     responses:
 *       200:
 *         description: Services retrieved successfully
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
 *                   example: Services retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Price'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Server error
 */
router.get('/', authenticate(),authorize('admin'), priceController.getAllPrices);

/**
 * @swagger
 * /api/price/services:
 *   get:
 *     summary: Get available services list
 *     description: Get list of all predefined services
 *     tags: [Prices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available services retrieved successfully
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
 *                   example: Available services retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: array
 *                       items:
 *                         type: string
 *                     totalCount:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Server error
 */
router.get('/services', authenticate(),authorize('admin'), priceController.getAvailableServices);

/**
 * @swagger
 * /api/price/{id}:
 *   get:
 *     summary: Get service by ID
 *     description: Retrieve a specific service by its ID
 *     tags: [Prices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service retrieved successfully
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
 *                   example: Service retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Price'
 *       400:
 *         description: Invalid service ID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate(),authorize('admin'), priceController.getPriceById);

/**
 * @swagger
 * /api/price:
 *   post:
 *     summary: Add or update price for a service
 *     description: Add price for a new service or update existing service price
 *     tags: [Prices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PriceInput'
 *     responses:
 *       200:
 *         description: Price updated successfully
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
 *                   example: Price updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Price'
 *       201:
 *         description: Price added successfully
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
 *                   example: Price added successfully
 *                 data:
 *                   $ref: '#/components/schemas/Price'
 *       400:
 *         description: Invalid input or service name not in predefined list
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Server error
 */
router.post('/', authenticate(),authorize('admin'), priceController.addOrUpdatePrice);

/**
 * @swagger
 * /api/price/{id}:
 *   put:
 *     summary: Edit price by ID
 *     description: Update price for a specific service by its ID
 *     tags: [Prices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PriceUpdateInput'
 *     responses:
 *       200:
 *         description: Price updated successfully
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
 *                   example: Price updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Price'
 *       400:
 *         description: Invalid input or service ID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate(),authorize('admin'), priceController.editPrice);

/**
 * @swagger
 * /api/price/{id}:
 *   delete:
 *     summary: Remove price from service
 *     description: Remove price from a service (sets price to null but keeps service active)
 *     tags: [Prices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Price removed successfully
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
 *                   example: Price removed successfully
 *                 data:
 *                   $ref: '#/components/schemas/Price'
 *       400:
 *         description: Invalid service ID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate(),authorize('admin'), priceController.removePrice);

module.exports = router;