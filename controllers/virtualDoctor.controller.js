const User = require("../models/user.model");
const Appointment = require("../models/appoinment.model");
const Doctor = require("../models/doctor.model");
const VirtualDoctor = require("../models/virtualDoctor.model");
const AdminSetting = require("../models/adminSetting.model");
const Price = require("../models/price.model");
const { Op } = require('sequelize');
const { emailService } = require('../services/email.services');
const { DateTime } = require('luxon');
const azureStorageService = require('../services/azureStorage.service');

// Helper function to upload image to Azure Blob Storage
const uploadImage = async (file) => {
  try {
    const result = await azureStorageService.uploadFile(file, 'virtual-doctor-images');
    return result.url;
  } catch (error) {
    console.error('Error uploading image to Azure Storage:', error.message);
    throw new Error('Image upload failed');
  }
};

// Create virtual doctor function
exports.createVirtualDoctor = async (req, res) => {
  try {
    // Accept data from form-data (multipart/form-data) or JSON
    // Normalize all fields to string and trim
    const getString = (val) => (typeof val === 'string' ? val.trim() : (val !== undefined && val !== null ? String(val).trim() : ''));
    const name = getString(req.body.name);
    const phone = getString(req.body.phone);
    const password = getString(req.body.password);
    const gender = getString(req.body.gender);
    const specialty = getString(req.body.specialty) || 'General Medicine';
    const degree = getString(req.body.degree) || 'MBBS';
    const yearsOfExperience = req.body.yearsOfExperience !== undefined && req.body.yearsOfExperience !== null
      ? parseInt(req.body.yearsOfExperience)
      : 0;
    const clinicName = getString(req.body.clinicName) || 'Virtual Clinic';
    const clinicContactNumber = getString(req.body.clinicContactNumber) || phone;
    const email = getString(req.body.email) || (phone ? `${phone}@virtual.com` : undefined);
    const address = getString(req.body.address) || 'Virtual Address';
    const country = getString(req.body.country) || 'India';
    const state = getString(req.body.state) || 'Virtual State';
    const city = getString(req.body.city) || 'Virtual City';
    const locationPin = getString(req.body.locationPin) || '000000';
    const startTime = getString(req.body.startTime) || '09:00:00';
    const endTime = getString(req.body.endTime) || '18:00:00';
    const registrationNumber = getString(req.body.registrationNumber) || `VIRTUAL-${Date.now()}`;

    // Debug: Log the request files
    console.log('🔍 Debug - req.files:', req.files);
    console.log('🔍 Debug - req.file:', req.file);
    console.log('🔍 Debug - req.body:', req.body);

    // Handle doctor photo upload if provided
    let doctorPhotoUrl = null;
    if (req.files && req.files.doctorPhoto && req.files.doctorPhoto[0]) {
      console.log('📸 Processing doctor photo upload...');
      try {
        doctorPhotoUrl = await uploadImage(req.files.doctorPhoto[0]);
        console.log('✅ Doctor photo uploaded successfully:', doctorPhotoUrl);
      } catch (uploadError) {
        console.error('❌ Doctor photo upload failed:', uploadError);
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Failed to upload doctor photo",
          error: uploadError.message,
          data: null
        });
      }
    } else {
      console.log('ℹ️ No doctor photo provided');
    }

    // Validate required fields
    if (!name || !phone || !password || !gender) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Name, phone, password, and gender are required",
        data: null
      });
    }

    // Validate phone number (must be 10 digits, Indian mobile)
    const phoneDigits = phone.replace(/^\+?91/, '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Please provide a valid 10-digit Indian mobile number (without country code)",
        data: null
      });
    }

    // Check if phone number already exists
    const existingUser = await User.findOne({ where: { phone: phoneDigits } });
    if (existingUser) {
      return res.status(409).json({
        status: "error",
        code: 409,
        message: "Phone number already registered",
        data: null
      });
    }

    // Create virtual doctor user
    const virtualDoctorUser = await User.create({
      name,
      phone: phoneDigits,
      password,
      gender,
      role: 'virtual-doctor'
    });

    // Debug: Log what we're about to store
    console.log('💾 Creating virtual doctor with doctorPhoto:', doctorPhotoUrl);

    // Create virtual doctor record in VirtualDoctor table
    const virtualDoctor = await VirtualDoctor.create({
      userId: virtualDoctorUser.id,
      doctorPhoto: doctorPhotoUrl, // Include doctor photo URL
      clinicName,
      clinicPhotos: null,
      yearsOfExperience: isNaN(yearsOfExperience) ? 0 : yearsOfExperience,
      specialty,
      degree,
      registrationNumber,
      clinicContactNumber,
      email,
      address,
      country,
      state,
      city,
      locationPin,
      startTime,
      endTime,
      isApproved: true, // Auto-approve virtual doctors
      is_active: true
    });

    console.log('✅ Virtual doctor created with ID:', virtualDoctor.id);
    console.log('📸 Stored doctorPhoto URL:', virtualDoctor.doctorPhoto);

    // Send welcome email to virtual doctor
    try {
      await emailService.sendWelcomeEmail({
        email: email,
        name: name,
        role: 'virtual-doctor',
        credentials: {
          phone: phoneDigits,
          password: password
        }
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if email fails
    }

    // Fetch the complete virtual doctor data with user information
    const completeVirtualDoctor = await VirtualDoctor.findByPk(virtualDoctor.id, {
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'phone', 'gender', 'role', 'createdAt']
      }]
    });

    res.status(201).json({
      status: "success",
      code: 201,
      message: "Virtual doctor created successfully",
      data: {
        id: completeVirtualDoctor.id,
        userId: completeVirtualDoctor.userId,
        name: completeVirtualDoctor.User.name,
        phone: completeVirtualDoctor.User.phone,
        role: completeVirtualDoctor.User.role,
        gender: completeVirtualDoctor.User.gender,
        specialty: completeVirtualDoctor.specialty,
        degree: completeVirtualDoctor.degree,
        registrationNumber: completeVirtualDoctor.registrationNumber,
        clinicName: completeVirtualDoctor.clinicName,
        isApproved: completeVirtualDoctor.isApproved,
        is_active: completeVirtualDoctor.is_active,
        createdAt: completeVirtualDoctor.User.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating virtual doctor:', error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: error.message || "Internal Server Error",
      data: null
    });
  }
};

