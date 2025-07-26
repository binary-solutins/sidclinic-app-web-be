const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');

/**
 * @swagger
 * tags:
 *   name: Location
 *   description: Country, State, and City management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Country:
 *       type: object
 *       properties:
 *         country_id:
 *           type: integer
 *           description: Unique identifier for the country
 *         country_name:
 *           type: string
 *           description: Full name of the country
 *           example: "United States"
 *         country_short_name:
 *           type: string
 *           description: Short name of the country
 *           example: "US"
 *         country_code:
 *           type: string
 *           description: Country code
 *           example: "+1"
 *         is_min_max_available:
 *           type: string
 *           enum: ['0', '1']
 *           description: Whether min/max length is available
 *         min_max_length:
 *           type: integer
 *           description: Min/max length value
 *         min:
 *           type: integer
 *           description: Minimum value
 *         max:
 *           type: integer
 *           description: Maximum value
 *         date_format:
 *           type: string
 *           description: Date format for the country
 *           example: "DD/MM/YYYY"
 *         android_date_format:
 *           type: string
 *           description: Android date format
 *           example: "DD/MM/YYYY"
 *         node_date_format:
 *           type: string
 *           description: Node.js date format
 *           example: "DD/MM/YYYY"
 *         sql_report_date_format:
 *           type: string
 *           description: SQL report date format
 *           example: "DD%MM%YYYY"
 *         sql_report_date_format_with_time:
 *           type: string
 *           description: SQL report date format with time
 *           example: "DD%MM%YYYY %H:%i %p"
 *         is_active:
 *           type: string
 *           enum: ['0', '1']
 *           description: Whether the country is active
 *           example: "1"
 * 
 *     State:
 *       type: object
 *       properties:
 *         state_id:
 *           type: integer
 *           description: Unique identifier for the state
 *         country_id:
 *           type: integer
 *           description: ID of the country this state belongs to
 *         state_name:
 *           type: string
 *           description: Name of the state
 *           example: "California"
 *         state_short_name:
 *           type: string
 *           description: Short name of the state
 *           example: "CA"
 *         mailchimp_list_id:
 *           type: string
 *           description: Mailchimp list ID for the state
 *         is_active:
 *           type: string
 *           enum: ['0', '1']
 *           description: Whether the state is active
 *           example: "1"
 * 
 *     City:
 *       type: object
 *       properties:
 *         city_id:
 *           type: integer
 *           description: Unique identifier for the city
 *         state_id:
 *           type: integer
 *           description: ID of the state this city belongs to
 *         parent_city_id:
 *           type: integer
 *           description: Parent city ID if applicable
 *         country_id:
 *           type: integer
 *           description: ID of the country this city belongs to
 *         city_name:
 *           type: string
 *           description: Name of the city
 *           example: "Los Angeles"
 *         is_active:
 *           type: string
 *           enum: ['0', '1']
 *           description: Whether the city is active
 *           example: "1"
 */

/**
 * @swagger
 * /location/countries:
 *   get:
 *     summary: Get all countries
 *     description: Retrieve a list of all countries with optional filtering
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter countries by name, short name, or code
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by active status (1 = Active, 0 = Inactive)
 *     responses:
 *       200:
 *         description: Countries retrieved successfully
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
 *                   example: "Countries retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Country'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /location/countries/{id}:
 *   get:
 *     summary: Get country by ID
 *     description: Retrieve a specific country by its ID
 *     tags: [Location]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Country retrieved successfully
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
 *                   example: "Country retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Country'
 *       404:
 *         description: Country not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /location/states:
 *   get:
 *     summary: Get all states
 *     description: Retrieve a list of all states with optional filtering
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: country_id
 *         schema:
 *           type: integer
 *         description: Filter states by country ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter states by name or short name
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by active status (1 = Active, 0 = Inactive)
 *     responses:
 *       200:
 *         description: States retrieved successfully
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
 *                   example: "States retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/State'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /location/states/{id}:
 *   get:
 *     summary: Get state by ID
 *     description: Retrieve a specific state by its ID
 *     tags: [Location]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: State ID
 *     responses:
 *       200:
 *         description: State retrieved successfully
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
 *                   example: "State retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/State'
 *       404:
 *         description: State not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /location/countries/{country_id}/states:
 *   get:
 *     summary: Get states by country
 *     description: Retrieve all states belonging to a specific country
 *     tags: [Location]
 *     parameters:
 *       - in: path
 *         name: country_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Country ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter states by name or short name
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by active status (1 = Active, 0 = Inactive)
 *     responses:
 *       200:
 *         description: States retrieved successfully
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
 *                   example: "States retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/State'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /location/cities:
 *   get:
 *     summary: Get all cities
 *     description: Retrieve a list of all cities with optional filtering
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: state_id
 *         schema:
 *           type: integer
 *         description: Filter cities by state ID
 *       - in: query
 *         name: country_id
 *         schema:
 *           type: integer
 *         description: Filter cities by country ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter cities by name
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by active status (1 = Active, 0 = Inactive)
 *     responses:
 *       200:
 *         description: Cities retrieved successfully
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
 *                   example: "Cities retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/City'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /location/cities/{id}:
 *   get:
 *     summary: Get city by ID
 *     description: Retrieve a specific city by its ID
 *     tags: [Location]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: City ID
 *     responses:
 *       200:
 *         description: City retrieved successfully
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
 *                   example: "City retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/City'
 *       404:
 *         description: City not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /location/states/{state_id}/cities:
 *   get:
 *     summary: Get cities by state
 *     description: Retrieve all cities belonging to a specific state
 *     tags: [Location]
 *     parameters:
 *       - in: path
 *         name: state_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: State ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter cities by name
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by active status (1 = Active, 0 = Inactive)
 *     responses:
 *       200:
 *         description: Cities retrieved successfully
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
 *                   example: "Cities retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/City'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /location/countries/{country_id}/cities:
 *   get:
 *     summary: Get cities by country
 *     description: Retrieve all cities belonging to a specific country
 *     tags: [Location]
 *     parameters:
 *       - in: path
 *         name: country_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Country ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter cities by name
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: Filter by active status (1 = Active, 0 = Inactive)
 *     responses:
 *       200:
 *         description: Cities retrieved successfully
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
 *                   example: "Cities retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/City'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

// Country Routes
router.get('/countries', locationController.getCountries);
router.get('/countries/:id', locationController.getCountryById);

// State Routes
router.get('/states', locationController.getStates);
router.get('/states/:id', locationController.getStateById);
router.get('/countries/:country_id/states', locationController.getStatesByCountry);

// City Routes
router.get('/cities', locationController.getCities);
router.get('/cities/:id', locationController.getCityById);
router.get('/states/:state_id/cities', locationController.getCitiesByState);
router.get('/countries/:country_id/cities', locationController.getCitiesByCountry);

module.exports = router;