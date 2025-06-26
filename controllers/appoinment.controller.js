const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Appointment, User, Doctor, Notification } = require('../models');
const { sendUserNotification } = require('../services/firebase.services');
const { sendAppointmentEmail } = require('../services/email.services');
const Patient = require('../models/patient.model');

module.exports = {

  bookAppointment: async (req, res) => {
    try {
      const { userId, doctorId, appointmentDateTime, type = 'physical', notes } = req.body;

      // Validate appointment time is in future and at least 1 hour from now
      const requestedTime = new Date(appointmentDateTime);
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

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

      // Check if appointment time is within doctor's working hours
      const appointmentHour = requestedTime.getHours();
      const appointmentDay = requestedTime.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Skip weekends (assuming doctors don't work on weekends)
      if (appointmentDay === 0 || appointmentDay === 6) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointments are not available on weekends',
        });
      }

      // Check working hours (9 AM to 6 PM)
      if (appointmentHour < 9 || appointmentHour >= 18) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Appointments are only available between 9:00 AM and 6:00 PM',
        });
      }

      // Check doctor availability for the requested time slot
      const slotStart = new Date(requestedTime);
      slotStart.setMinutes(Math.floor(slotStart.getMinutes() / 30) * 30);
      slotStart.setSeconds(0, 0);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

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
          message: 'Time slot is full. Please choose another time.',
        });
      }

      // Check if user already has an appointment with this doctor on the same day
      const dayStart = new Date(requestedTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(requestedTime);
      dayEnd.setHours(23, 59, 59, 999);

      const existingUserAppointment = await Appointment.findOne({
        where: {
          userId,
          doctorId,
          appointmentDateTime: { [Op.between]: [dayStart, dayEnd] },
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

      // Create appointment
      const appointmentData = {
        userId,
        doctorId,
        appointmentDateTime: requestedTime,
        type,
        status: 'pending',
        notes,
        bookingDate: new Date()
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

      // Send confirmation email to patient
      await sendAppointmentEmail(
        patient.email,
        'appointment_requested',
        {
          patientName: user.name,
          doctorName: doctor.User.name,
          appointmentDate: requestedTime.toLocaleDateString(),
          appointmentTime: requestedTime.toLocaleTimeString(),
          appointmentType: type,
          appointmentId: appointment.id
        }
      );

      // Send notification email to doctor
      await sendAppointmentEmail(
        doctor.email,
        'new_appointment_request',
        {
          doctorName: doctor.User.name,
          patientName: user.name,
          appointmentDate: requestedTime.toLocaleDateString(),
          appointmentTime: requestedTime.toLocaleTimeString(),
          appointmentType: type,
          appointmentId: appointment.id,
          notes: notes || 'No additional notes'
        }
      );

      res.status(201).json({
        status: 'success',
        code: 201,
        message: 'Appointment request submitted successfully. You will be notified once the doctor confirms.',
        data: appointment,
      });
    } catch (error) {
      console.error('Book Appointment Error:', error);
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
          appointmentDate: appointment.appointmentDateTime.toLocaleDateString(),
          appointmentTime: appointment.appointmentDateTime.toLocaleTimeString(),
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

      // Send rejection email to patient
      await sendAppointmentEmail(
        appointment.patient.email,
        'appointment_rejected',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          appointmentDate: appointment.appointmentDateTime.toLocaleDateString(),
          appointmentTime: appointment.appointmentDateTime.toLocaleTimeString(),
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

      // Check if appointment can be rescheduled (must be at least 24 hours before)
      const now = new Date();
      const appointmentTime = new Date(appointment.appointmentDateTime);
      const timeDifference = appointmentTime.getTime() - now.getTime();
      const hoursUntilAppointment = timeDifference / (1000 * 60 * 60);

      if (hoursUntilAppointment < 24) {
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

      // Validate new appointment time
      const newAppointmentTime = new Date(newDateTime);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      if (newAppointmentTime < oneHourFromNow) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'New appointment time must be at least 1 hour from now',
        });
      }

      // Check availability for new time slot
      const slotStart = new Date(newAppointmentTime);
      slotStart.setMinutes(Math.floor(slotStart.getMinutes() / 30) * 30);
      slotStart.setSeconds(0, 0);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

      const existingCount = await Appointment.count({
        where: {
          doctorId: appointment.doctorId,
          appointmentDateTime: { [Op.between]: [slotStart, slotEnd] },
          status: { [Op.notIn]: ['canceled', 'completed', 'rejected'] },
          id: { [Op.ne]: appointment.id } // Exclude current appointment
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
      appointment.requestedDateTime = newAppointmentTime;
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

      // Send reschedule request email to doctor
      await sendAppointmentEmail(
        appointment.doctor.User.email,
        'reschedule_request_doctor',
        {
          doctorName: appointment.doctor.User.name,
          patientName: appointment.patient.name,
          originalDate: appointment.originalDateTime.toLocaleDateString(),
          originalTime: appointment.originalDateTime.toLocaleTimeString(),
          newDate: newAppointmentTime.toLocaleDateString(),
          newTime: newAppointmentTime.toLocaleTimeString(),
          rescheduleReason: rescheduleReason || 'No reason provided',
          appointmentId: appointment.id
        }
      );

      // Send confirmation email to patient
      await sendAppointmentEmail(
        appointment.patient.email,
        'reschedule_request_patient',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          originalDate: appointment.originalDateTime.toLocaleDateString(),
          originalTime: appointment.originalDateTime.toLocaleTimeString(),
          newDate: newAppointmentTime.toLocaleDateString(),
          newTime: newAppointmentTime.toLocaleTimeString(),
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

      // Send notification to patient
      await sendUserNotification(
        appointment.userId,
        'Reschedule Approved',
        `Dr. ${appointment.doctor.User.name} has approved your reschedule request`,
        {
          type: 'appointment',
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'reschedule_approved'
          }
        }
      );

      // Send approval email to patient
      await sendAppointmentEmail(
        appointment.patient.email,
        'reschedule_approved',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          newDate: appointment.appointmentDateTime.toLocaleDateString(),
          newTime: appointment.appointmentDateTime.toLocaleTimeString(),
          appointmentType: appointment.type,
          appointmentId: appointment.id,
          videoCallLink: appointment.videoCallLink || null
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
          relatedId: appointment.id,
          data: {
            appointmentId: appointment.id,
            type: 'reschedule_rejected',
            rejectionReason
          }
        }
      );

      // Send rejection email to patient
      await sendAppointmentEmail(
        appointment.patient.email,
        'reschedule_rejected',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          originalDate: appointment.appointmentDateTime.toLocaleDateString(),
          originalTime: appointment.appointmentDateTime.toLocaleTimeString(),
          rejectionReason: rejectionReason || 'No reason provided',
          appointmentId: appointment.id
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
          appointmentDate: appointment.appointmentDateTime.toLocaleDateString(),
          appointmentTime: appointment.appointmentDateTime.toLocaleTimeString(),
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
          appointmentDate: appointment.appointmentDateTime.toLocaleDateString(),
          appointmentTime: appointment.appointmentDateTime.toLocaleTimeString(),
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

      // Send completion email to patient
      await sendAppointmentEmail(
        appointment.patient.email,
        'appointment_completed',
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.User.name,
          appointmentDate: appointment.appointmentDateTime.toLocaleDateString(),
          appointmentTime: appointment.appointmentDateTime.toLocaleTimeString(),
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

      const requestedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Don't allow booking for past dates
      if (requestedDate < today) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Cannot book appointments for past dates',
        });
      }

      // Don't allow booking for weekends
      const dayOfWeek = requestedDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
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

      const startOfDay = new Date(requestedDate);
      startOfDay.setHours(9, 0, 0, 0); // 9 AM
      const endOfDay = new Date(requestedDate);
      endOfDay.setHours(18, 0, 0, 0); // 6 PM

      // Get existing appointments for the day
      const existingAppointments = await Appointment.findAll({
        where: {
          doctorId: doctorId,
          appointmentDateTime: { [Op.between]: [startOfDay, endOfDay] },
          status: { [Op.notIn]: ['canceled', 'rejected'] }
        }
      });

      const slots = [];
      const slotDuration = 30; // 30 minutes
      const maxAppointments = type === 'physical' ? 1 : 3;

      // Generate time slots
      let currentTime = new Date(startOfDay);
      while (currentTime < endOfDay) {
        const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
        
        // Count existing appointments in this slot
        const existingCount = existingAppointments.filter(appointment => {
          const appointmentTime = new Date(appointment.appointmentDateTime);
          return appointmentTime >= currentTime && appointmentTime < slotEnd;
        }).length;

        const isAvailable = existingCount < maxAppointments;
        
        // If it's today, only show slots that are at least 1 hour from now
        let showSlot = true;
        if (requestedDate.toDateString() === today.toDateString()) {
          const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
          showSlot = currentTime >= oneHourFromNow;
        }

        if (showSlot) {
          slots.push({
            start: new Date(currentTime).toISOString(),
            end: new Date(slotEnd).toISOString(),
            time: currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }),
            available: isAvailable,
            bookedCount: existingCount,
            maxCapacity: maxAppointments
          });
        }

        currentTime = new Date(slotEnd);
      }

      res.json({
        status: 'success',
        code: 200,
        data: {
          date: date,
          doctorId: doctorId,
          type: type,
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
              attributes: ['id', 'name', 'email']
            }]
          },
          {
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email', 'phone']
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

      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const endOfToday = new Date(today.setHours(23, 59, 59, 999));
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

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
            appointmentDateTime: { [Op.between]: [startOfToday, endOfToday] }
          }
        }),
        thisWeek: await Appointment.count({
          where: {
            ...whereCondition,
            appointmentDateTime: { [Op.gte]: startOfWeek }
          }
        }),
        thisMonth: await Appointment.count({
          where: {
            ...whereCondition,
            appointmentDateTime: { [Op.gte]: startOfMonth }
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
  }
};