// Get all virtual doctors with pagination
exports.getAllVirtualDoctors = async (req, res) => {
  try {
    // Pagination
    let { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Search conditions - search in both virtual doctor and user fields
    const virtualDoctorWhere = {};
    const userWhere = {};
    
    if (search) {
      userWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
      virtualDoctorWhere[Op.or] = [
        { specialty: { [Op.iLike]: `%${search}%` } },
        { clinicName: { [Op.iLike]: `%${search}%` } },
        { degree: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Sorting - Always ensure DESC order for recent first
    let order = [];
    if (sortBy === 'name' || sortBy === 'phone' || sortBy === 'createdAt') {
      // For name and phone, if ASC is requested, still add createdAt DESC as secondary sort
      if (sortOrder.toUpperCase() === 'ASC' && (sortBy === 'name' || sortBy === 'phone')) {
        order.push([{ model: User, as: 'User' }, sortBy, 'ASC'], ['createdAt', 'DESC']);
      } else {
        order.push([{ model: User, as: 'User' }, sortBy, sortOrder.toUpperCase()]);
      }
    } else if (sortBy === 'specialty' || sortBy === 'clinicName' || sortBy === 'degree') {
      // For doctor fields, if ASC is requested, still add createdAt DESC as secondary sort
      if (sortOrder.toUpperCase() === 'ASC') {
        order.push([sortBy, 'ASC'], ['createdAt', 'DESC']);
      } else {
        order.push([sortBy, sortOrder.toUpperCase()]);
      }
    } else {
      order.push(['createdAt', 'DESC']);
    }

    // Fetch virtual doctors with pagination from VirtualDoctor table
    const { count, rows: virtualDoctors } = await VirtualDoctor.findAndCountAll({
      where: virtualDoctorWhere,
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'phone', 'role', 'fcmToken', 'notificationEnabled', 'gender', 'createdAt', 'updatedAt'],
        where: Object.keys(userWhere).length ? userWhere : undefined
      }],
      order,
      limit,
      offset,
    });

    // Transform the data to include both virtual doctor and user information
    const transformedVirtualDoctors = virtualDoctors.map(doctor => ({
      // VirtualDoctor model fields
      id: doctor.id,
      userId: doctor.userId,
      doctorPhoto: doctor.doctorPhoto,
      degree: doctor.degree,
      registrationNumber: doctor.registrationNumber,
      clinicName: doctor.clinicName,
      clinicPhotos: doctor.clinicPhotos,
      yearsOfExperience: doctor.yearsOfExperience,
      specialty: doctor.specialty,
      subSpecialties: doctor.subSpecialties,
      clinicContactNumber: doctor.clinicContactNumber,
      email: doctor.email,
      address: doctor.address,
      country: doctor.country,
      state: doctor.state,
      city: doctor.city,
      locationPin: doctor.locationPin,
      isApproved: doctor.isApproved,
      is_active: doctor.is_active,
      startTime: doctor.startTime,
      endTime: doctor.endTime,
      consultationFee: doctor.consultationFee,
      languages: doctor.languages,
      timezone: doctor.timezone,
      maxPatientsPerDay: doctor.maxPatientsPerDay,
      averageConsultationTime: doctor.averageConsultationTime,
      bio: doctor.bio,
      qualifications: doctor.qualifications,
      virtualConsultationTypes: doctor.virtualConsultationTypes,
      isAvailableForEmergency: doctor.isAvailableForEmergency,
      emergencyFee: doctor.emergencyFee,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
      
      // User model fields
      name: doctor.User.name,
      phone: doctor.User.phone,
      role: doctor.User.role,
      fcmToken: doctor.User.fcmToken,
      notificationEnabled: doctor.User.notificationEnabled,
      gender: doctor.User.gender,
      userCreatedAt: doctor.User.createdAt,
      userUpdatedAt: doctor.User.updatedAt
    }));

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Virtual doctors retrieved successfully",
      data: transformedVirtualDoctors,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching virtual doctors:', error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};

// Get virtual APIs with pagination
exports.getVirtualApis = async (req, res) => {
  try {
    // Pagination
    let { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Mock virtual APIs data (in a real application, this would come from a database)
    const virtualApis = [
      {
        id: 1,
        name: "Patient Consultation API",
        description: "API for virtual patient consultations and medical advice",
        endpoint: "/api/virtual/consultation",
        method: "POST",
        category: "Consultation",
        isActive: true,
        createdAt: new Date('2024-01-15T10:00:00.000Z')
      },
      {
        id: 2,
        name: "Medical History API",
        description: "API to access and update patient medical history",
        endpoint: "/api/virtual/medical-history",
        method: "GET",
        category: "Medical Records",
        isActive: true,
        createdAt: new Date('2024-01-15T11:00:00.000Z')
      },
      {
        id: 3,
        name: "Prescription API",
        description: "API for creating and managing prescriptions",
        endpoint: "/api/virtual/prescription",
        method: "POST",
        category: "Prescription",
        isActive: true,
        createdAt: new Date('2024-01-15T12:00:00.000Z')
      },
      {
        id: 4,
        name: "Appointment Scheduling API",
        description: "API for scheduling virtual appointments",
        endpoint: "/api/virtual/appointment",
        method: "POST",
        category: "Appointment",
        isActive: true,
        createdAt: new Date('2024-01-15T13:00:00.000Z')
      },
      {
        id: 5,
        name: "Diagnostic Tools API",
        description: "API for accessing diagnostic tools and tests",
        endpoint: "/api/virtual/diagnostic",
        method: "GET",
        category: "Diagnostic",
        isActive: true,
        createdAt: new Date('2024-01-15T14:00:00.000Z')
      },
      {
        id: 6,
        name: "Patient Communication API",
        description: "API for secure patient communication",
        endpoint: "/api/virtual/communication",
        method: "POST",
        category: "Communication",
        isActive: true,
        createdAt: new Date('2024-01-15T15:00:00.000Z')
      },
      {
        id: 7,
        name: "Medical Reports API",
        description: "API for generating and accessing medical reports",
        endpoint: "/api/virtual/reports",
        method: "GET",
        category: "Reports",
        isActive: true,
        createdAt: new Date('2024-01-15T16:00:00.000Z')
      },
      {
        id: 8,
        name: "Emergency Contact API",
        description: "API for emergency contact management",
        endpoint: "/api/virtual/emergency",
        method: "POST",
        category: "Emergency",
        isActive: true,
        createdAt: new Date('2024-01-15T17:00:00.000Z')
      },
      {
        id: 9,
        name: "Health Monitoring API",
        description: "API for real-time health monitoring",
        endpoint: "/api/virtual/monitoring",
        method: "GET",
        category: "Monitoring",
        isActive: true,
        createdAt: new Date('2024-01-15T18:00:00.000Z')
      },
      {
        id: 10,
        name: "Referral Management API",
        description: "API for managing patient referrals",
        endpoint: "/api/virtual/referral",
        method: "POST",
        category: "Referral",
        isActive: true,
        createdAt: new Date('2024-01-15T19:00:00.000Z')
      }
    ];

    // Filter by search term
    let filteredApis = virtualApis;
    if (search) {
      filteredApis = virtualApis.filter(api => 
        api.name.toLowerCase().includes(search.toLowerCase()) ||
        api.description.toLowerCase().includes(search.toLowerCase()) ||
        api.category.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort the data - Always ensure DESC order for recent first
    if (sortBy === 'name') {
      filteredApis.sort((a, b) => {
        if (sortOrder === 'ASC') {
          // For ASC name sort, add secondary sort by createdAt DESC
          const nameCompare = a.name.localeCompare(b.name);
          return nameCompare !== 0 ? nameCompare : new Date(b.createdAt) - new Date(a.createdAt);
        } else {
          return b.name.localeCompare(a.name);
        }
      });
    } else if (sortBy === 'category') {
      filteredApis.sort((a, b) => {
        if (sortOrder === 'ASC') {
          // For ASC category sort, add secondary sort by createdAt DESC
          const categoryCompare = a.category.localeCompare(b.category);
          return categoryCompare !== 0 ? categoryCompare : new Date(b.createdAt) - new Date(a.createdAt);
        } else {
          return b.category.localeCompare(a.category);
        }
      });
    } else {
      // Default sort by createdAt - always DESC for recent first
      filteredApis.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    // Apply pagination
    const total = filteredApis.length;
    const paginatedApis = filteredApis.slice(offset, offset + limit);

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Virtual APIs retrieved successfully",
      data: paginatedApis,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching virtual APIs:', error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};

// Delete virtual doctor
exports.deleteVirtualDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting virtual doctor with ID:', id);

    // First find the virtual doctor record by ID
    const virtualDoctorRecord = await VirtualDoctor.findByPk(id, {
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'phone', 'role']
      }]
    });

    console.log('🔍 Virtual doctor record found:', virtualDoctorRecord ? 'Yes' : 'No');
    if (virtualDoctorRecord) {
      console.log('📋 Virtual doctor details:', {
        id: virtualDoctorRecord.id,
        name: virtualDoctorRecord.User?.name,
        userId: virtualDoctorRecord.userId
      });
    }

    if (!virtualDoctorRecord) {
      console.log('❌ Virtual doctor not found with ID:', id);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Virtual doctor not found",
        data: null
      });
    }

    // Get the associated user ID
    const userId = virtualDoctorRecord.userId;

    // Delete the virtual doctor record first
    await virtualDoctorRecord.destroy();

    // Then delete the associated user record
    const user = await User.findByPk(userId);
    if (user) {
      await user.destroy();
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Virtual doctor deleted successfully",
      data: null
    });
  } catch (error) {
    console.error('Error deleting virtual doctor:', error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};

// Get virtual appointments with filters and pagination
exports.getVirtualAppointments = async (req, res) => {
  try {
    // Pagination
    let { 
      page = 1, 
      limit = 10, 
      status = '', 
      fromDate = '', 
      toDate = '',
      sortBy = 'appointmentDateTime', 
      sortOrder = 'DESC' 
    } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Get the virtual doctor ID from the authenticated user
    const virtualDoctor = await VirtualDoctor.findOne({
      where: { userId: req.user.id }
    });

    if (!virtualDoctor) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Virtual doctor profile not found",
        data: null
      });
    }

    // Build where conditions - only virtual appointments for this specific virtual doctor
    const where = {
      type: 'virtual', // Only virtual appointments
      virtualDoctorId: virtualDoctor.id // Only appointments assigned to this virtual doctor
    };

    // Status filter
    if (status) {
      where.status = status;
    }

    // Date range filter
    if (fromDate || toDate) {
      where.appointmentDateTime = {};
      if (fromDate) {
        // Ensure fromDate starts at beginning of day
        const fromDateObj = new Date(fromDate);
        fromDateObj.setHours(0, 0, 0, 0);
        where.appointmentDateTime[Op.gte] = fromDateObj;
      }
      if (toDate) {
        // Ensure toDate ends at end of day
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        where.appointmentDateTime[Op.lte] = toDateObj;
      }
    }

    // Sorting - Always ensure DESC order for recent first
    let order = [];
    if (['appointmentDateTime', 'createdAt', 'bookingDate'].includes(sortBy)) {
      // For appointmentDateTime and bookingDate, if ASC is requested, still add createdAt DESC as secondary sort
      if (sortOrder.toUpperCase() === 'ASC' && (sortBy === 'appointmentDateTime' || sortBy === 'bookingDate')) {
        order.push([sortBy, 'ASC'], ['createdAt', 'DESC']);
      } else {
        order.push([sortBy, sortOrder.toUpperCase()]);
      }
    } else {
      order.push(['appointmentDateTime', 'DESC']);
    }

    // Fetch appointments with pagination
    const { count, rows: appointments } = await Appointment.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'phone']
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'name', 'phone']
            }
          ]
        }
      ],
      order,
      limit,
      offset,
      distinct: true
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Virtual appointments retrieved successfully",
      data: {
        appointments,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching virtual appointments:', error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
}; 

 

