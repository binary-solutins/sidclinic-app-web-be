const express = require('express');
const router = express.Router();
const virtualDoctorController = require('../controllers/virtualDoctor.controller');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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
 *     description: Creates a new virtual doctor with both User and Doctor records. The virtual doctor will be auto-approved and have isVirtual flag set to 1.
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
 *                 format: password
 *                 description: Virtual doctor's password
 *                 example: "virtual123"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 description: Virtual doctor's gender
 *                 example: "Male"
 *               specialty:
 *                 type: string
 *                 description: Virtual doctor's medical specialty
 *                 default: "General Medicine"
 *                 example: "General Medicine"
 *               degree:
 *                 type: string
 *                 description: Virtual doctor's medical degree
 *                 default: "MBBS"
 *                 example: "MBBS"
 *               yearsOfExperience:
 *                 type: integer
 *                 description: Years of medical experience
 *                 default: 0
 *                 example: 5
 *               clinicName:
 *                 type: string
 *                 description: Virtual clinic name
 *                 default: "Virtual Clinic"
 *                 example: "Virtual Health Clinic"
 *               clinicContactNumber:
 *                 type: string
 *                 description: Clinic contact number (defaults to phone if not provided)
 *                 example: "+1234567890"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Virtual doctor's email (defaults to phone@virtual.com if not provided)
 *                 example: "dr.virtual@clinic.com"
 *               address:
 *                 type: string
 *                 description: Virtual clinic address
 *                 default: "Virtual Address"
 *                 example: "123 Virtual Street, Digital City"
 *               country:
 *                 type: string
 *                 description: Country
 *                 default: "India"
 *                 example: "India"
 *               state:
 *                 type: string
 *                 description: State
 *                 default: "Virtual State"
 *                 example: "Maharashtra"
 *               city:
 *                 type: string
 *                 description: City
 *                 default: "Virtual City"
 *                 example: "Mumbai"
 *               locationPin:
 *                 type: string
 *                 description: Location PIN code
 *                 default: "000000"
 *                 example: "400001"
 *               startTime:
 *                 type: string
 *                 format: time
 *                 description: Virtual clinic start time (HH:MM:SS format)
 *                 default: "09:00:00"
 *                 example: "09:00:00"
 *               endTime:
 *                 type: string
 *                 format: time
 *                 description: Virtual clinic end time (HH:MM:SS format)
 *                 default: "18:00:00"
 *                 example: "18:00:00"
 *               registrationNumber:
 *                 type: string
 *                 description: Medical registration number (auto-generated if not provided)
 *                 default: "VIRTUAL-{timestamp}"
 *                 example: "VIRTUAL-1705123456789"
 *     responses:
 *       201:
 *         description: Virtual doctor created successfully
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
 *                   example: "Virtual doctor created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                       description: Doctor record ID
 *                     userId:
 *                       type: integer
 *                       example: 1
 *                       description: User record ID
 *                     name:
 *                       type: string
 *                       example: "Dr. Virtual Smith"
 *                     phone:
 *                       type: string
 *                       example: "+1234567890"
 *                     role:
 *                       type: string
 *                       example: "virtual-doctor"
 *                     gender:
 *                       type: string
 *                       example: "Male"
 *                     specialty:
 *                       type: string
 *                       example: "General Medicine"
 *                     degree:
 *                       type: string
 *                       example: "MBBS"
 *                     registrationNumber:
 *                       type: string
 *                       example: "VIRTUAL-1705123456789"
 *                       description: Medical registration number
 *                     clinicName:
 *                       type: string
 *                       example: "Virtual Health Clinic"
 *                     isApproved:
 *                       type: boolean
 *                       example: true
 *                       description: Auto-approved for virtual doctors
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Bad request - validation error
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
 *                   example: "Name, phone, password, and gender are required"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Conflict - Phone number already exists
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
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: "Phone number already registered"
 *       500:
 *         description: Internal server error
 */
router.post('/admin/virtual-doctors', 
  authenticate(['admin']), 
  upload.fields([
    { name: 'doctorPhoto', maxCount: 1 },
    { name: 'clinicPhotos', maxCount: 10 }
  ]),
  virtualDoctorController.createVirtualDoctor
);

