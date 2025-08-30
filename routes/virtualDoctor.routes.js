const express = require('express');
const router = express.Router();
const virtualDoctorController = require('../controllers/virtualDoctor.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: Admin - Virtual Doctors
 *     description: Admin endpoints for managing virtual doctors
 *   - name: Virtual Doctor
 *     description: Virtual doctor specific endpoints
 */

// Admin routes for managing virtual doctors
/**
 * @swagger
 * /admin/virtual-doctors:
 *   post:
 *     summary: Create a new virtual doctor (Admin only)
 *     tags: [Admin - Virtual Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - gender
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Virtual doctor's full name
 *                 example: "Dr. Virtual Smith"
 *               phone:
 *                 type: string
 *                 description: Virtual doctor's phone number
 *                 example: "+1234567890"
 *               password:
 *                 type: string
 *                 description: Virtual doctor's password
 *                 example: "virtual123"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 description: Virtual doctor's gender
 *                 example: "Male"
 *     responses:
 *       201:
 *         description: Virtual doctor created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Conflict - Phone number already exists
 *       500:
 *         description: Internal server error
 */
router.post('/admin/virtual-doctors', 
  authenticate(['admin']), 
  virtualDoctorController.createVirtualDoctor
);

/**
 * @swagger
 * /admin/virtual-doctors:
 *   get:
 *     summary: Get all virtual doctors with pagination (Admin only)
 *     tags: [Admin - Virtual Doctors]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or phone
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, phone, createdAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Virtual doctors retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/virtual-doctors', 
  authenticate(['admin']), 
  virtualDoctorController.getAllVirtualDoctors
);

/**
 * @swagger
 * /admin/virtual-doctors/{id}:
 *   delete:
 *     summary: Delete a virtual doctor (Admin only)
 *     tags: [Admin - Virtual Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Virtual doctor ID
 *     responses:
 *       200:
 *         description: Virtual doctor deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Virtual doctor not found
 *       500:
 *         description: Internal server error
 */
router.delete('/admin/virtual-doctors/:id', 
  authenticate(['admin']), 
  virtualDoctorController.deleteVirtualDoctor
);

// Virtual doctor routes for accessing APIs
/**
 * @swagger
 * /virtual-doctor/apis:
 *   get:
 *     summary: Get all virtual APIs with pagination (Virtual Doctor only)
 *     tags: [Virtual Doctor]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by API name or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, category, createdAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Virtual APIs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Virtual doctor access required
 *       500:
 *         description: Internal server error
 */
router.get('/apis', 
  authenticate(['virtual-doctor']), 
  virtualDoctorController.getVirtualApis
);

/**
 * @swagger
 * /virtual-doctor/appointments:
 *   get:
 *     summary: Get all virtual appointments with filters and pagination (Virtual Doctor only)
 *     tags: [Virtual Doctor]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by patient name or appointment notes
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, canceled, rejected, reschedule_requested]
 *         description: Filter by appointment status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appointments from this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appointments to this date (YYYY-MM-DD)
 *       - in: query
 *         name: timeFrom
 *         schema:
 *           type: string
 *           format: time
 *         description: Filter appointments from this time (HH:MM)
 *       - in: query
 *         name: timeTo
 *         schema:
 *           type: string
 *           format: time
 *         description: Filter appointments to this time (HH:MM)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [appointmentDateTime, patientName, status, createdAt, bookingDate]
 *           default: appointmentDateTime
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Virtual appointments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Virtual doctor access required
 *       500:
 *         description: Internal server error
 */
router.get('/appointments', 
  authenticate(['virtual-doctor']), 
  virtualDoctorController.getVirtualAppointments
);

module.exports = router;