// Get video call credentials for virtual doctor
exports.getVideoCallCredentials = async (req, res) => {
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

    // Use stored doctor token for virtual appointments
    const { CommunicationIdentityClient } = require('@azure/communication-identity');
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

    let virtualDoctorToken = null;
    let virtualDoctorUserId = null;

    // For virtual appointments, use the stored doctor token
    if (appointment.azureDoctorUserId && appointment.azureDoctorToken) {
      const now = new Date();
      // Check if token is expired and refresh if needed
      if (new Date(appointment.azureDoctorTokenExpiry) <= now) {
        const newDoctorToken = await communicationIdentityClient.getToken(
          { communicationUserId: appointment.azureDoctorUserId },
          ["voip"]
        );
        virtualDoctorToken = newDoctorToken.token;
        virtualDoctorUserId = appointment.azureDoctorUserId;
        appointment.azureDoctorToken = newDoctorToken.token;
        appointment.azureDoctorTokenExpiry = newDoctorToken.expiresOn;
        await appointment.save();
      } else {
        virtualDoctorToken = appointment.azureDoctorToken;
        virtualDoctorUserId = appointment.azureDoctorUserId;
      }
    } else {
      // Fallback: create new token if stored token doesn't exist
      const virtualDoctorCommUser = await createAzureCommUser();
      virtualDoctorUserId = virtualDoctorCommUser.userId;
      virtualDoctorToken = virtualDoctorCommUser.token;
      // Store the new token for future use
      appointment.azureDoctorUserId = virtualDoctorCommUser.userId;
      appointment.azureDoctorToken = virtualDoctorCommUser.token;
      appointment.azureDoctorTokenExpiry = virtualDoctorCommUser.expiresOn;
      await appointment.save();
    }

    const credentials = {
      roomId: appointment.roomId,
      userId: virtualDoctorUserId,
      token: virtualDoctorToken,
      userRole: 'virtual-doctor',
      appointmentId: appointment.id,
      participantName: req.user.name
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
}; 

// Get available time slots for virtual appointments
exports.getVirtualAppointmentSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Date parameter is required',
      });
    }

    // Get admin settings for virtual appointment times
    const adminSetting = await AdminSetting.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']] // Get the most recent active setting
    });

    if (!adminSetting) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Virtual appointment settings not configured',
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

    // REMOVED: Weekend restrictions - virtual appointments now available on weekends
    // const dayOfWeek = requestedDate.weekday; // 1 = Monday, 7 = Sunday
    // if (dayOfWeek === 6 || dayOfWeek === 7) {
    //   return res.json({
    //     status: 'success',
    //     code: 200,
    //     data: {
    //       date: date,
    //       slots: [],
    //       message: 'No virtual appointments available on weekends'
    //     }
    //   });
    // }

    // Parse admin's virtual appointment working hours
    const [startHour, startMinute] = adminSetting.virtualAppointmentStartTime.split(':').map(Number);
    const [endHour, endMinute] = adminSetting.virtualAppointmentEndTime.split(':').map(Number);

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
        message: 'Invalid virtual appointment hours configuration',
      });
    }

    // Get existing virtual appointments for the day
    const existingAppointments = await Appointment.findAll({
      where: {
        type: 'virtual',
        appointmentDateTime: { [Op.between]: [startOfDay.toJSDate(), endOfDay.toJSDate()] },
        status: { [Op.notIn]: ['canceled', 'rejected'] }
      }
    });

    const slots = [];
    const slotDuration = 30; // 30 minutes

    // Generate time slots using IST based on admin's virtual appointment hours
    let currentTime = startOfDay;
    while (currentTime < endOfDay) {
      const slotEnd = currentTime.plus({ minutes: slotDuration });

      // Don't create a slot if it would extend beyond end time
      if (slotEnd > endOfDay) {
        break;
      }

      // Check if there's an existing appointment in this slot
      const existingAppointment = existingAppointments.find(appointment => {
        const appointmentIST = DateTime.fromJSDate(appointment.appointmentDateTime).setZone('Asia/Kolkata');
        return appointmentIST >= currentTime && appointmentIST < slotEnd;
      });

      const isAvailable = !existingAppointment;

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
          bookedCount: existingAppointment ? 1 : 0,
          maxCapacity: 1
        });
      }

      currentTime = slotEnd;
    }

    res.json({
      status: 'success',
      code: 200,
      data: {
        date: date,
        type: 'virtual',
        workingHours: {
          start: adminSetting.virtualAppointmentStartTime,
          end: adminSetting.virtualAppointmentEndTime
        },
        slots: slots
      }
    });
  } catch (error) {
    console.error('Get Virtual Appointment Slots Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
    });
  }
}; 

