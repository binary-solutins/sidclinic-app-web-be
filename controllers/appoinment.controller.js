const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Appointment, User, Doctor, Notification } = require('../models');
const { sendUserNotification } = require('../services/firebase.services');

module.exports = {
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
   *             $ref: '#/components/schemas/AppointmentInput'
   *     responses:
   *       201:
   *         description: Appointment booked successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Appointment'
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  bookAppointment: async (req, res) => {
    try {
      const { userId, doctorId, appointmentDateTime, type = 'physical', notes } = req.body;

      // Validate user
      const user = await User.findByPk(userId);
      if (!user || user.role !== 'user') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid user account',
        });
      }

      // Validate doctor
      const doctor = await Doctor.findByPk(doctorId, {
        include: [{ model: User, as: 'User' }],
      });

      if (!doctor || !doctor.isApproved || doctor.User.role !== 'doctor') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Doctor not available',
        });
      }

      // Check doctor availability
      const requestedTime = new Date(appointmentDateTime);
      const slotStart = new Date(requestedTime);
      slotStart.setMinutes(Math.floor(slotStart.getMinutes() / 30) * 30);
      slotStart.setSeconds(0, 0);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

      // Check existing appointments
      const existingCount = await Appointment.count({
        where: {
          doctorId,
          appointmentDateTime: { [Op.between]: [slotStart, slotEnd] },
          status: { [Op.notIn]: ['canceled', 'completed', 'rejected'] }
        }
      });

      const maxAppointments = type === 'physical' ? 1 : 3;
      if (existingCount >= maxAppointments) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Time slot is full',
        });
      }

      // Create appointment
      const appointmentData = {
        userId,
        doctorId,
        appointmentDateTime: requestedTime,
        type,
        status: 'pending',
        notes
      };

      if (type === 'virtual') {
        const roomId = uuidv4();
        appointmentData.videoCallLink = `/video-call/${roomId}`;
        appointmentData.roomId = roomId;
      }

      const appointment = await Appointment.create(appointmentData);

      // Send notification to doctor
      await sendUserNotification(
        doctor.User.id,
        'New Appointment Request',
        `You have a new appointment request from ${user.name}`,
        {
          type: 'appointment',
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'new_appointment'
          }
        }
      );

      // Send confirmation to patient
      await sendUserNotification(
        userId,
        'Appointment Requested',
        `Your appointment with Dr. ${doctor.User.name} has been requested`,
        {
          type: 'appointment',
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'appointment_requested'
          }
        }
      );

      res.status(201).json({
        status: 'success',
        code: 201,
        message: 'Appointment booked successfully',
        data: appointment,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  /**
   * @swagger
   * /appointments/{id}/confirm:
   *   patch:
   *     summary: Confirm an appointment
   *     tags: [Appointments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Appointment confirmed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Appointment'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Appointment not found
   *       500:
   *         description: Server error
   */
  confirmAppointment: async (req, res) => {
    try {
      const appointment = await Appointment.findByPk(req.params.id, {
        include: [
          { model: Doctor, as: 'doctor', include: [{ model: User, as: 'User' }] },
          { model: User, as: 'patient' }
        ]
      });

      if (!appointment) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Appointment not found',
        });
      }

      // Check if the requesting user is the doctor
      if (req.user.id !== appointment.doctor.User.id) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'You are not authorized to confirm this appointment',
        });
      }

      // Update status
      appointment.status = 'confirmed';
      await appointment.save();

      // Send notification to patient
      await sendUserNotification(
        appointment.userId,
        'Appointment Confirmed',
        `Your appointment with Dr. ${appointment.doctor.User.name} has been confirmed`,
        {
          type: 'appointment',
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'appointment_confirmed'
          }
        }
      );

      res.json({
        status: 'success',
        code: 200,
        message: 'Appointment confirmed successfully',
        data: appointment,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  /**
   * @swagger
   * /appointments/{id}/cancel:
   *   patch:
   *     summary: Cancel an appointment
   *     tags: [Appointments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               cancelReason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Appointment canceled
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Appointment'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Appointment not found
   *       500:
   *         description: Server error
   */
  cancelAppointment: async (req, res) => {
    try {
      const { cancelReason } = req.body;
      const appointment = await Appointment.findByPk(req.params.id, {
        include: [
          { model: Doctor, as: 'doctor', include: [{ model: User, as: 'User' }] },
          { model: User, as: 'patient' }
        ]
      });

      if (!appointment) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Appointment not found',
        });
      }

      // Check if the requesting user is either the patient or the doctor
      if (req.user.id !== appointment.userId && req.user.id !== appointment.doctor.User.id) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'You are not authorized to cancel this appointment',
        });
      }

      // Update status
      appointment.status = 'canceled';
      appointment.notes = cancelReason ? `Canceled: ${cancelReason}` : 'Appointment canceled';
      await appointment.save();

      // Determine who canceled and notify the other party
      const isPatient = req.user.id === appointment.userId;
      const cancelerName = isPatient ? appointment.patient.name : `Dr. ${appointment.doctor.User.name}`;
      const recipientId = isPatient ? appointment.doctor.User.id : appointment.userId;
      const recipientName = isPatient ? `Dr. ${appointment.doctor.User.name}` : appointment.patient.name;

      await sendUserNotification(
        recipientId,
        'Appointment Canceled',
        `${cancelerName} has canceled the appointment with ${recipientName}`,
        {
          type: 'appointment',
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'appointment_canceled',
            cancelReason
          }
        }
      );

      res.json({
        status: 'success',
        code: 200,
        message: 'Appointment canceled successfully',
        data: appointment,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  /**
 * @swagger
 * /appointments/user/{userId}:
 *   get:
 *     summary: Get appointments for a specific user
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, canceled, completed]
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
  getUserAppointments: async (req, res) => {
    try {
      const userId = req.params.userId;
      const { status, fromDate, toDate } = req.query;
  
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'User not found',
        });
      }
  
      if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'Unauthorized access',
        });
      }
  
      const where = { userId };
      if (status) where.status = status;
      
      if (fromDate || toDate) {
        where.appointmentDateTime = {};
        if (fromDate) where.appointmentDateTime[Op.gte] = new Date(fromDate);
        if (toDate) where.appointmentDateTime[Op.lte] = new Date(`${toDate}T23:59:59.999Z`);
      }
  
      // Fixed include statement
      const appointments = await Appointment.findAll({
        where,
        include: [
          {
            model: Doctor,
            as: 'doctor',
            include: [{ 
              model: User, 
              as: 'User',
              attributes: ['id', 'name'] // Removed problematic fields
            }]
          }
        ],
        order: [['appointmentDateTime', 'DESC']]
      });
  
      res.json({
        status: 'success',
        code: 200,
        data: appointments,
      });
    } catch (error) {
      console.error('Appointment Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

/**
 * @swagger
 * /appointments/doctor/{doctorId}:
 *   get:
 *     summary: Get appointments for a specific doctor
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, canceled, completed]
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Server error
 */
getDoctorAppointments: async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const { status, fromDate, toDate } = req.query;

    const doctor = await Doctor.findByPk(doctorId, {
      include: [{ model: User, as: 'User' }]
    });
    
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Doctor not found',
      });
    }

    if (req.user.id !== doctor.User.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Unauthorized access',
      });
    }

    const where = { doctorId };
    if (status) where.status = status;
    
    if (fromDate || toDate) {
      where.appointmentDateTime = {};
      if (fromDate) where.appointmentDateTime[Op.gte] = new Date(fromDate);
      if (toDate) where.appointmentDateTime[Op.lte] = new Date(`${toDate}T23:59:59.999Z`);
    }

    // Fixed include statement
    const appointments = await Appointment.findAll({
      where,
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name'] // Removed problematic fields
        }
      ],
      order: [['appointmentDateTime', 'DESC']]
    });

    res.json({
      status: 'success',
      code: 200,
      data: appointments,
    });
  } catch (error) {
    console.error('Appointment Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
    });
  }
},

