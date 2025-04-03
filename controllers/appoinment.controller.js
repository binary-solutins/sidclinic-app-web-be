/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment management
 */

const { Appointment, User, Doctor } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

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
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                 code:
   *                   type: integer
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Appointment'
   *       400:
   *         description: Invalid request
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  bookAppointment: async (req, res) => {
    try {
      const { userId, doctorId, appointmentDateTime } = req.body;

      const user = await User.findByPk(userId);
      if (!user || user.role !== 'user') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid user account'
        });
      }

      const doctor = await Doctor.findByPk(doctorId, {
        include: [{ model: User, as: 'User' }]
      });
      
      if (!doctor || !doctor.isApproved || doctor.User.role !== 'doctor') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Doctor not available'
        });
      }

      // Calculate slot boundaries
      const slotDuration = doctor.slotDuration || 30;
      const requestedTime = new Date(appointmentDateTime);
      const slotStart = new Date(requestedTime);
      slotStart.setMinutes(Math.floor(slotStart.getMinutes() / slotDuration) * slotDuration);
      slotStart.setSeconds(0, 0);
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

      // Check existing appointments
      const existingCount = await Appointment.count({
        where: {
          doctorId,
          appointmentDateTime: { [Op.between]: [slotStart, slotEnd] },
          status: 'booked'
        }
      });

      if (existingCount >= (doctor.maxPatientsPerSlot || 1)) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Time slot is full'
        });
      }

      // Generate Jitsi link
      const roomName = uuidv4();
      const appointment = await Appointment.create({
        userId,
        doctorId,
        appointmentDateTime: requestedTime,
        videoCallLink: `https://meet.jit.si/${roomName}`,
        status: 'booked'
      });

      res.status(201).json({
        status: 'success',
        code: 201,
        message: 'Appointment booked successfully',
        data: appointment
      });

    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message
      });
    }
  },

  /**
   * @swagger
   * /appointments/doctors/{doctorId}:
   *   get:
   *     summary: Get appointments for a specific doctor
   *     tags: [Appointments]
   *     parameters:
   *       - in: path
   *         name: doctorId
   *         required: true
   *         description: ID of the doctor
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
   *       404:
   *         description: Doctor not found
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  getDoctorAppointments: async (req, res) => {
    try {
      const appointments = await Appointment.findAll({
        where: { doctorId: req.params.doctorId },
        include: [
          { model: User, as: 'patient', attributes: ['id', 'name', 'phone'] },
          { model: Doctor, as: 'doctor', include: [{ model: User, attributes: ['name'] }] }
        ],
        order: [['appointmentDateTime', 'ASC']]
      });

      res.json({
        status: 'success',
        code: 200,
        message: 'Appointments retrieved successfully',
        data: appointments
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message
      });
    }
  },

  /**
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
      if (!doctor) return res.status(404).json({ 
        status: 'error', 
        code: 404, 
        message: 'Doctor not found' 
      });

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

      res.json({
        status: 'success',
        code: 200,
        message: 'Available slots retrieved successfully',
        data: slots
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message
      });
    }
  }
};