// Book virtual appointment
exports.bookVirtualAppointment = async (req, res) => {
  try {
    const { userId, appointmentDateTime, notes } = req.body;

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
    if (!user || user.role !== 'user') {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid user account',
      });
    }

    // Get admin settings for virtual appointment times
    const adminSetting = await AdminSetting.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']] // Get the most recent active setting
    });

    if (!adminSetting) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Virtual appointment settings not configured',
      });
    }

    // Parse admin's virtual appointment working hours
    const [startHour, startMinute] = adminSetting.virtualAppointmentStartTime.split(':').map(Number);
    const [endHour, endMinute] = adminSetting.virtualAppointmentEndTime.split(':').map(Number);

    const appointmentDay = requestedTime.weekday; // 1 = Monday, 7 = Sunday
    const appointmentHour = requestedTime.hour;
    const appointmentMinute = requestedTime.minute;

    // REMOVED: Weekend restrictions - virtual appointments now available on weekends
    // if (appointmentDay === 6 || appointmentDay === 7) {
    //   return res.status(400).json({
    //     status: 'error',
    //     code: 400,
    //     message: 'Virtual appointments are not available on weekends',
    //   });
    // }

    // Check if appointment is within admin's configured working hours
    const appointmentTime = appointmentHour * 60 + appointmentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (appointmentTime < startTime || appointmentTime >= endTime) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: `Virtual appointments are only available between ${adminSetting.virtualAppointmentStartTime} and ${adminSetting.virtualAppointmentEndTime}`,
      });
    }

    // Check time slot availability (30-minute blocks)
    const slotStart = requestedTime.set({ minute: Math.floor(requestedTime.minute / 30) * 30, second: 0, millisecond: 0 });
    const slotEnd = slotStart.plus({ minutes: 30 });

    // Check existing virtual appointments in this slot
    const existingAppointment = await Appointment.findOne({
      where: {
        type: 'virtual',
        doctorId: null,
        appointmentDateTime: {
          [Op.between]: [slotStart.toJSDate(), slotEnd.toJSDate()]
        },
        status: { [Op.notIn]: ['canceled', 'completed', 'rejected'] }
      }
    });

    if (existingAppointment) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Time slot is already booked. Please choose another time.',
      });
    }

    // Check if user already has a virtual appointment on same date
    const dayStart = requestedTime.startOf('day');
    const dayEnd = requestedTime.endOf('day');

    const existingUserAppointment = await Appointment.findOne({
      where: {
        userId,
        type: 'virtual',
        doctorId: null,
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
        message: 'You already have a virtual appointment on the selected date',
      });
    }

    // Get virtual appointment price
    const virtualAppointmentPrice = await Price.findOne({
      where: { serviceName: 'Virtual Appointment', isActive: true }
    });

    if (!virtualAppointmentPrice || !virtualAppointmentPrice.price) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Virtual appointment pricing is not configured. Please contact admin.',
      });
    }

    // Build appointment data
    const appointmentData = {
      userId,
      doctorId: null, // Virtual appointments have doctorId = null
      appointmentDateTime: requestedTime.toJSDate(),
      type: 'virtual',
      status: 'pending',
      notes,
      bookingDate: new Date(),
      paymentRequired: true,
      paymentStatus: 'pending',
      paymentAmount: parseFloat(virtualAppointmentPrice.price)
    };

    // Setup video call for virtual appointment
    try {
      const { v4: uuidv4 } = require('uuid');
      const { CommunicationIdentityClient } = require('@azure/communication-identity');
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

    // Save appointment
    const appointment = await Appointment.create(appointmentData);

    // Send notification to admin about new virtual appointment
    try {
      await emailService.sendNewVirtualAppointmentNotification({
        appointmentId: appointment.id,
        patientName: user.name,
        appointmentDateTime: requestedTime.toFormat('dd/MM/yyyy hh:mm a'),
        notes: notes || 'No notes provided'
      });
    } catch (emailError) {
      console.error('Failed to send virtual appointment notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Virtual appointment booked successfully. Payment required to confirm appointment.',
      data: {
        id: appointment.id,
        appointmentDateTime: requestedTime.toISO(),
        type: 'virtual',
        status: 'pending',
        videoCallLink: appointment.videoCallLink,
        roomId: appointment.roomId,
        paymentRequired: true,
        paymentStatus: 'pending',
        paymentAmount: parseFloat(virtualAppointmentPrice.price),
        currency: 'INR',
        nextStep: 'payment_required'
      }
    });
  } catch (error) {
    console.error('Book Virtual Appointment Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
    });
  }
};

