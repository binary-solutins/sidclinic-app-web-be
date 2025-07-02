const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Appointment, User, Doctor, Notification } = require('../models');
const { sendUserNotification } = require('../services/firebase.services');
const { sendAppointmentEmail } = require('../services/email.services');
const { CommunicationIdentityClient } = require('@azure/communication-identity');
const Patient = require('../models/patient.model');
const { DateTime } = require('luxon');
const communicationIdentityClient = new CommunicationIdentityClient(
  process.env.AZURE_COMMUNICATION_CONNECTION_STRING
);

// Helper function to create Azure Communication user and token
const createAzureCommUser = async () => {
  try {
    const user = await communicationIdentityClient.createUser();
    const tokenResponse = await communicationIdentityClient.getToken(user, ["voip"]);

    return {
      userId: user.communicationUserId,
      token: tokenResponse.token,
      expiresOn: tokenResponse.expiresOn
    };
  } catch (error) {
    console.error('Error creating Azure Communication user:', error);
    throw error;
  }
};

module.exports = {

  bookAppointment: async (req, res) => {
    try {
      const { userId, doctorId, appointmentDateTime, type = 'physical', notes } = req.body;

      // Always interpret incoming appointmentDateTime as IST, regardless of format
      let requestedTime;
      if (appointmentDateTime.includes('T')) {
        // ISO format - parse and force IST timezone
        requestedTime = DateTime.fromISO(appointmentDateTime, { zone: 'Asia/Kolkata' });
      } else {
        // Other formats - parse with IST timezone
        requestedTime = DateTime.fromFormat(appointmentDateTime, "yyyy-MM-dd HH:mm:ss", {
          zone: 'Asia/Kolkata'
        });
      }

      // If parsing failed, try alternative format
      if (!requestedTime.isValid) {
        requestedTime = DateTime.fromFormat(appointmentDateTime, "yyyy-MM-dd'T'HH:mm:ss.SSS", {
          zone: 'Asia/Kolkata'
        });
      }

      if (!requestedTime.isValid) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid appointment date/time format',
        });
      }

      const now = DateTime.now().setZone('Asia/Kolkata');
      const oneHourFromNow = now.plus({ hours: 1 });

      if (requestedTime < oneHourFromNow) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointment must be scheduled at least 1 hour in advance',
        });
      }

      // Validate user
      const user = await User.findByPk(userId);
      const patient = await Patient.findOne({ where: { userId: userId } });

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

      // Check if appointment is during working days (Mon-Fri) and hours (9 AM - 6 PM IST)
      const appointmentHour = requestedTime.hour;
      const appointmentDay = requestedTime.weekday; // 1 = Monday, 7 = Sunday

      if (appointmentDay === 6 || appointmentDay === 7) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointments are not available on weekends',
        });
      }

      if (appointmentHour < 9 || appointmentHour >= 18) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointments are only available between 9:00 AM and 6:00 PM',
        });
      }

      // Check time slot availability (30-minute blocks) - all in IST
      const slotStart = requestedTime.set({ minute: Math.floor(requestedTime.minute / 30) * 30, second: 0, millisecond: 0 });
      const slotEnd = slotStart.plus({ minutes: 30 });

      const existingCount = await Appointment.count({
        where: {
          doctorId,
          appointmentDateTime: {
            [Op.between]: [slotStart.toJSDate(), slotEnd.toJSDate()]
          },
          status: { [Op.notIn]: ['canceled', 'completed', 'rejected'] }
        }
      });

      const maxAppointments = type === 'physical' ? 1 : 3;

      if (existingCount >= maxAppointments) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Time slot is full. Please choose another time.',
        });
      }

      // Check if user already has an appointment with the same doctor on same date (IST)
      const dayStart = requestedTime.startOf('day');
      const dayEnd = requestedTime.endOf('day');

      const existingUserAppointment = await Appointment.findOne({
        where: {
          userId,
          doctorId,
          appointmentDateTime: {
            [Op.between]: [dayStart.toJSDate(), dayEnd.toJSDate()]
          },
          status: { [Op.notIn]: ['canceled', 'rejected'] }
        }
      });

      if (existingUserAppointment) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'You already have an appointment with this doctor on the selected date',
        });
      }

      // Build appointment data - convert IST DateTime to JS Date for DB storage
      const appointmentData = {
        userId,
        doctorId,
        appointmentDateTime: requestedTime.toJSDate(), // Convert IST DateTime to JS Date
        type,
        status: 'pending',
        notes,
        bookingDate: new Date(), // UTC Date for DB
      };

      if (type === 'virtual') {
        try {
          const roomId = uuidv4();
          const patientCommUser = await createAzureCommUser();
          const doctorCommUser = await createAzureCommUser();

          appointmentData.videoCallLink = `/video-call/${roomId}`;
          appointmentData.roomId = roomId;
          appointmentData.azurePatientUserId = patientCommUser.userId;
          appointmentData.azurePatientToken = patientCommUser.token;
          appointmentData.azurePatientTokenExpiry = patientCommUser.expiresOn;
          appointmentData.azureDoctorUserId = doctorCommUser.userId;
          appointmentData.azureDoctorToken = doctorCommUser.token;
          appointmentData.azureDoctorTokenExpiry = doctorCommUser.expiresOn;
        } catch (err) {
          console.error('Azure Communication Services error:', err);
          return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Failed to setup video call service. Please try again.',
          });
        }
      }

      // Save appointment
      const appointment = await Appointment.create(appointmentData);

      // Notify doctor
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

      // Send emails with IST formatted times
      await sendAppointmentEmail(
        patient.email,
        'appointment_requested',
        {
          patientName: user.name,
          doctorName: doctor.User.name,
          appointmentDate: requestedTime.toFormat('dd LLL yyyy'),
          appointmentTime: requestedTime.toFormat('hh:mm a'),
          appointmentType: type,
          appointmentId: appointment.id
        }
      );

      await sendAppointmentEmail(
        doctor.email,
        'new_appointment_request',
        {
          doctorName: doctor.User.name,
          patientName: user.name,
          appointmentDate: requestedTime.toFormat('dd LLL yyyy'),
          appointmentTime: requestedTime.toFormat('hh:mm a'),
          appointmentType: type,
          appointmentId: appointment.id,
          notes: notes || 'No additional notes'
        }
      );

      // Format response data with IST times
      const responseData = {
        ...appointment.toJSON(),
        appointmentDateTime: DateTime.fromJSDate(appointment.appointmentDateTime)
          .setZone('Asia/Kolkata')
          .toFormat('yyyy-MM-dd hh:mm a'),
        bookingDate: DateTime.fromJSDate(appointment.bookingDate)
          .setZone('Asia/Kolkata')
          .toFormat('yyyy-MM-dd hh:mm a'),
        createdAt: DateTime.fromJSDate(appointment.createdAt)
          .setZone('Asia/Kolkata')
          .toFormat('yyyy-MM-dd hh:mm a'),
        updatedAt: DateTime.fromJSDate(appointment.updatedAt)
          .setZone('Asia/Kolkata')
          .toFormat('yyyy-MM-dd hh:mm a')
      };

      return res.status(201).json({
        status: 'success',
        code: 201,
        message: 'Appointment request submitted successfully. You will be notified once the doctor confirms.',
        data: responseData,
      });

    } catch (error) {
      console.error('Book Appointment Error:', error);
      return res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message || 'Something went wrong',
      });
    }
  },
  getVideoCallCredentials: async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const appointment = await Appointment.findByPk(appointmentId, {
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

      if (appointment.type !== 'virtual') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'This is not a virtual appointment',
        });
      }

      if (appointment.status !== 'confirmed') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointment must be confirmed to access video call',
        });
      }

      // Check if user is authorized (patient or doctor)
      const isPatient = req.user.id === appointment.userId;
      const isDoctor = req.user.id === appointment.doctor.User.id;

      if (!isPatient && !isDoctor) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'Unauthorized access to video call',
        });
      }

      // Check if tokens are expired and refresh if needed
      const now = new Date();
      let patientToken = appointment.azurePatientToken;
      let doctorToken = appointment.azureDoctorToken;

      if (new Date(appointment.azurePatientTokenExpiry) <= now) {
        const newPatientToken = await communicationIdentityClient.getToken(
          { communicationUserId: appointment.azurePatientUserId },
          ["voip"]
        );
        patientToken = newPatientToken.token;
        appointment.azurePatientToken = newPatientToken.token;
        appointment.azurePatientTokenExpiry = newPatientToken.expiresOn;
      }

      if (new Date(appointment.azureDoctorTokenExpiry) <= now) {
        const newDoctorToken = await communicationIdentityClient.getToken(
          { communicationUserId: appointment.azureDoctorUserId },
          ["voip"]
        );
        doctorToken = newDoctorToken.token;
        appointment.azureDoctorToken = newDoctorToken.token;
        appointment.azureDoctorTokenExpiry = newDoctorToken.expiresOn;
      }

      await appointment.save();

      // Return appropriate credentials based on user role
      const credentials = {
        roomId: appointment.roomId,
        userId: isPatient ? appointment.azurePatientUserId : appointment.azureDoctorUserId,
        token: isPatient ? patientToken : doctorToken,
        userRole: isPatient ? 'patient' : 'doctor',
        appointmentId: appointment.id,
        participantName: isPatient ? appointment.patient.name : appointment.doctor.User.name
      };

      res.json({
        status: 'success',
        code: 200,
        data: credentials,
      });
    } catch (error) {
      console.error('Get Video Call Credentials Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },


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
          message: 'Only the assigned doctor can confirm this appointment',
        });
      }

      if (appointment.status !== 'pending') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Cannot confirm appointment. Current status: ${appointment.status}`,
        });
      }

      // Update status
      appointment.status = 'confirmed';
      appointment.confirmedAt = new Date();
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

      // Send confirmation email to patient
      await sendAppointmentEmail(
        appointment.patient.email,
        'appointment_confirmed',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          appointmentDate: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('dd LLL yyyy'),
          appointmentTime: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('hh:mm a'),
          appointmentType: appointment.type,
          appointmentId: appointment.id,
          videoCallLink: appointment.videoCallLink || null
        }
      );


      res.json({
        status: 'success',
        code: 200,
        message: 'Appointment confirmed successfully',
        data: appointment,
      });
    } catch (error) {
      console.error('Confirm Appointment Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  rejectAppointment: async (req, res) => {
    try {
      const { rejectionReason } = req.body;
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
          message: 'Only the assigned doctor can reject this appointment',
        });
      }

      if (appointment.status !== 'pending') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Cannot reject appointment. Current status: ${appointment.status}`,
        });
      }

      // Update status
      appointment.status = 'rejected';
      appointment.rejectionReason = rejectionReason;
      appointment.rejectedAt = new Date();
      await appointment.save();

      // Send notification to patient
      await sendUserNotification(
        appointment.userId,
        'Appointment Rejected',
        `Your appointment request with Dr. ${appointment.doctor.User.name} has been rejected`,
        {
          type: 'appointment',
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'appointment_rejected',
            rejectionReason
          }
        }
      );

      await sendAppointmentEmail(
        appointment.patient.email,
        'appointment_rejected',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          appointmentDate: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('dd LLL yyyy'),
          appointmentTime: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('hh:mm a'),
          rejectionReason: rejectionReason || 'No reason provided',
          appointmentId: appointment.id
        }
      );

      res.json({
        status: 'success',
        code: 200,
        message: 'Appointment rejected successfully',
        data: appointment,
      });
    } catch (error) {
      console.error('Reject Appointment Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  requestReschedule: async (req, res) => {
    try {
      const { newDateTime, rescheduleReason } = req.body;
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

      // Check if the requesting user is the patient
      if (req.user.id !== appointment.userId) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'Only the patient can request reschedule',
        });
      }

      // Check if appointment can be rescheduled (must be at least 24 hours before) - using IST
      const now = DateTime.now().setZone('Asia/Kolkata');
      const appointmentTime = DateTime.fromJSDate(appointment.appointmentDateTime).setZone('Asia/Kolkata');
      const timeDifference = appointmentTime.diff(now, 'hours').hours;

      if (timeDifference < 24) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointments can only be rescheduled at least 24 hours in advance',
        });
      }

      // Validate appointment status
      if (!['pending', 'confirmed'].includes(appointment.status)) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Cannot reschedule appointment with status: ${appointment.status}`,
        });
      }

      // Parse and validate new appointment time in IST
      let newRequestedTime;
      if (newDateTime.includes('T')) {
        newRequestedTime = DateTime.fromISO(newDateTime, { zone: 'Asia/Kolkata' });
      } else {
        newRequestedTime = DateTime.fromFormat(newDateTime, "yyyy-MM-dd HH:mm:ss", {
          zone: 'Asia/Kolkata'
        });
      }

      if (!newRequestedTime.isValid) {
        newRequestedTime = DateTime.fromFormat(newDateTime, "yyyy-MM-dd'T'HH:mm:ss.SSS", {
          zone: 'Asia/Kolkata'
        });
      }

      if (!newRequestedTime.isValid) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid new appointment date/time format',
        });
      }

      const oneHourFromNow = now.plus({ hours: 1 });

      if (newRequestedTime < oneHourFromNow) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'New appointment time must be at least 1 hour from now',
        });
      }

      // Check working hours and days
      const appointmentHour = newRequestedTime.hour;
      const appointmentDay = newRequestedTime.weekday;

      if (appointmentDay === 6 || appointmentDay === 7) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointments are not available on weekends',
        });
      }

      if (appointmentHour < 9 || appointmentHour >= 18) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointments are only available between 9:00 AM and 6:00 PM',
        });
      }

      // Check availability for new time slot
      const slotStart = newRequestedTime.set({ minute: Math.floor(newRequestedTime.minute / 30) * 30, second: 0, millisecond: 0 });
      const slotEnd = slotStart.plus({ minutes: 30 });

      const existingCount = await Appointment.count({
        where: {
          doctorId: appointment.doctorId,
          appointmentDateTime: { [Op.between]: [slotStart.toJSDate(), slotEnd.toJSDate()] },
          status: { [Op.notIn]: ['canceled', 'completed', 'rejected'] },
          id: { [Op.ne]: appointment.id }
        }
      });

      const maxAppointments = appointment.type === 'physical' ? 1 : 3;
      if (existingCount >= maxAppointments) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'The requested time slot is not available',
        });
      }

      // Store original appointment time and update with new details
      appointment.originalDateTime = appointment.appointmentDateTime;
      appointment.requestedDateTime = newRequestedTime.toJSDate();
      appointment.rescheduleReason = rescheduleReason;
      appointment.status = 'reschedule_requested';
      appointment.rescheduleRequestedAt = new Date();
      await appointment.save();

      // Send notification to doctor
      await sendUserNotification(
        appointment.doctor.User.id,
        'Reschedule Request',
        `${appointment.patient.name} has requested to reschedule their appointment`,
        {
          type: 'appointment',
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'reschedule_requested'
          }
        }
      );

      // Send reschedule request emails with IST formatting
      const originalIST = DateTime.fromJSDate(appointment.originalDateTime).setZone('Asia/Kolkata');
      const newIST = newRequestedTime;

      await sendAppointmentEmail(
        appointment.doctor.User.email,
        'reschedule_request_doctor',
        {
          doctorName: appointment.doctor.User.name,
          patientName: appointment.patient.name,
          originalDate: originalIST.toFormat('dd LLL yyyy'),
          originalTime: originalIST.toFormat('hh:mm a'),
          newDate: newIST.toFormat('dd LLL yyyy'),
          newTime: newIST.toFormat('hh:mm a'),
          rescheduleReason: rescheduleReason || 'No reason provided',
          appointmentId: appointment.id
        }
      );

      await sendAppointmentEmail(
        appointment.patient.email,
        'reschedule_request_patient',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          originalDate: originalIST.toFormat('dd LLL yyyy'),
          originalTime: originalIST.toFormat('hh:mm a'),
          newDate: newIST.toFormat('dd LLL yyyy'),
          newTime: newIST.toFormat('hh:mm a'),
          appointmentId: appointment.id
        }
      );

      res.json({
        status: 'success',
        code: 200,
        message: 'Reschedule request submitted successfully. Waiting for doctor approval.',
        data: appointment,
      });
    } catch (error) {
      console.error('Request Reschedule Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },


  approveReschedule: async (req, res) => {
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
          message: 'Only the assigned doctor can approve reschedule',
        });
      }

      if (appointment.status !== 'reschedule_requested') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'No reschedule request found for this appointment',
        });
      }

      // Update appointment with new time
      appointment.appointmentDateTime = appointment.requestedDateTime;
      appointment.status = 'confirmed';
      appointment.rescheduleApprovedAt = new Date();
      await appointment.save();

      await sendUserNotification(
        appointment.userId,
        'Reschedule Approved',
        `Dr. ${appointment.doctor.User.name} has approved your reschedule request`,
        {
          type: 'appointment',
          relatedId: String(appointment.id),
          data: {
            appointmentId: String(appointment.id),
            type: 'reschedule_approved'
          }
        }
      );


      // Send approval email to patient
      await sendAppointmentEmail(
        appointment.patient.email,
        'reschedule_approved',
        {
          patientName: String(appointment.patient.name),
          doctorName: String(appointment.doctor.User.name),
          newDate: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('dd LLL yyyy'),
          newTime: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('hh:mm a'),
          appointmentType: String(appointment.type),
          appointmentId: String(appointment.id),
          videoCallLink: appointment.videoCallLink ? String(appointment.videoCallLink) : ''
        }
      );

      res.json({
        status: 'success',
        code: 200,
        message: 'Reschedule request approved successfully',
        data: appointment,
      });
    } catch (error) {
      console.error('Approve Reschedule Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  rejectReschedule: async (req, res) => {
    try {
      const { rejectionReason } = req.body;
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
          message: 'Only the assigned doctor can reject reschedule',
        });
      }

      if (appointment.status !== 'reschedule_requested') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'No reschedule request found for this appointment',
        });
      }

      // Revert to confirmed status and clear reschedule data
      appointment.status = 'confirmed';
      appointment.appointmentDateTime = appointment.originalDateTime;
      appointment.rescheduleRejectionReason = rejectionReason;
      appointment.rescheduleRejectedAt = new Date();
      appointment.requestedDateTime = null;
      await appointment.save();

      // Send notification to patient
      await sendUserNotification(
        appointment.userId,
        'Reschedule Request Rejected',
        `Dr. ${appointment.doctor.User.name} has rejected your reschedule request`,
        {
          type: 'appointment',
          relatedId: String(appointment.id),
          data: {
            appointmentId: String(appointment.id),
            type: 'reschedule_rejected',
            rejectionReason: String(rejectionReason || 'No reason provided')
          }
        }
      );
      

      await sendAppointmentEmail(
        appointment.patient.email,
        'reschedule_rejected',
        {
          patientName: String(appointment.patient.name),
          doctorName: String(appointment.doctor.User.name),
          originalDate: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('dd LLL yyyy'),
          originalTime: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('hh:mm a'),
          rejectionReason: String(rejectionReason || 'No reason provided'),
          appointmentId: String(appointment.id)
        }
      );
      

      res.json({
        status: 'success',
        code: 200,
        message: 'Reschedule request rejected. Original appointment time maintained.',
        data: appointment,
      });
    } catch (error) {
      console.error('Reject Reschedule Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

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
      const isPatient = req.user.id === appointment.userId;
      const isDoctor = req.user.id === appointment.doctor.User.id;

      if (!isPatient && !isDoctor) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'You are not authorized to cancel this appointment',
        });
      }

      // Check if appointment can be canceled
      if (['canceled', 'completed'].includes(appointment.status)) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Cannot cancel appointment with status: ${appointment.status}`,
        });
      }

      // Update status
      appointment.status = 'canceled';
      appointment.cancelReason = cancelReason;
      appointment.canceledBy = isPatient ? 'patient' : 'doctor';
      appointment.canceledAt = new Date();
      await appointment.save();

      // Determine who canceled and notify the other party
      const cancelerName = isPatient ? appointment.patient.name : `Dr. ${appointment.doctor.User.name}`;
      const recipientId = isPatient ? appointment.doctor.User.id : appointment.userId;
      const recipientEmail = isPatient ? appointment.doctor.User.email : appointment.patient.email;
      const recipientName = isPatient ? appointment.doctor.User.name : appointment.patient.name;

      await sendUserNotification(
        recipientId,
        'Appointment Canceled',
        `${cancelerName} has canceled the appointment`,
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

      // Send cancellation email to the other party
      const emailTemplate = isPatient ? 'appointment_canceled_by_patient' : 'appointment_canceled_by_doctor';
      await sendAppointmentEmail(
        recipientEmail,
        emailTemplate,
        {
          recipientName,
          cancelerName,
          appointmentDate: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('dd LLL yyyy'),
          appointmentTime: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('hh:mm a'),
          cancelReason: cancelReason || 'No reason provided',
          appointmentId: appointment.id
        }
      );
      // Send confirmation email to the canceler
      const confirmationTemplate = isPatient ? 'cancellation_confirmation_patient' : 'cancellation_confirmation_doctor';
      const cancelerEmail = isPatient ? appointment.patient.email : appointment.doctor.User.email;

      await sendAppointmentEmail(
        cancelerEmail,
        confirmationTemplate,
        {
          cancelerName,
          otherPartyName: isPatient ? `Dr. ${appointment.doctor.User.name}` : appointment.patient.name,
          appointmentDate: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('dd LLL yyyy'),
          appointmentTime: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('hh:mm a'),
          appointmentId: appointment.id
        }
      );

      res.json({
        status: 'success',
        code: 200,
        message: 'Appointment canceled successfully',
        data: appointment,
      });
    } catch (error) {
      console.error('Cancel Appointment Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  completeAppointment: async (req, res) => {
    try {
      const { consultationNotes, prescription } = req.body;
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
          message: 'Only the assigned doctor can complete this appointment',
        });
      }

      if (appointment.status !== 'confirmed') {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: `Cannot complete appointment with status: ${appointment.status}`,
        });
      }

      // Update status
      appointment.status = 'completed';
      appointment.consultationNotes = consultationNotes;
      appointment.prescription = prescription;
      appointment.completedAt = new Date();
      await appointment.save();

      // Send notification to patient
      await sendUserNotification(
        appointment.userId,
        'Appointment Completed',
        `Your appointment with Dr. ${appointment.doctor.User.name} has been completed`,
        {
          type: 'appointment',
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'appointment_completed'
          }
        }
      );

      await sendAppointmentEmail(
        appointment.patient.email,
        'appointment_completed',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          appointmentDate: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('dd LLL yyyy'),
          appointmentTime: DateTime.fromJSDate(appointment.appointmentDateTime)
            .setZone('Asia/Kolkata')
            .toFormat('hh:mm a'),
          consultationNotes: consultationNotes || 'No notes provided',
          prescription: prescription || 'No prescription provided',
          appointmentId: appointment.id
        }
      );

      res.json({
        status: 'success',
        code: 200,
        message: 'Appointment completed successfully',
        data: appointment,
      });
    } catch (error) {
      console.error('Complete Appointment Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  getUserAppointments: async (req, res) => {
    try {
      const userId = req.params.userId;
      const { status, fromDate, toDate, page = 1, limit = 10 } = req.query;

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

      const offset = (page - 1) * limit;

      const { count, rows: appointments } = await Appointment.findAndCountAll({
        where,
        include: [
          {
            model: Doctor,
            as: 'doctor',
            include: [{
              model: User,
              as: 'User',
              attributes: ['id', 'name']
            }]
          }
        ],
        order: [['appointmentDateTime', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        status: 'success',
        code: 200,
        data: {
          appointments,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get User Appointments Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  getDoctorAppointments: async (req, res) => {
    try {
      const doctorId = req.params.doctorId;
      const { status, fromDate, toDate, page = 1, limit = 10 } = req.query;

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

      const offset = (page - 1) * limit;

      const { count, rows: appointments } = await Appointment.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ],
        order: [['appointmentDateTime', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        status: 'success',
        code: 200,
        data: {
          appointments,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get Doctor Appointments Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  getAvailableSlots: async (req, res) => {
    try {
      const doctorId = req.params.doctorId;
      const { date, type = 'physical' } = req.query;

      if (!date) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Date parameter is required',
        });
      }

      const doctor = await Doctor.findByPk(doctorId);
      if (!doctor) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Doctor not found',
        });
      }

      // Check if doctor has configured working hours
      if (!doctor.startTime || !doctor.endTime) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Doctor working hours not configured',
        });
      }

      const requestedDate = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'Asia/Kolkata' });
      const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');

      // Don't allow booking for past dates
      if (requestedDate < today) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Cannot book appointments for past dates',
        });
      }

      // Don't allow booking for weekends
      const dayOfWeek = requestedDate.weekday; // 1 = Monday, 7 = Sunday
      if (dayOfWeek === 6 || dayOfWeek === 7) {
        return res.json({
          status: 'success',
          code: 200,
          data: {
            date: date,
            slots: [],
            message: 'No appointments available on weekends'
          }
        });
      }

      // Parse doctor's working hours and create DateTime objects for the requested date
      const [startHour, startMinute] = doctor.startTime.split(':').map(Number);
      const [endHour, endMinute] = doctor.endTime.split(':').map(Number);

      const startOfDay = requestedDate.set({
        hour: startHour,
        minute: startMinute,
        second: 0,
        millisecond: 0
      });

      const endOfDay = requestedDate.set({
        hour: endHour,
        minute: endMinute,
        second: 0,
        millisecond: 0
      });

      // Validate that end time is after start time
      if (endOfDay <= startOfDay) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid doctor working hours configuration',
        });
      }

      // Get existing appointments for the day
      const existingAppointments = await Appointment.findAll({
        where: {
          doctorId: doctorId,
          appointmentDateTime: { [Op.between]: [startOfDay.toJSDate(), endOfDay.toJSDate()] },
          status: { [Op.notIn]: ['canceled', 'rejected'] }
        }
      });

      const slots = [];
      const slotDuration = 30; // 30 minutes
      const maxAppointments = type === 'physical' ? 1 : 3;

      // Generate time slots using IST based on doctor's working hours
      let currentTime = startOfDay;
      while (currentTime < endOfDay) {
        const slotEnd = currentTime.plus({ minutes: slotDuration });

        // Don't create a slot if it would extend beyond doctor's end time
        if (slotEnd > endOfDay) {
          break;
        }

        // Count existing appointments in this slot
        const existingCount = existingAppointments.filter(appointment => {
          const appointmentIST = DateTime.fromJSDate(appointment.appointmentDateTime).setZone('Asia/Kolkata');
          return appointmentIST >= currentTime && appointmentIST < slotEnd;
        }).length;

        const isAvailable = existingCount < maxAppointments;

        // If it's today, only show slots that are at least 1 hour from now
        let showSlot = true;
        if (requestedDate.hasSame(today, 'day')) {
          const oneHourFromNow = DateTime.now().setZone('Asia/Kolkata').plus({ hours: 1 });
          showSlot = currentTime >= oneHourFromNow;
        }

        if (showSlot) {
          slots.push({
            start: currentTime.toISO(),
            end: slotEnd.toISO(),
            time: currentTime.toFormat('hh:mm a'),
            available: isAvailable,
            bookedCount: existingCount,
            maxCapacity: maxAppointments
          });
        }

        currentTime = slotEnd;
      }

      res.json({
        status: 'success',
        code: 200,
        data: {
          date: date,
          doctorId: doctorId,
          type: type,
          workingHours: {
            start: doctor.startTime,
            end: doctor.endTime
          },
          slots: slots
        }
      });
    } catch (error) {
      console.error('Get Available Slots Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  getAppointmentById: async (req, res) => {
    try {
      const appointment = await Appointment.findByPk(req.params.id, {
        include: [
          {
            model: Doctor,
            as: 'doctor',
            include: [{
              model: User,
              as: 'User',
              attributes: ['id', 'name']
            }]
          },
          {
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'phone']
          }
        ]
      });

      if (!appointment) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Appointment not found',
        });
      }

      // Check authorization
      const isPatient = req.user.id === appointment.userId;
      const isDoctor = req.user.id === appointment.doctor.User.id;
      const isAdmin = req.user.role === 'admin';

      if (!isPatient && !isDoctor && !isAdmin) {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'Unauthorized access',
        });
      }

      res.json({
        status: 'success',
        code: 200,
        data: appointment,
      });
    } catch (error) {
      console.error('Get Appointment Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  getAppointmentStats: async (req, res) => {
    try {
      const { userType, userId } = req.query;
      let whereCondition = {};

      if (userType === 'patient') {
        whereCondition.userId = userId || req.user.id;
      } else if (userType === 'doctor') {
        const doctor = await Doctor.findOne({
          where: { userId: userId || req.user.id }
        });
        if (doctor) {
          whereCondition.doctorId = doctor.id;
        }
      }

      const today = DateTime.now().setZone('Asia/Kolkata');
      const startOfToday = today.startOf('day');
      const endOfToday = today.endOf('day');
      const startOfWeek = today.startOf('week');
      const startOfMonth = today.startOf('month');

      const stats = {
        total: await Appointment.count({ where: whereCondition }),
        pending: await Appointment.count({
          where: { ...whereCondition, status: 'pending' }
        }),
        confirmed: await Appointment.count({
          where: { ...whereCondition, status: 'confirmed' }
        }),
        completed: await Appointment.count({
          where: { ...whereCondition, status: 'completed' }
        }),
        canceled: await Appointment.count({
          where: { ...whereCondition, status: 'canceled' }
        }),
        today: await Appointment.count({
          where: {
            ...whereCondition,
            appointmentDateTime: { [Op.between]: [startOfToday.toJSDate(), endOfToday.toJSDate()] }
          }
        }),
        thisWeek: await Appointment.count({
          where: {
            ...whereCondition,
            appointmentDateTime: { [Op.gte]: startOfWeek.toJSDate() }
          }
        }),
        thisMonth: await Appointment.count({
          where: {
            ...whereCondition,
            appointmentDateTime: { [Op.gte]: startOfMonth.toJSDate() }
          }
        }),
        rescheduleRequests: await Appointment.count({
          where: { ...whereCondition, status: 'reschedule_requested' }
        })
      };
      res.json({
        status: 'success',
        code: 200,
        data: stats,
      });
    } catch (error) {
      console.error('Get Appointment Stats Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  },

  joinVideoCall: async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const appointment = await Appointment.findByPk(appointmentId);

      if (!appointment) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Appointment not found',
        });
      }

      // Log the join event
      const isPatient = req.user.id === appointment.userId;
      const joinEvent = {
        appointmentId: appointment.id,
        userId: req.user.id,
        userType: isPatient ? 'patient' : 'doctor',
        joinedAt: new Date()
      };

      // You can store this in a separate table or add fields to appointment
      console.log('Video call joined:', joinEvent);

      res.json({
        status: 'success',
        code: 200,
        message: 'Video call join logged successfully',
      });
    } catch (error) {
      console.error('Join Video Call Error:', error);
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
      });
    }
  }
};