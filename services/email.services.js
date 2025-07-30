const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initializeTransporter();
  }

  // Initialize email transporter
  initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service connection failed:', error);
      } else {
        console.log('Email service is ready to send messages');
      }
    });
  }

  // Helper method to get user email based on role and user data
  getUserEmail(user, role = null) {
    // If user object has email directly
    if (user.email) {
      return user.email;
    }

    // If user has nested structure with Patient or Doctor
    if (user.Patient && user.Patient.email) {
      return user.Patient.email;
    }

    if (user.Doctor && user.Doctor.email) {
      return user.Doctor.email;
    }

    // If role is specified, try to get from associated model
    if (role === 'patient' && user.patient && user.patient.email) {
      return user.patient.email;
    }

    if (role === 'doctor' && user.doctor && user.doctor.email) {
      return user.doctor.email;
    }

    // If it's a direct doctor or patient object
    if (user.User && user.User.email) {
      return user.User.email;
    }

    // Fallback - this shouldn't happen in a properly structured system
    console.warn('Could not determine email for user:', user.id || 'unknown');
    return null;
  }

  // Load and compile email template
  async getTemplate(templateName) {
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName);
    }

    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateContent);
      this.templates.set(templateName, compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      console.error(`Failed to load template ${templateName}:`, error);
      return this.getDefaultTemplate(templateName);
    }
  }

  // Fallback to default templates if file not found
  getDefaultTemplate(templateName) {
    const defaultTemplates = {
      appointment_requested: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Appointment Request Submitted</h2>
          <p>Dear {{patientName}},</p>
          <p>Your appointment request has been submitted successfully.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Appointment Details:</h3>
            <p><strong>Doctor:</strong> {{doctorName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Type:</strong> {{appointmentType}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>You will receive a confirmation email once the doctor reviews and confirms your appointment.</p>
          <p>Thank you for choosing our healthcare services.</p>
        </div>
      `),

      new_appointment_request: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">New Appointment Request</h2>
          <p>Dear Dr. {{doctorName}},</p>
          <p>You have received a new appointment request.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Appointment Details:</h3>
            <p><strong>Patient:</strong> {{patientName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Type:</strong> {{appointmentType}}</p>
            <p><strong>Notes:</strong> {{notes}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>Please log in to your dashboard to confirm or reject this appointment.</p>
        </div>
      `),

      appointment_confirmed: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Appointment Confirmed</h2>
          <p>Dear {{patientName}},</p>
          <p>Great news! Your appointment has been confirmed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Appointment Details:</h3>
            <p><strong>Doctor:</strong> {{doctorName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Type:</strong> {{appointmentType}}</p>
            {{#if videoCallLink}}
            <p><strong>Video Call Link:</strong> <a href="{{videoCallLink}}">Join Call</a></p>
            {{/if}}
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>Please arrive 15 minutes early for your appointment.</p>
          <p>If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
        </div>
      `),

      appointment_rejected: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Appointment Request Rejected</h2>
          <p>Dear {{patientName}},</p>
          <p>We regret to inform you that your appointment request has been rejected.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Appointment Details:</h3>
            <p><strong>Doctor:</strong> {{doctorName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Reason:</strong> {{rejectionReason}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>You may try booking another appointment with a different time slot.</p>
        </div>
      `),

      reschedule_request_doctor: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ffc107;">Reschedule Request</h2>
          <p>Dear Dr. {{doctorName}},</p>
          <p>{{patientName}} has requested to reschedule their appointment.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Original Appointment:</h3>
            <p><strong>Date:</strong> {{originalDate}}</p>
            <p><strong>Time:</strong> {{originalTime}}</p>
            <h3>Requested New Time:</h3>
            <p><strong>Date:</strong> {{newDate}}</p>
            <p><strong>Time:</strong> {{newTime}}</p>
            <p><strong>Reason:</strong> {{rescheduleReason}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>Please log in to your dashboard to approve or reject this reschedule request.</p>
        </div>
      `),

      reschedule_request_patient: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ffc107;">Reschedule Request Submitted</h2>
          <p>Dear {{patientName}},</p>
          <p>Your reschedule request has been submitted successfully.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Original Appointment:</h3>
            <p><strong>Doctor:</strong> {{doctorName}}</p>
            <p><strong>Date:</strong> {{originalDate}}</p>
            <p><strong>Time:</strong> {{originalTime}}</p>
            <h3>Requested New Time:</h3>
            <p><strong>Date:</strong> {{newDate}}</p>
            <p><strong>Time:</strong> {{newTime}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>You will receive a notification once the doctor reviews your request.</p>
        </div>
      `),

      reschedule_approved: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Reschedule Request Approved</h2>
          <p>Dear {{patientName}},</p>
          <p>Your reschedule request has been approved!</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Updated Appointment Details:</h3>
            <p><strong>Doctor:</strong> {{doctorName}}</p>
            <p><strong>New Date:</strong> {{newDate}}</p>
            <p><strong>New Time:</strong> {{newTime}}</p>
            <p><strong>Type:</strong> {{appointmentType}}</p>
            {{#if videoCallLink}}
            <p><strong>Video Call Link:</strong> <a href="{{videoCallLink}}">Join Call</a></p>
            {{/if}}
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>Please make note of your new appointment time.</p>
        </div>
      `),

      reschedule_rejected: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Reschedule Request Rejected</h2>
          <p>Dear {{patientName}},</p>
          <p>We regret to inform you that your reschedule request has been rejected.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Original Appointment (Maintained):</h3>
            <p><strong>Doctor:</strong> {{doctorName}}</p>
            <p><strong>Date:</strong> {{originalDate}}</p>
            <p><strong>Time:</strong> {{originalTime}}</p>
            <p><strong>Rejection Reason:</strong> {{rejectionReason}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>Your original appointment time has been maintained. If you still need to reschedule, please contact us directly.</p>
        </div>
      `),

      appointment_canceled_by_patient: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Appointment Canceled by Patient</h2>
          <p>Dear {{recipientName}},</p>
          <p>{{cancelerName}} has canceled their appointment with you.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Canceled Appointment Details:</h3>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Reason:</strong> {{cancelReason}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>This time slot is now available for other patients.</p>
        </div>
      `),

      appointment_canceled_by_doctor: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Appointment Canceled by Doctor</h2>
          <p>Dear {{recipientName}},</p>
          <p>{{cancelerName}} has canceled your upcoming appointment.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Canceled Appointment Details:</h3>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Reason:</strong> {{cancelReason}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>We apologize for any inconvenience. Please contact us to schedule a new appointment.</p>
        </div>
      `),

      cancellation_confirmation_patient: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6c757d;">Appointment Cancellation Confirmed</h2>
          <p>Dear {{cancelerName}},</p>
          <p>Your appointment cancellation has been confirmed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Canceled Appointment:</h3>
            <p><strong>Doctor:</strong> {{otherPartyName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>You can book a new appointment anytime through our platform.</p>
        </div>
      `),

      cancellation_confirmation_doctor: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6c757d;">Appointment Cancellation Confirmed</h2>
          <p>Dear {{cancelerName}},</p>
          <p>The appointment cancellation has been confirmed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Canceled Appointment:</h3>
            <p><strong>Patient:</strong> {{otherPartyName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>This time slot is now available for other appointments.</p>
        </div>
      `),

      appointment_completed: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Appointment Completed</h2>
          <p>Dear {{patientName}},</p>
          <p>Your appointment with {{doctorName}} has been completed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Appointment Summary:</h3>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Consultation Notes:</strong> {{consultationNotes}}</p>
            {{#if prescription}}
            <p><strong>Prescription:</strong> {{prescription}}</p>
            {{/if}}
            <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
          </div>
          <p>Thank you for choosing our healthcare services. We hope you had a positive experience.</p>
          <p>If you have any questions about your consultation or prescription, please contact us.</p>
        </div>
      `),

      appointment_reminder: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Appointment Reminder</h2>
          <p>Dear {{patientName}},</p>
          <p>This is a friendly reminder about your upcoming appointment.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Appointment Details:</h3>
            <p><strong>Doctor:</strong> {{doctorName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Type:</strong> {{appointmentType}}</p>
            {{#if videoCallLink}}
            <p><strong>Video Call Link:</strong> <a href="{{videoCallLink}}">Join Call</a></p>
            {{/if}}
          </div>
          <p>Please arrive 15 minutes early for your appointment.</p>
          <p>If you need to reschedule or cancel, please do so as soon as possible.</p>
        </div>
      `),

      doctor_activated: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Account Activated</h2>
          <p>Dear Dr. {{doctorName}},</p>
          <p>We are pleased to inform you that your account has been successfully activated on our healthcare platform.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>What this means for you:</h3>
            <ul>
              <li>You can now receive new appointment requests from patients</li>
              <li>Your profile is visible to patients searching for healthcare providers</li>
              <li>You can manage your appointments through your dashboard</li>
              <li>You can update your availability and schedule</li>
            </ul>
          </div>
          <p>Your professional services are now available to patients in need. We appreciate your commitment to providing quality healthcare.</p>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        </div>
      `),

      doctor_suspended: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Account Suspended</h2>
          <p>Dear Dr. {{doctorName}},</p>
          <p>We regret to inform you that your account has been temporarily suspended on our healthcare platform.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>What this means:</h3>
            <ul>
              <li>You will not receive new appointment requests from patients</li>
              <li>Your profile is temporarily hidden from patient searches</li>
              <li>You cannot access your dashboard or manage appointments</li>
              <li>Existing appointments may be affected</li>
            </ul>
          </div>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3>Important Information:</h3>
            <p><strong>Reason for suspension:</strong> {{suspensionReason}}</p>
            <p><strong>Effective date:</strong> {{suspensionDate}}</p>
            {{#if reviewDate}}
            <p><strong>Review date:</strong> {{reviewDate}}</p>
            {{/if}}
          </div>
          <p>We understand this may be concerning, and we want to assure you that this is a temporary measure. Our team is committed to working with you to resolve any issues and restore your account access.</p>
          <p>If you believe this suspension is in error or have already addressed the concerns, please contact our support team immediately.</p>
        </div>
      `),

      doctor_approved: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Account Approved</h2>
          <p>Dear Dr. {{doctorName}},</p>
          <p>Congratulations! Your account has been successfully approved on our healthcare platform.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>What this means for you:</h3>
            <ul>
              <li>You can now start receiving appointment requests from patients</li>
              <li>Your profile is visible to patients searching for healthcare providers</li>
              <li>You can set up your availability and schedule</li>
              <li>You can manage your appointments through your dashboard</li>
              <li>You can update your profile and clinic information</li>
            </ul>
          </div>
          <p>We are excited to have you join our community of healthcare professionals. Your expertise will help provide quality care to patients in need.</p>
          <p>If you have any questions or need assistance with setting up your account, please don't hesitate to contact our support team.</p>
        </div>
      `),

      doctor_disapproved: handlebars.compile(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Account Disapproved</h2>
          <p>Dear Dr. {{doctorName}},</p>
          <p>We regret to inform you that your account application has been disapproved on our healthcare platform.</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>What this means:</h3>
            <ul>
              <li>Your account is currently not active on our platform</li>
              <li>You cannot receive appointment requests from patients</li>
              <li>Your profile is not visible to patients</li>
              <li>You cannot access the doctor dashboard</li>
            </ul>
          </div>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3>Important Information:</h3>
            <p><strong>Reason for disapproval:</strong> {{approvalReason}}</p>
            <p><strong>Effective date:</strong> {{approvalDate}}</p>
          </div>
          <p>We understand this may be disappointing, and we want to assure you that this decision was made after careful review of your application and supporting documentation.</p>
          <p>If you believe this decision is in error or have additional information to provide, please contact our support team immediately.</p>
        </div>
      `)
    };

    if (defaultTemplates[templateName]) {
      this.templates.set(templateName, defaultTemplates[templateName]);
      return defaultTemplates[templateName];
    }

    // Fallback generic template
    const genericTemplate = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Healthcare Notification</h2>
        <p>You have received a notification regarding your appointment.</p>
        <p>Please log in to your account for more details.</p>
      </div>
    `);
    this.templates.set(templateName, genericTemplate);
    return genericTemplate;
  }

  // Get email subject based on template type
  getEmailSubject(templateType, data = {}) {
    const subjects = {
      appointment_requested: `Appointment Request Submitted - ${data.appointmentDate}`,
      new_appointment_request: `New Appointment Request from ${data.patientName}`,
      appointment_confirmed: `Appointment Confirmed - ${data.appointmentDate}`,
      appointment_rejected: `Appointment Request Rejected - ${data.appointmentDate}`,
      reschedule_request_doctor: `Reschedule Request from ${data.patientName}`,
      reschedule_request_patient: `Reschedule Request Submitted - ${data.appointmentDate}`,
      reschedule_approved: `Reschedule Request Approved - New Date: ${data.newDate}`,
      reschedule_rejected: `Reschedule Request Rejected - ${data.appointmentDate}`,
      appointment_canceled_by_patient: `Appointment Canceled by Patient - ${data.appointmentDate}`,
      appointment_canceled_by_doctor: `Appointment Canceled - ${data.appointmentDate}`,
      cancellation_confirmation_patient: `Cancellation Confirmed - ${data.appointmentDate}`,
      cancellation_confirmation_doctor: `Cancellation Confirmed - ${data.appointmentDate}`,
      appointment_completed: `Appointment Completed - ${data.appointmentDate}`,
      appointment_reminder: `Appointment Reminder - ${data.appointmentDate}`,
      doctor_activated: `Account Activated - Welcome Back Dr. ${data.doctorName}`,
      doctor_suspended: `Account Suspended - Important Notice`,
      doctor_approved: `Account Approved - Welcome Dr. ${data.doctorName}`,
      doctor_disapproved: `Account Disapproved - Important Notice`
    };

    return subjects[templateType] || 'Healthcare Notification';
  }

  // Send appointment email - Enhanced version
  async sendAppointmentEmail(to, templateType, data, userObj = null) {
    try {
      let emailAddress = to;

      // If 'to' is not a string email, try to extract email from user object
      if (typeof to === 'object' && to !== null) {
        userObj = to;
        emailAddress = this.getUserEmail(userObj);
      }

      // If we still don't have an email, try to get it from the userObj
      if (!emailAddress && userObj) {
        emailAddress = this.getUserEmail(userObj);
      }

      if (!emailAddress || !templateType) {
        throw new Error('Email address and template type are required');
      }

      const template = await this.getTemplate(templateType);
      const htmlContent = template(data);
      const subject = this.getEmailSubject(templateType, data);

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Healthcare Platform'}" <${process.env.SMTP_USER}>`,
        to: emailAddress,
        subject: subject,
        html: htmlContent,
        // Optional: Add text version
        text: this.htmlToText(htmlContent)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${emailAddress}:`, result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        recipient: emailAddress
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send bulk emails (for notifications to multiple recipients)
  async sendBulkEmails(recipients, templateType, data) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendAppointmentEmail(
          recipient.email || recipient, 
          templateType, 
          {
            ...data,
            ...recipient.data // Allow per-recipient data override
          },
          recipient.userObj // Pass user object if available
        );
        results.push({
          email: result.recipient || recipient.email || recipient,
          ...result
        });
      } catch (error) {
        results.push({
          email: recipient.email || recipient,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Send reminder emails (can be called by a scheduler)
  async sendAppointmentReminders() {
    try {
      // Import models here to avoid circular dependency
      const User = require('../models/user.model');
      const Doctor = require('../models/doctor.model');
      const Patient = require('../models/patient.model');
      
      // You'll need to create an Appointment model
      const { Appointment } = require('../models');
      const { Op } = require('sequelize');
      
      // Get appointments for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      const upcomingAppointments = await Appointment.findAll({
        where: {
          appointmentDateTime: { [Op.between]: [startOfTomorrow, endOfTomorrow] },
          status: 'confirmed'
        },
        include: [
          { 
            model: User, 
            as: 'patient', 
            include: [{ 
              model: Patient, 
              attributes: ['email'] 
            }] 
          },
          { 
            model: Doctor, 
            as: 'doctor', 
            include: [{ 
              model: User, 
              attributes: ['name'] 
            }] 
          }
        ]
      });

      const results = [];
      for (const appointment of upcomingAppointments) {
        // Get patient email from either User or Patient model
        const patientEmail = appointment.patient.Patient?.email || appointment.patient.email;
        
        if (patientEmail) {
          const result = await this.sendAppointmentEmail(
            patientEmail,
            'appointment_reminder',
            {
              patientName: appointment.patient.name,
              doctorName: appointment.doctor.User.name,
              appointmentDate: appointment.appointmentDateTime.toLocaleDateString(),
              appointmentTime: appointment.appointmentDateTime.toLocaleTimeString(),
              appointmentType: appointment.type,
              videoCallLink: appointment.videoCallLink
            }
          );
          results.push(result);
        }
      }

      console.log(`Sent ${results.filter(r => r.success).length} reminder emails`);
      return results;
    } catch (error) {
      console.error('Failed to send appointment reminders:', error);
      return [];
    }
  }

  // Method to send email to patient
  async sendPatientEmail(patient, templateType, data) {
    const patientEmail = this.getUserEmail(patient, 'patient');
    if (!patientEmail) {
      throw new Error('Patient email not found');
    }
    return this.sendAppointmentEmail(patientEmail, templateType, data, patient);
  }

  // Method to send email to doctor
  async sendDoctorEmail(doctor, templateType, data) {
    const doctorEmail = this.getUserEmail(doctor, 'doctor');
    if (!doctorEmail) {
      throw new Error('Doctor email not found');
    }
    return this.sendAppointmentEmail(doctorEmail, templateType, data, doctor);
  }

  // Convert HTML to plain text (basic implementation)
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Test email configuration
  async testEmailConfiguration() {
    try {
      const testResult = await this.transporter.verify();
      console.log('Email configuration test passed:', testResult);
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export the service and functions for backward compatibility
module.exports = {
  emailService,
  sendAppointmentEmail: (to, templateType, data, userObj) => emailService.sendAppointmentEmail(to, templateType, data, userObj),
  sendBulkEmails: (recipients, templateType, data) => emailService.sendBulkEmails(recipients, templateType, data),
  sendAppointmentReminders: () => emailService.sendAppointmentReminders(),
  sendPatientEmail: (patient, templateType, data) => emailService.sendPatientEmail(patient, templateType, data),
  sendDoctorEmail: (doctor, templateType, data) => emailService.sendDoctorEmail(doctor, templateType, data),
  testEmailConfiguration: () => emailService.testEmailConfiguration()
};