// Update virtual doctor
exports.updateVirtualDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Normalize all fields to string and trim
    const getString = (val) => (typeof val === 'string' ? val.trim() : (val !== undefined && val !== null ? String(val).trim() : ''));
    
    // Extract update data from request body
    const updateData = {};
    const userUpdateData = {};
    
    // Fields that can be updated in VirtualDoctor table
    if (req.body.specialty !== undefined) updateData.specialty = getString(req.body.specialty);
    if (req.body.degree !== undefined) updateData.degree = getString(req.body.degree);
    if (req.body.yearsOfExperience !== undefined) {
      updateData.yearsOfExperience = parseInt(req.body.yearsOfExperience) || 0;
    }
    if (req.body.clinicName !== undefined) updateData.clinicName = getString(req.body.clinicName);
    if (req.body.clinicContactNumber !== undefined) updateData.clinicContactNumber = getString(req.body.clinicContactNumber);
    if (req.body.email !== undefined) updateData.email = getString(req.body.email);
    if (req.body.address !== undefined) updateData.address = getString(req.body.address);
    if (req.body.country !== undefined) updateData.country = getString(req.body.country);
    if (req.body.state !== undefined) updateData.state = getString(req.body.state);
    if (req.body.city !== undefined) updateData.city = getString(req.body.city);
    if (req.body.locationPin !== undefined) updateData.locationPin = getString(req.body.locationPin);
    if (req.body.startTime !== undefined) updateData.startTime = getString(req.body.startTime);
    if (req.body.endTime !== undefined) updateData.endTime = getString(req.body.endTime);
    if (req.body.registrationNumber !== undefined) updateData.registrationNumber = getString(req.body.registrationNumber);
    if (req.body.isApproved !== undefined) updateData.isApproved = req.body.isApproved === 'true' || req.body.isApproved === true;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active === 'true' || req.body.is_active === true;
    
    // Fields that can be updated in User table
    if (req.body.name !== undefined) userUpdateData.name = getString(req.body.name);
    if (req.body.phone !== undefined) {
      const phone = getString(req.body.phone);
      const phoneDigits = phone.replace(/^\+?91/, '').replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Please provide a valid 10-digit Indian mobile number (without country code)",
          data: null
        });
      }
      userUpdateData.phone = phoneDigits;
    }
    if (req.body.gender !== undefined) userUpdateData.gender = getString(req.body.gender);
    if (req.body.password !== undefined) userUpdateData.password = getString(req.body.password);

    // Debug: Log the request files
    console.log('🔍 Debug - req.files:', req.files);
    console.log('🔍 Debug - req.file:', req.file);
    console.log('🔍 Debug - req.body:', req.body);

    // Handle doctor photo upload if provided
    if (req.files && req.files.doctorPhoto && req.files.doctorPhoto[0]) {
      console.log('📸 Processing doctor photo upload...');
      try {
        const doctorPhotoUrl = await uploadImage(req.files.doctorPhoto[0]);
        updateData.doctorPhoto = doctorPhotoUrl;
        console.log('✅ Doctor photo uploaded successfully:', doctorPhotoUrl);
      } catch (uploadError) {
        console.error('❌ Doctor photo upload failed:', uploadError);
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Failed to upload doctor photo",
          error: uploadError.message,
          data: null
        });
      }
    }

    // Find the virtual doctor record
    const virtualDoctor = await VirtualDoctor.findByPk(id, {
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'phone', 'gender', 'role', 'createdAt']
      }]
    });

    if (!virtualDoctor) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Virtual doctor not found",
        data: null
      });
    }

    // Check if phone number is being updated and if it already exists for another user
    if (userUpdateData.phone && userUpdateData.phone !== virtualDoctor.User.phone) {
      const existingUser = await User.findOne({ 
        where: { 
          phone: userUpdateData.phone,
          id: { [Op.ne]: virtualDoctor.userId }
        } 
      });
      if (existingUser) {
        return res.status(409).json({
          status: "error",
          code: 409,
          message: "Phone number already registered to another user",
          data: null
        });
      }
    }

    // Update virtual doctor record if there's data to update
    if (Object.keys(updateData).length > 0) {
      await virtualDoctor.update(updateData);
      console.log('✅ Virtual doctor record updated');
    }

    // Update user record if there's data to update
    if (Object.keys(userUpdateData).length > 0) {
      await virtualDoctor.User.update(userUpdateData);
      console.log('✅ User record updated');
    }

    // Fetch the updated virtual doctor data
    const updatedVirtualDoctor = await VirtualDoctor.findByPk(id, {
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'phone', 'gender', 'role', 'createdAt']
      }]
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Virtual doctor updated successfully",
      data: {
        id: updatedVirtualDoctor.id,
        userId: updatedVirtualDoctor.userId,
        name: updatedVirtualDoctor.User.name,
        phone: updatedVirtualDoctor.User.phone,
        role: updatedVirtualDoctor.User.role,
        gender: updatedVirtualDoctor.User.gender,
        doctorPhoto: updatedVirtualDoctor.doctorPhoto,
        specialty: updatedVirtualDoctor.specialty,
        degree: updatedVirtualDoctor.degree,
        yearsOfExperience: updatedVirtualDoctor.yearsOfExperience,
        registrationNumber: updatedVirtualDoctor.registrationNumber,
        clinicName: updatedVirtualDoctor.clinicName,
        clinicContactNumber: updatedVirtualDoctor.clinicContactNumber,
        email: updatedVirtualDoctor.email,
        address: updatedVirtualDoctor.address,
        country: updatedVirtualDoctor.country,
        state: updatedVirtualDoctor.state,
        city: updatedVirtualDoctor.city,
        locationPin: updatedVirtualDoctor.locationPin,
        startTime: updatedVirtualDoctor.startTime,
        endTime: updatedVirtualDoctor.endTime,
        isApproved: updatedVirtualDoctor.isApproved,
        is_active: updatedVirtualDoctor.is_active,
        createdAt: updatedVirtualDoctor.User.createdAt,
        updatedAt: updatedVirtualDoctor.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating virtual doctor:', error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: error.message || "Internal Server Error",
      data: null
    });
  }
};