/**
 * @swagger
 * /admin/virtual-doctors:
 *   get:
 *     summary: Get all virtual doctors with pagination (Admin only)
 *     description: Retrieve all virtual doctors with complete information including both User and Doctor data. Results are sorted in descending order (most recent first) by default.
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
 *         description: Search by name, phone, specialty, clinic name, or degree
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, phone, specialty, clinicName, degree, createdAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order (DESC ensures recent first)
 *     responses:
 *       200:
 *         description: Virtual doctors retrieved successfully
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
 *                   example: "Virtual doctors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                         description: Doctor record ID
 *                       userId:
 *                         type: integer
 *                         example: 1
 *                         description: User record ID
 *                       name:
 *                         type: string
 *                         example: "Dr. Virtual Smith"
 *                       phone:
 *                         type: string
 *                         example: "+1234567890"
 *                       gender:
 *                         type: string
 *                         example: "Male"
 *                       role:
 *                         type: string
 *                         example: "virtual-doctor"
 *                       specialty:
 *                         type: string
 *                         example: "General Medicine"
 *                       degree:
 *                         type: string
 *                         example: "MBBS"
 *                       registrationNumber:
 *                         type: string
 *                         example: "VIRTUAL-1705123456789"
 *                         description: Medical registration number
 *                       clinicName:
 *                         type: string
 *                         example: "Virtual Health Clinic"
 *                       yearsOfExperience:
 *                         type: integer
 *                         example: 5
 *                       isApproved:
 *                         type: boolean
 *                         example: true
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                       notificationEnabled:
 *                         type: boolean
 *                         example: true
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
router.get('/virtual-doctor/apis', 
  authenticate(['virtual-doctor']), 
  virtualDoctorController.getVirtualApis
);

/**
 * @swagger
 * /virtual-doctor/appointments:
 *   get:
 *     summary: Get virtual appointments for the authenticated virtual doctor
 *     description: Retrieve virtual appointments assigned to the authenticated virtual doctor with optional filtering and pagination. Results are sorted in descending order (most recent first) by default.
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, canceled, rejected, reschedule_requested]
 *         description: Filter by appointment status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appointments from this date (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appointments to this date (YYYY-MM-DD)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [appointmentDateTime, createdAt, bookingDate]
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
 *         description: Virtual appointments for the authenticated virtual doctor retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Virtual doctor access required
 *       500:
 *         description: Internal server error
 */
router.get('/virtual-doctor/appointments', 
  authenticate(['virtual-doctor']), 
  virtualDoctorController.getVirtualAppointments
);



/**
 * @swagger
 * /virtual-doctor/appointments/{id}/video-credentials:
 *   get:
 *     summary: Get video call credentials for virtual doctor
 *     description: Get Azure Communication Services credentials for a virtual doctor to join a video call
 *     tags: [Virtual Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Appointment ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Video call credentials retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     roomId:
 *                       type: string
 *                       example: "uuid-here"
 *                     userId:
 *                       type: string
 *                       example: "azure-user-id"
 *                     token:
 *                       type: string
 *                       example: "azure-token"
 *                     userRole:
 *                       type: string
 *                       example: "virtual-doctor"
 *                     appointmentId:
 *                       type: integer
 *                       example: 1
 *                     participantName:
 *                       type: string
 *                       example: "Dr. Virtual Smith"
 *       400:
 *         description: Invalid appointment type or status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Virtual doctor not authorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Internal server error
 */
router.get('/virtual-doctor/appointments/:id/video-credentials', 
  authenticate(['virtual-doctor']), 
  virtualDoctorController.getVideoCallCredentials
);

/**
 * @swagger
 * /virtual-appointment/slots:
 *   get:
 *     summary: Get available time slots for virtual appointments
 *     description: Retrieve available virtual appointment slots for a specific date based on admin settings
 *     tags: [Virtual Doctor]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-15"
 *         description: Date for which to get available slots (YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Available time slots retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       example: "2024-01-15"
 *                     type:
 *                       type: string
 *                       example: "virtual"
 *                     workingHours:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           example: "09:00:00"
 *                         end:
 *                           type: string
 *                           example: "18:00:00"
 *                     slots:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TimeSlot'
 *       400:
 *         description: Bad request - missing date or invalid configuration
 *       500:
 *         description: Internal server error
 */
