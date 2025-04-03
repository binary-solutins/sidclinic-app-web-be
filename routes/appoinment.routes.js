const express = require('express');
const router = express.Router();
const controller = require('../controllers/appoinment.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment management
 */

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Book a new appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - doctorId
 *               - appointmentDateTime
 *             properties:
 *               userId:
 *                 type: integer
 *               doctorId:
 *                 type: integer
 *               appointmentDateTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Appointment booked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid request
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticate(), controller.bookAppointment);

/**
 * @swagger
 * /appointments/doctors/{doctorId}/appointments:
 *   get:
 *     summary: Get doctor's appointments
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 */
router.get('/doctors/:doctorId/appointments', controller.getDoctorAppointments);

/**
 * @swagger
 * /appointments/doctors/{doctorId}/availability:
 *   get:
 *     summary: Get available time slots
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *                   available:
 *                     type: boolean
 */
router.get('/doctors/:doctorId/availability', controller.getAvailableSlots);

module.exports = router;