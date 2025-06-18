const express = require('express');
const router = express.Router();
const controller = require('../controllers/appoinment.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     AppointmentInput:
 *       type: object
 *       required:
 *         - userId
 *         - doctorId
 *         - appointmentDateTime
 *       properties:
 *         userId:
 *           type: integer
 *           description: ID of the patient
 *           example: 1
 *         doctorId:
 *           type: integer
 *           description: ID of the doctor
 *           example: 2
 *         appointmentDateTime:
 *           type: string
 *           format: date-time
 *           description: Appointment date and time (ISO 8601 format)
 *           example: "2024-12-25T10:30:00.000Z"
 *         type:
 *           type: string
 *           enum: [physical, virtual]
 *           default: physical
 *           description: Type of appointment
 *           example: "physical"
 *         notes:
 *           type: string
 *           description: Additional notes for the appointment
 *           example: "Patient has fever and headache"
 *     RescheduleRequest:
 *       type: object
 *       required:
 *         - newDateTime
 *       properties:
 *         newDateTime:
 *           type: string
 *           format: date-time
 *           description: New appointment date and time
 *           example: "2024-12-26T14:00:00.000Z"
 *         rescheduleReason:
 *           type: string
 *           description: Reason for rescheduling
 *           example: "Emergency came up"
 *     RejectRequest:
 *       type: object
 *       properties:
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection
 *           example: "Doctor not available at this time"
 *     CancelRequest:
 *       type: object
 *       properties:
 *         cancelReason:
 *           type: string
 *           description: Reason for cancellation
 *           example: "Patient recovered"
 *     CompleteRequest:
 *       type: object
 *       properties:
 *         consultationNotes:
 *           type: string
 *           description: Doctor's consultation notes
 *           example: "Patient diagnosed with viral fever. Prescribed rest and medication."
 *         prescription:
 *           type: string
 *           description: Prescribed medications
 *           example: "Paracetamol 500mg twice daily for 3 days"
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 1
 *         doctorId:
 *           type: integer
 *           example: 2
 *         appointmentDateTime:
 *           type: string
 *           format: date-time
 *           example: "2024-12-25T10:30:00.000Z"
 *         type:
 *           type: string
 *           enum: [physical, virtual]
 *           example: "physical"
 *         status:
 *           type: string
 *           enum: [pending, confirmed, rejected, canceled, completed, reschedule_requested]
 *           example: "pending"
 *         notes:
 *           type: string
 *           example: "Patient has fever and headache"
 *         videoCallLink:
 *           type: string
 *           nullable: true
 *           example: "/video-call/uuid-here"
 *         roomId:
 *           type: string
 *           nullable: true
 *           example: "uuid-here"
 *         consultationNotes:
 *           type: string
 *           nullable: true
 *           example: "Patient diagnosed with viral fever"
 *         prescription:
 *           type: string
 *           nullable: true
 *           example: "Paracetamol 500mg twice daily"
 *         bookingDate:
 *           type: string
 *           format: date-time
 *           example: "2024-12-20T08:00:00.000Z"
 *         confirmedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-21T09:00:00.000Z"
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-25T11:00:00.000Z"
 *         canceledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-24T16:00:00.000Z"
 *         cancelReason:
 *           type: string
 *           nullable: true
 *           example: "Patient recovered"
 *         canceledBy:
 *           type: string
 *           enum: [patient, doctor]
 *           nullable: true
 *           example: "patient"
 *         rejectionReason:
 *           type: string
 *           nullable: true
 *           example: "Doctor not available"
 *         rejectedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-21T10:00:00.000Z"
 *         originalDateTime:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-25T10:30:00.000Z"
 *         requestedDateTime:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-26T14:00:00.000Z"
 *         rescheduleReason:
 *           type: string
 *           nullable: true
 *           example: "Emergency came up"
 *         rescheduleRequestedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-22T12:00:00.000Z"
 *         rescheduleApprovedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-22T13:00:00.000Z"
 *         rescheduleRejectedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-22T13:30:00.000Z"
 *         rescheduleRejectionReason:
 *           type: string
 *           nullable: true
 *           example: "New time slot not available"
 *     ApiResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, error]
 *           example: "success"
 *         code:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           example: "Operation completed successfully"
 *         data:
 *           type: object
 *           description: Response data (varies by endpoint)
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         code:
 *           type: integer
 *           example: 200
 *         data:
 *           type: object
 *           properties:
 *             appointments:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *             pagination:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *     TimeSlot:
 *       type: object
 *       properties:
 *         start:
 *           type: string
 *           format: date-time
 *           example: "2024-12-25T10:00:00.000Z"
 *         end:
 *           type: string
 *           format: date-time
 *           example: "2024-12-25T10:30:00.000Z"
 *         time:
 *           type: string
 *           example: "10:00 AM"
 *         available:
 *           type: boolean
 *           example: true
 *         bookedCount:
 *           type: integer
 *           example: 0
 *         maxCapacity:
 *           type: integer
 *           example: 1
 *     AppointmentStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 100
 *         pending:
 *           type: integer
 *           example: 15
 *         confirmed:
 *           type: integer
 *           example: 25
 *         completed:
 *           type: integer
 *           example: 45
 *         canceled:
 *           type: integer
 *           example: 10
 *         today:
 *           type: integer
 *           example: 5
 *         thisWeek:
 *           type: integer
 *           example: 20
 *         thisMonth:
 *           type: integer
 *           example: 80
 *         rescheduleRequests:
 *           type: integer
 *           example: 5
 *   responses:
 *     Unauthorized:
 *       description: Authentication required
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "error"
 *               code:
 *                 type: integer
 *                 example: 401
 *               message:
 *                 type: string
 *                 example: "Authentication required"
 *     Forbidden:
 *       description: Access denied
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "error"
 *               code:
 *                 type: integer
 *                 example: 403
 *               message:
 *                 type: string
 *                 example: "Access denied"
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "error"
 *               code:
 *                 type: integer
 *                 example: 404
 *               message:
 *                 type: string
 *                 example: "Resource not found"
 *     ServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "error"
 *               code:
 *                 type: integer
 *                 example: 500
 *               message:
 *                 type: string
 *                 example: "Internal server error"
 */

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment management system for booking, managing, and tracking medical appointments
 */

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Book a new appointment
 *     description: Create a new appointment request. The appointment will be in pending status until confirmed by the doctor.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentInput'
 *           examples:
 *             physical_appointment:
 *               summary: Physical appointment
 *               value:
 *                 userId: 1
 *                 doctorId: 2
 *                 appointmentDateTime: "2024-12-25T10:30:00.000Z"
 *                 type: "physical"
 *                 notes: "Patient has fever and headache"
 *             virtual_appointment:
 *               summary: Virtual appointment
 *               value:
 *                 userId: 1
 *                 doctorId: 2
 *                 appointmentDateTime: "2024-12-25T14:00:00.000Z"
 *                 type: "virtual"
 *                 notes: "Follow-up consultation"
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 201
 *               message: "Appointment request submitted successfully. You will be notified once the doctor confirms."
 *               data:
 *                 id: 1
 *                 userId: 1
 *                 doctorId: 2
 *                 appointmentDateTime: "2024-12-25T10:30:00.000Z"
 *                 type: "physical"
 *                 status: "pending"
 *                 notes: "Patient has fever and headache"
 *                 bookingDate: "2024-12-20T08:00:00.000Z"
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               invalid_time:
 *                 summary: Invalid appointment time
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "Appointment must be scheduled at least 1 hour in advance"
 *               weekend_booking:
 *                 summary: Weekend booking attempt
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "Appointments are not available on weekends"
 *               slot_full:
 *                 summary: Time slot full
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "Time slot is full. Please choose another time."
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticate(), controller.bookAppointment);