router.get('/virtual-appointment/slots', 
  virtualDoctorController.getVirtualAppointmentSlots
);

/**
 * @swagger
 * /virtual-appointment/book:
 *   post:
 *     summary: Book a virtual appointment
 *     description: Book a virtual appointment for a patient using admin-configured time slots
 *     tags: [Virtual Doctor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - appointmentDateTime
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: Patient user ID
 *                 example: 1
 *               appointmentDateTime:
 *                 type: string
 *                 format: date-time
 *                 description: Appointment date and time (IST timezone)
 *                 example: "2024-01-15T10:00:00.000Z"
 *               notes:
 *                 type: string
 *                 description: Optional notes for the appointment
 *                 example: "Patient has concerns about dental pain"
 *     responses:
 *       201:
 *         description: Virtual appointment booked successfully
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
 *                   example: "Virtual appointment booked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     appointmentDateTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:00:00.000Z"
 *                     type:
 *                       type: string
 *                       example: "virtual"
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     videoCallLink:
 *                       type: string
 *                       example: "/video-call/uuid-here"
 *                     roomId:
 *                       type: string
 *                       example: "uuid-here"
 *       400:
 *         description: Bad request - validation error
 *       500:
 *         description: Internal server error
 */
router.post('/virtual-appointment/book', 
  virtualDoctorController.bookVirtualAppointment
);

// ==================== ADMIN VIRTUAL DOCTOR MANAGEMENT ROUTES ====================

/**
 * @swagger
 * /admin/virtual-doctors:
 *   post:
 *     summary: Create a new virtual doctor (Admin only)
 *     description: Creates a new virtual doctor with comprehensive form data including image uploads. Only name, phone, gender, and password are required. All other fields are optional and will use default values if not provided. Supports both doctor photo and multiple clinic photos.
 *     tags: [Admin - Virtual Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *                 format: password
 *                 description: Virtual doctor's password
 *                 example: "virtual123"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 description: Virtual doctor's gender
 *                 example: "Male"
 *               doctorPhoto:
 *                 type: string
 *                 format: binary
 *                 description: Doctor's profile photo
 *               clinicPhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple clinic photos
 *               degree:
 *                 type: string
 *                 description: Virtual doctor's medical degree (default: "MBBS")
 *                 example: "MBBS"
 *               registrationNumber:
 *                 type: string
 *                 description: Medical registration number (auto-generated if not provided)
 *                 example: "VIRTUAL-12345"
 *               clinicName:
 *                 type: string
 *                 description: Virtual clinic name (default: "Virtual Clinic")
 *                 example: "Virtual Health Clinic"
 *               yearsOfExperience:
 *                 type: integer
 *                 description: Years of medical experience (default: 0)
 *                 example: 5
 *               specialty:
 *                 type: string
 *                 description: Medical specialty (default: "General Medicine")
 *                 example: "General Medicine"
 *               subSpecialties:
 *                 type: string
 *                 description: JSON string of sub-specialties (optional)
 *                 example: '["Cardiology", "Internal Medicine"]'
 *               clinicContactNumber:
 *                 type: string
 *                 description: Clinic contact number (defaults to phone if not provided)
 *                 example: "+1234567890"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Virtual doctor's email (defaults to phone@virtual.com if not provided)
 *                 example: "dr.virtual@clinic.com"
 *               address:
 *                 type: string
 *                 description: Virtual clinic address (default: "Virtual Address")
 *                 example: "123 Virtual Street, Digital City"
 *               country:
 *                 type: string
 *                 description: Country (default: "India")
 *                 example: "India"
 *               state:
 *                 type: string
 *                 description: State (default: "Virtual State")
 *                 example: "Maharashtra"
 *               city:
 *                 type: string
 *                 description: City (default: "Virtual City")
 *                 example: "Mumbai"
 *               locationPin:
 *                 type: string
 *                 description: Location PIN code (default: "000000")
 *                 example: "400001"
 *               startTime:
 *                 type: string
 *                 format: time
 *                 description: Virtual clinic start time (default: "09:00:00")
 *                 example: "09:00:00"
 *               endTime:
 *                 type: string
 *                 format: time
 *                 description: Virtual clinic end time (default: "18:00:00")
 *                 example: "18:00:00"
 *               consultationFee:
 *                 type: number
 *                 description: Virtual consultation fee (default: 0)
 *                 example: 500.00
 *               languages:
 *                 type: string
 *                 description: JSON string of languages (optional)
 *                 example: '["English", "Hindi", "Marathi"]'
 *               timezone:
 *                 type: string
 *                 description: Virtual doctor timezone (default: "Asia/Kolkata")
 *                 example: "Asia/Kolkata"
 *               maxPatientsPerDay:
 *                 type: integer
 *                 description: Maximum patients per day (default: 20)
 *                 example: 20
 *               averageConsultationTime:
 *                 type: integer
 *                 description: Average consultation time in minutes (default: 30)
 *                 example: 30
 *               bio:
 *                 type: string
 *                 description: Virtual doctor biography (optional)
 *                 example: "Experienced virtual doctor with expertise in..."
 *               qualifications:
 *                 type: string
 *                 description: JSON string of qualifications (optional)
 *                 example: '["MBBS", "MD", "Diploma in Cardiology"]'
 *               virtualConsultationTypes:
 *                 type: string
 *                 description: JSON string of consultation types (optional)
 *                 example: '["video", "audio", "chat"]'
 *               isAvailableForEmergency:
 *                 type: boolean
 *                 description: Available for emergency consultations (default: false)
 *                 example: true
 *               emergencyFee:
 *                 type: number
 *                 description: Emergency consultation fee (default: 0)
 *                 example: 1000.00
 *               isApproved:
 *                 type: boolean
 *                 description: Approval status (default: true for admin-created)
 *                 example: true
 *               is_active:
 *                 type: boolean
 *                 description: Active status (default: true)
 *                 example: true
 *     responses:
 *       201:
 *         description: Virtual doctor created successfully
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
 *                   example: "Virtual doctor created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/VirtualDoctor'
 *       400:
 *         description: Bad request - validation error (Name, phone, and gender are required)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Conflict - Phone number or registration number already exists
 *       500:
 *         description: Internal server error
 */
