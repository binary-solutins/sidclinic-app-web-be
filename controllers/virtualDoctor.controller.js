const User = require("../models/user.model");
const Appointment = require("../models/appoinment.model");
const Doctor = require("../models/doctor.model");
const { Op } = require('sequelize');
const { emailService } = require('../services/email.services');

// Create virtual doctor function
exports.createVirtualDoctor = async (req, res) => {
  try {
    const { name, phone, password, gender } = req.body;

    // Validate required fields
    if (!name || !phone || !password || !gender) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Name, phone, password, and gender are required",
        data: null
      });
    }

    // Check if phone number already exists
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(409).json({
        status: "error",
        code: 409,
        message: "Phone number already registered",
        data: null
      });
    }

    // Create virtual doctor
    const virtualDoctor = await User.create({
      name,
      phone,
      password,
      gender,
      role: 'virtual-doctor'
    });

    // Send welcome email to virtual doctor
    try {
      await emailService.sendWelcomeEmail({
        email: phone, // Using phone as email for now
        name: name,
        role: 'virtual-doctor',
        credentials: {
          phone: phone,
          password: password
        }
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      status: "success",
      code: 201,
      message: "Virtual doctor created successfully",
      data: {
        id: virtualDoctor.id,
        name: virtualDoctor.name,
        phone: virtualDoctor.phone,
        role: virtualDoctor.role,
        gender: virtualDoctor.gender,
        createdAt: virtualDoctor.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating virtual doctor:', error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
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

    // Search conditions
    const where = { role: 'virtual-doctor' };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Sorting
    let order = [];
    if (['name', 'phone', 'createdAt'].includes(sortBy)) {
      order.push([sortBy, sortOrder.toUpperCase()]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    // Fetch virtual doctors with pagination
    const { count, rows: virtualDoctors } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'phone', 'gender', 'createdAt', 'notificationEnabled'],
      order,
      limit,
      offset,
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Virtual doctors retrieved successfully",
      data: virtualDoctors,
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

    // Sort the data
    if (sortBy === 'name') {
      filteredApis.sort((a, b) => {
        return sortOrder === 'ASC' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
    } else if (sortBy === 'category') {
      filteredApis.sort((a, b) => {
        return sortOrder === 'ASC'
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      });
    } else {
      // Default sort by createdAt
      filteredApis.sort((a, b) => {
        return sortOrder === 'ASC'
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt);
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

    const virtualDoctor = await User.findOne({
      where: { id, role: 'virtual-doctor' }
    });

    if (!virtualDoctor) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Virtual doctor not found",
        data: null
      });
    }

    await virtualDoctor.destroy();

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

    // Build where conditions - only virtual appointments
    const where = {
      type: 'virtual' // Only virtual appointments
    };

    // Status filter
    if (status) {
      where.status = status;
    }

    // Date range filter
    if (fromDate || toDate) {
      where.appointmentDateTime = {};
      if (fromDate) {
        where.appointmentDateTime[Op.gte] = new Date(fromDate);
      }
      if (toDate) {
        where.appointmentDateTime[Op.lte] = new Date(`${toDate}T23:59:59.999Z`);
      }
    }

    // Sorting
    let order = [];
    if (['appointmentDateTime', 'createdAt', 'bookingDate'].includes(sortBy)) {
      order.push([sortBy, sortOrder.toUpperCase()]);
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

    // Transform data for response
    const transformedAppointments = appointments.map(appointment => ({
      id: appointment.id,
      appointmentDate: appointment.appointmentDateTime,
      patientName: appointment.patient?.name || 'Unknown Patient',
      patientPhone: appointment.patient?.phone || 'N/A',
      patientEmail: appointment.patient?.email || 'N/A',
      doctorName: appointment.doctor?.User?.name || 'Unknown Doctor',
      doctorPhone: appointment.doctor?.User?.phone || 'N/A',
      status: appointment.status,
      appointmentType: 'Virtual Consultation',
      notes: appointment.notes || '',
      consultationNotes: appointment.consultationNotes || '',
      prescription: appointment.prescription || '',
      meetingLink: appointment.videoCallLink || '',
      roomId: appointment.roomId || '',
      priority: appointment.priority || 'medium',
      source: appointment.source || 'web',
      bookingDate: appointment.bookingDate,
      confirmedAt: appointment.confirmedAt,
      completedAt: appointment.completedAt,
      canceledAt: appointment.canceledAt,
      canceledBy: appointment.canceledBy,
      cancelReason: appointment.cancelReason,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    }));

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Virtual appointments retrieved successfully",
      data: transformedAppointments,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
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