/**More actions
   * @swagger
   * /appointments/doctors/{doctorId}/available-slots:
   *   get:
   *     summary: Get available slots for a specific doctor
   *     tags: [Appointments]
   *     parameters:
   *       - in: path
   *         name: doctorId
   *         required: true
   *         description: ID of the doctor
   *         schema:
   *           type: integer
   *       - in: query
   *         name: date
   *         required: true
   *         description: Date to check available slots
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: List of available slots
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
   *       404:
   *         description: Doctor not found
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
getAvailableSlots: async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found', code: 'DOCTOR_NOT_FOUND' });

    const date = new Date(req.query.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const appointments = await Appointment.findAll({
      where: {
        doctorId: doctor.id,
        appointmentDateTime: { [Op.between]: [startOfDay, endOfDay] }
      }
    });

    // Generate available slots logic
    const slotDuration = doctor.slotDuration || 30;
    const maxPatients = doctor.maxPatientsPerSlot || 1;
    const slots = [];

    // Implementation for generating time slots
    let currentTime = new Date(startOfDay);
    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
      
      const existing = appointments.filter(a => 
        a.appointmentDateTime >= currentTime && 
        a.appointmentDateTime < slotEnd
      ).length;

      slots.push({
        start: new Date(currentTime),
        end: new Date(slotEnd),
        available: existing < maxPatients
      });

      currentTime = slotEnd;
    }

    res.json(slots);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      code: 'SERVER_ERROR'
    });
  }
}

 
};