router.post('/admin/virtual-doctors', 
  authenticate(['admin']), 
  upload.fields([
    { name: 'doctorPhoto', maxCount: 1 },
    { name: 'clinicPhotos', maxCount: 10 }
  ]),
  virtualDoctorController.adminCreateOrUpdateVirtualDoctor
);

/**
 * @swagger
 * /admin/virtual-doctors/{id}:
 *   put:
 *     summary: Update a virtual doctor (Admin only)
 *     description: Updates an existing virtual doctor with comprehensive form data including image uploads
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
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Virtual doctor's full name
 *               phone:
 *                 type: string
 *                 description: Virtual doctor's phone number
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Virtual doctor's password (optional for updates)
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 description: Virtual doctor's gender
 *               doctorPhoto:
 *                 type: string
 *                 format: binary
 *                 description: Doctor's profile photo
 *               clinicPhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple clinic photos
 *               degree:
 *                 type: string
 *                 description: Virtual doctor's medical degree
 *               registrationNumber:
 *                 type: string
 *                 description: Medical registration number
 *               clinicName:
 *                 type: string
 *                 description: Virtual clinic name
 *               yearsOfExperience:
 *                 type: integer
 *                 description: Years of medical experience
 *               specialty:
 *                 type: string
 *                 description: Medical specialty
 *               subSpecialties:
 *                 type: string
 *                 description: JSON string of sub-specialties
 *               clinicContactNumber:
 *                 type: string
 *                 description: Clinic contact number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Virtual doctor's email
 *               address:
 *                 type: string
 *                 description: Virtual clinic address
 *               country:
 *                 type: string
 *                 description: Country
 *               state:
 *                 type: string
 *                 description: State
 *               city:
 *                 type: string
 *                 description: City
 *               locationPin:
 *                 type: string
 *                 description: Location PIN code (6 digits)
 *               startTime:
 *                 type: string
 *                 format: time
 *                 description: Virtual clinic start time
 *               endTime:
 *                 type: string
 *                 format: time
 *                 description: Virtual clinic end time
 *               consultationFee:
 *                 type: number
 *                 description: Virtual consultation fee
 *               languages:
 *                 type: string
 *                 description: JSON string of languages
 *               timezone:
 *                 type: string
 *                 description: Virtual doctor timezone
 *               maxPatientsPerDay:
 *                 type: integer
 *                 description: Maximum patients per day
 *               averageConsultationTime:
 *                 type: integer
 *                 description: Average consultation time in minutes
 *               bio:
 *                 type: string
 *                 description: Virtual doctor biography
 *               qualifications:
 *                 type: string
 *                 description: JSON string of qualifications
 *               virtualConsultationTypes:
 *                 type: string
 *                 description: JSON string of consultation types
 *               isAvailableForEmergency:
 *                 type: boolean
 *                 description: Available for emergency consultations
 *               emergencyFee:
 *                 type: number
 *                 description: Emergency consultation fee
 *               isApproved:
 *                 type: boolean
 *                 description: Approval status
 *               is_active:
 *                 type: boolean
 *                 description: Active status
 *     responses:
 *       200:
 *         description: Virtual doctor updated successfully
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
 *                   example: "Virtual doctor updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/VirtualDoctor'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Virtual doctor not found
 *       409:
 *         description: Conflict - Phone number or registration number already exists
 *       500:
 *         description: Internal server error
 */