/**
 * @swagger
 * /appointments/{id}/confirm:
 *   patch:
 *     summary: Confirm an appointment (Doctor only)
 *     description: Confirm a pending appointment. Only the assigned doctor can confirm the appointment.
 *     tags: [Appointments]
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
 *         description: Appointment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 200
 *               message: "Appointment confirmed successfully"
 *               data:
 *                 id: 1
 *                 status: "confirmed"
 *                 confirmedAt: "2024-12-21T09:00:00.000Z"
 *       400:
 *         description: Cannot confirm appointment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               status: "error"
 *               code: 400
 *               message: "Cannot confirm appointment. Current status: confirmed"
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/confirm', authenticate(), controller.confirmAppointment);

/**
 * @swagger
 * /appointments/{id}/reject:
 *   patch:
 *     summary: Reject an appointment (Doctor only)
 *     description: Reject a pending appointment with an optional reason. Only the assigned doctor can reject the appointment.
 *     tags: [Appointments]
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectRequest'
 *           example:
 *             rejectionReason: "Doctor not available at this time"
 *     responses:
 *       200:
 *         description: Appointment rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 200
 *               message: "Appointment rejected successfully"
 *               data:
 *                 id: 1
 *                 status: "rejected"
 *                 rejectionReason: "Doctor not available at this time"
 *                 rejectedAt: "2024-12-21T10:00:00.000Z"
 *       400:
 *         description: Cannot reject appointment
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/reject', authenticate(), controller.rejectAppointment);

/**
 * @swagger
 * /appointments/{id}/reschedule:
 *   patch:
 *     summary: Request to reschedule an appointment (Patient only)
 *     description: Request to reschedule an appointment to a new date/time. Only the patient can request reschedule and it must be at least 24 hours before the original appointment.
 *     tags: [Appointments]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RescheduleRequest'
 *           example:
 *             newDateTime: "2024-12-26T14:00:00.000Z"
 *             rescheduleReason: "Emergency came up"
 *     responses:
 *       200:
 *         description: Reschedule request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 200
 *               message: "Reschedule request submitted successfully. Waiting for doctor approval."
 *               data:
 *                 id: 1
 *                 status: "reschedule_requested"
 *                 originalDateTime: "2024-12-25T10:30:00.000Z"
 *                 requestedDateTime: "2024-12-26T14:00:00.000Z"
 *                 rescheduleReason: "Emergency came up"
 *                 rescheduleRequestedAt: "2024-12-22T12:00:00.000Z"
 *       400:
 *         description: Cannot reschedule appointment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               too_late:
 *                 summary: Too late to reschedule
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "Appointments can only be rescheduled at least 24 hours in advance"
 *               slot_unavailable:
 *                 summary: New slot unavailable
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "The requested time slot is not available"
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/reschedule', authenticate(), controller.requestReschedule);

/**
 * @swagger
 * /appointments/{id}/approve-reschedule:
 *   patch:
 *     summary: Approve reschedule request (Doctor only)
 *     description: Approve a patient's reschedule request. Only the assigned doctor can approve reschedule requests.
 *     tags: [Appointments]
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
 *         description: Reschedule request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 200
 *               message: "Reschedule request approved successfully"
 *               data:
 *                 id: 1
 *                 status: "confirmed"
 *                 appointmentDateTime: "2024-12-26T14:00:00.000Z"
 *                 rescheduleApprovedAt: "2024-12-22T13:00:00.000Z"
 *       400:
 *         description: No reschedule request found
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/approve-reschedule', authenticate(), controller.approveReschedule);

/**
 * @swagger
 * /appointments/{id}/reject-reschedule:
 *   patch:
 *     summary: Reject reschedule request (Doctor only)
 *     description: Reject a patient's reschedule request with an optional reason. The original appointment time will be maintained.
 *     tags: [Appointments]
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectRequest'
 *           example:
 *             rejectionReason: "New time slot not available"
 *     responses:
 *       200:
 *         description: Reschedule request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 200
 *               message: "Reschedule request rejected. Original appointment time maintained."
 *               data:
 *                 id: 1
 *                 status: "confirmed"
 *                 appointmentDateTime: "2024-12-25T10:30:00.000Z"
 *                 rescheduleRejectionReason: "New time slot not available"
 *                 rescheduleRejectedAt: "2024-12-22T13:30:00.000Z"
 *       400:
 *         description: No reschedule request found
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/reject-reschedule', authenticate(), controller.rejectReschedule);

/**
 * @swagger
 * /appointments/{id}/cancel:
 *   patch:
 *     summary: Cancel an appointment
 *     description: Cancel an appointment. Both patient and doctor can cancel appointments with an optional reason.
 *     tags: [Appointments]
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CancelRequest'
 *           example:
 *             cancelReason: "Patient recovered"
 *     responses:
 *       200:
 *         description: Appointment canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 200
 *               message: "Appointment canceled successfully"
 *               data:
 *                 id: 1
 *                 status: "canceled"
 *                 cancelReason: "Patient recovered"
 *                 canceledBy: "patient"
 *                 canceledAt: "2024-12-24T16:00:00.000Z"
 *       400:
 *         description: Cannot cancel appointment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               status: "error"
 *               code: 400
 *               message: "Cannot cancel appointment with status: completed"
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/cancel', authenticate(), controller.cancelAppointment);

/**
 * @swagger
 * /appointments/{id}/complete:
 *   patch:
 *     summary: Mark appointment as completed (Doctor only)
 *     description: Mark an appointment as completed with consultation notes and prescription. Only the assigned doctor can complete appointments.
 *     tags: [Appointments]
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteRequest'
 *           example:
 *             consultationNotes: "Patient diagnosed with viral fever. Prescribed rest and medication."
 *             prescription: "Paracetamol 500mg twice daily for 3 days"
 *     responses:
 *       200:
 *         description: Appointment completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 200
 *               message: "Appointment completed successfully"
 *               data:
 *                 id: 1
 *                 status: "completed"
 *                 consultationNotes: "Patient diagnosed with viral fever. Prescribed rest and medication."
 *                 prescription: "Paracetamol 500mg twice daily for 3 days"
 *                 completedAt: "2024-12-25T11:00:00.000Z"
 *       400:
 *         description: Cannot complete appointment
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id/complete', authenticate(), controller.completeAppointment);

/**
 * @swagger
 * /appointments/user/{userId}:
 *   get:
 *     summary: Get appointments for a specific user
 *     description: Retrieve all appointments for a specific user with optional filtering and pagination. Users can only access their own appointments unless they are admin.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: status
 *         description: Filter by appointment status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, rejected, canceled, completed, reschedule_requested]
 *           example: "confirmed"
 *       - in: query
 *         name: fromDate
 *         description: Filter appointments from this date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-01"
 *       - in: query
 *         name: toDate
 *         description: Filter appointments to this date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *       - in: query
 *         name: page
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 1
 *       - in: query
 *         name: limit
 *         description: Number of appointments per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *           example: 10
 *     responses:
 *       200:
 *         description: List of user appointments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *             example:
 *               status: "success"
 *               code: 200
 *               data:
 *                 appointments:
 *                   - id: 1
 *                     userId: 1
 *                     doctorId: 2
 *                     appointmentDateTime: "2024-12-25T10:30:00.000Z"
 *                     type: "physical"
 *                     status: "confirmed"
 *                     notes: "Patient has fever and headache"
 *                     doctor:
 *                       id: 2
 *                       User:
 *                         id: 3
 *                         name: "Dr. John Smith"
 *                         email: "dr.john@example.com"
 *                 pagination:
 *                   total: 25
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 3
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: User not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/user/:userId', authenticate(), controller.getUserAppointments);

/**
 * @swagger
 * /appointments/doctor/{doctorId}:
 *   get:
 *     summary: Get appointments for a specific doctor
 *     description: Retrieve all appointments for a specific doctor with optional filtering and pagination. Doctors can only access their own appointments unless they are admin.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         description: Doctor ID
 *         schema:
 *           type: integer
 *           example: 2
 *       - in: query
 *         name: status
 *         description: Filter by appointment status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, rejected, canceled, completed, reschedule_requested]
 *           example: "pending"
 *       - in: query
 *         name: fromDate
 *         description: Filter appointments from this date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-01"
 *       - in: query
 *         name: toDate
 *         description: Filter appointments to this date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *       - in: query
 *         name: page
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 1
 *       - in: query
 *         name: limit
 *         description: Number of appointments per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *           example: 10
 *     responses:
 *       200:
 *         description: List of doctor appointments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *             example:
 *               status: "success"
 *               code: 200
 *               data:
 *                 appointments:
 *                   - id: 1
 *                     userId: 1
 *                     doctorId: 2
 *                     appointmentDateTime: "2024-12-25T10:30:00.000Z"
 *                     type: "physical"
 *                     status: "pending"
 *                     notes: "Patient has fever and headache"
 *                     patient:
 *                       id: 1
 *                       name: "John Doe"
 *                       email: "john@example.com"
 *                       phone: "+1234567890"
 *                 pagination:
 *                   total: 15
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 2
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Doctor not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/doctor/:doctorId', authenticate(), controller.getDoctorAppointments);

/**
 * @swagger
 * /appointments/doctors/{doctorId}/available-slots:
 *   get:
 *     summary: Get available time slots for a specific doctor
 *     description: Retrieve available appointment slots for a doctor on a specific date. Shows 30-minute time slots between 9 AM and 6 PM, excluding weekends.
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         description: Doctor ID
 *         schema:
 *           type: integer
 *           example: 2
 *       - in: query
 *         name: date
 *         required: true
 *         description: Date to check availability (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-12-25"
 *       - in: query
 *         name: type
 *         description: Type of appointment (affects capacity - physical=1, virtual=3)
 *         schema:
 *           type: string
 *           enum: [physical, virtual]
 *           default: physical
 *           example: "physical"
 *     responses:
 *       200:
 *         description: Available time slots
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date
 *                           example: "2024-12-25"
 *                         doctorId:
 *                           type: integer
 *                           example: 2
 *                         type:
 *                           type: string
 *                           example: "physical"
 *                         slots:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TimeSlot'
 *             example:
 *               status: "success"
 *               code: 200
 *               data:
 *                 date: "2024-12-25"
 *                 doctorId: 2
 *                 type: "physical"
 *                 slots:
 *                   - start: "2024-12-25T09:00:00.000Z"
 *                     end: "2024-12-25T09:30:00.000Z"
 *                     time: "09:00 AM"
 *                     available: true
 *                     bookedCount: 0
 *                     maxCapacity: 1
 *                   - start: "2024-12-25T09:30:00.000Z"
 *                     end: "2024-12-25T10:00:00.000Z"
 *                     time: "09:30 AM"
 *                     available: false
 *                     bookedCount: 1
 *                     maxCapacity: 1
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               missing_date:
 *                 summary: Missing date parameter
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "Date parameter is required"
 *               past_date:
 *                 summary: Past date provided
 *                 value:
 *                   status: "error"
 *                   code: 400
 *                   message: "Cannot book appointments for past dates"
 *               weekend:
 *                 summary: Weekend date
 *                 value:
 *                   status: "success"
 *                   code: 200
 *                   data:
 *                     date: "2024-12-22"
 *                     slots: []
 *                     message: "No appointments available on weekends"
 *       404:
 *         description: Doctor not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/doctors/:doctorId/available-slots', controller.getAvailableSlots);

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: Get appointment details by ID
 *     description: Retrieve detailed information about a specific appointment. Users can only access appointments they are involved in (as patient or doctor) unless they are admin.
 *     tags: [Appointments]
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
 *         description: Appointment details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Appointment'
 *             example:
 *               status: "success"
 *               code: 200
 *               data:
 *                 id: 1
 *                 userId: 1
 *                 doctorId: 2
 *                 appointmentDateTime: "2024-12-25T10:30:00.000Z"
 *                 type: "physical"
 *                 status: "confirmed"
 *                 notes: "Patient has fever and headache"
 *                 bookingDate: "2024-12-20T08:00:00.000Z"
 *                 confirmedAt: "2024-12-21T09:00:00.000Z"
 *                 doctor:
 *                   id: 2
 *                   User:
 *                     id: 3
 *                     name: "Dr. John Smith"
 *                     email: "dr.john@example.com"
 *                 patient:
 *                   id: 1
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   phone: "+1234567890"
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', authenticate(), controller.getAppointmentById);

/**
 * @swagger
 * /appointments/stats/dashboard:
 *   get:
 *     summary: Get appointment statistics for dashboard
 *     description: Retrieve comprehensive appointment statistics including counts by status, time periods, and reschedule requests. Can be filtered by user type (patient/doctor).
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userType
 *         description: Type of user to get stats for
 *         schema:
 *           type: string
 *           enum: [patient, doctor]
 *           example: "patient"
 *       - in: query
 *         name: userId
 *         description: Specific user ID (optional, defaults to authenticated user)
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Appointment statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AppointmentStats'
 *             example:
 *               status: "success"
 *               code: 200
 *               data:
 *                 total: 100
 *                 pending: 15
 *                 confirmed: 25
 *                 completed: 45
 *                 canceled: 10
 *                 today: 5
 *                 thisWeek: 20
 *                 thisMonth: 80
 *                 rescheduleRequests: 5
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/stats/dashboard', authenticate(), controller.getAppointmentStats);

module.exports = router;