// Get virtual doctor details by ID
exports.getVirtualDoctorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Fetching virtual doctor details for ID:', id);

    // Find the virtual doctor record with user information
    const virtualDoctor = await VirtualDoctor.findByPk(id, {
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'phone', 'gender', 'role', 'createdAt', 'notificationEnabled']
      }]
    });

    if (!virtualDoctor) {
      console.log('❌ Virtual doctor not found with ID:', id);
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Virtual doctor not found",
        data: null
      });
    }

    console.log('✅ Virtual doctor found:', virtualDoctor.User.name);

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Virtual doctor details retrieved successfully",
      data: {
        id: virtualDoctor.id,
        userId: virtualDoctor.userId,
        name: virtualDoctor.User.name,
        phone: virtualDoctor.User.phone,
        role: virtualDoctor.User.role,
        gender: virtualDoctor.User.gender,
        doctorPhoto: virtualDoctor.doctorPhoto,
        specialty: virtualDoctor.specialty,
        degree: virtualDoctor.degree,
        yearsOfExperience: virtualDoctor.yearsOfExperience,
        registrationNumber: virtualDoctor.registrationNumber,
        clinicName: virtualDoctor.clinicName,
        clinicContactNumber: virtualDoctor.clinicContactNumber,
        email: virtualDoctor.email,
        address: virtualDoctor.address,
        country: virtualDoctor.country,
        state: virtualDoctor.state,
        city: virtualDoctor.city,
        locationPin: virtualDoctor.locationPin,
        startTime: virtualDoctor.startTime,
        endTime: virtualDoctor.endTime,
        isApproved: virtualDoctor.isApproved,
        is_active: virtualDoctor.is_active,
        createdAt: virtualDoctor.User.createdAt,
        updatedAt: virtualDoctor.updatedAt,
        notificationEnabled: virtualDoctor.User.notificationEnabled
      }
    });
  } catch (error) {
    console.error('Error fetching virtual doctor details:', error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: error.message || "Internal Server Error",
      data: null
    });
  }
}; 