router.put('/admin/virtual-doctors/:id', 
  authenticate(['admin']), 
  upload.fields([
    { name: 'doctorPhoto', maxCount: 1 },
    { name: 'clinicPhotos', maxCount: 10 }
  ]),
  virtualDoctorController.adminCreateOrUpdateVirtualDoctor
);

/**
 * @swagger
 * /admin/virtual-doctors/{id}:
 *   get:
 *     summary: Get virtual doctor by ID (Admin only)
 *     description: Retrieve detailed information about a specific virtual doctor including all fields and images
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
 *         description: Virtual doctor details retrieved successfully
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
 *                   example: "Virtual doctor details retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/VirtualDoctor'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Virtual doctor not found
 *       500:
 *         description: Internal server error
 */
router.get('/admin/virtual-doctors/:id', 
  authenticate(['admin']), 
  virtualDoctorController.adminGetVirtualDoctorById
);

/**
 * @swagger
 * /admin/virtual-doctors/{id}/toggle-approval:
 *   patch:
 *     summary: Toggle virtual doctor approval status (Admin only)
 *     description: Approve or disapprove a virtual doctor with optional reason
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalReason:
 *                 type: string
 *                 description: Reason for approval/disapproval
 *                 example: "All documents verified and credentials validated"
 *     responses:
 *       200:
 *         description: Virtual doctor approval status toggled successfully
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
 *                   example: "Virtual doctor approved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     isApproved:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Virtual doctor not found
 *       500:
 *         description: Internal server error
 */
router.patch('/admin/virtual-doctors/:id/toggle-approval', 
  authenticate(['admin']), 
  virtualDoctorController.adminToggleVirtualDoctorApproval
);

/**
 * @swagger
 * /admin/virtual-doctors/{id}/toggle-status:
 *   patch:
 *     summary: Toggle virtual doctor active status (Admin only)
 *     description: Activate or deactivate a virtual doctor with optional reason
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               suspensionReason:
 *                 type: string
 *                 description: Reason for suspension/activation
 *                 example: "Temporary suspension due to policy violation"
 *               reviewDate:
 *                 type: string
 *                 format: date
 *                 description: Review date for suspension
 *                 example: "2024-02-01"
 *     responses:
 *       200:
 *         description: Virtual doctor status toggled successfully
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
 *                   example: "Virtual doctor activated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Virtual doctor not found
 *       500:
 *         description: Internal server error
 */
router.patch('/admin/virtual-doctors/:id/toggle-status', 
  authenticate(['admin']), 
  virtualDoctorController.adminToggleVirtualDoctorStatus
);

/**
 * @swagger
 * /admin/virtual-doctors/{id}:
 *   delete:
 *     summary: Delete a virtual doctor (Admin only)
 *     description: Permanently delete a virtual doctor and associated user account
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
 *                   example: "Virtual doctor deleted successfully"
 *                 data:
 *                   type: null
 *                   example: null
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
  virtualDoctorController.adminDeleteVirtualDoctor
);

module.exports = router;
