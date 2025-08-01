const Doctor = require("../models/doctor.model");
const User = require("../models/user.model");
const { Op } = require('sequelize');
const { emailService } = require('../services/email.services');

exports.listPendingDoctors = async (req, res) => {
  try {
    // Pagination
    let { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Searching (by doctor name, phone, or clinic name)
    const userWhere = {};
    const doctorWhere = { isApproved: false };
    
    if (search) {
      userWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
      doctorWhere[Op.or] = [
        { clinicName: { [Op.iLike]: `%${search}%` } },
        { specialty: { [Op.iLike]: `%${search}%` } },
        { degree: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Sorting
    let order = [];
    if (sortBy === 'name' || sortBy === 'phone' || sortBy === 'createdAt') {
      order.push([{ model: User }, sortBy, sortOrder.toUpperCase()]);
    } else if (sortBy === 'clinicName' || sortBy === 'specialty' || sortBy === 'degree' || sortBy === 'yearsOfExperience') {
      order.push([sortBy, sortOrder.toUpperCase()]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    // Count total for pagination
    const { count, rows: doctors } = await Doctor.findAndCountAll({
      where: doctorWhere,
      include: [
        {
          model: User,
          attributes: ["name", "phone", "createdAt"],
          where: Object.keys(userWhere).length ? userWhere : undefined,
        },
      ],
      order,
      limit,
      offset,
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Pending doctors retrieved successfully",
      data: doctors,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};

exports.listApprovedDoctors = async (req, res) => {
  try {
    // Pagination
    let { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Searching (by doctor name, phone, or clinic name)
    const userWhere = {};
    const doctorWhere = { isApproved: true };
    
    if (search) {
      userWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
      doctorWhere[Op.or] = [
        { clinicName: { [Op.iLike]: `%${search}%` } },
        { specialty: { [Op.iLike]: `%${search}%` } },
        { degree: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Sorting
    let order = [];
    if (sortBy === 'name' || sortBy === 'phone' || sortBy === 'createdAt') {
      order.push([{ model: User }, sortBy, sortOrder.toUpperCase()]);
    } else if (sortBy === 'clinicName' || sortBy === 'specialty' || sortBy === 'degree' || sortBy === 'yearsOfExperience') {
      order.push([sortBy, sortOrder.toUpperCase()]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    // Count total for pagination
    const { count, rows: doctors } = await Doctor.findAndCountAll({
      where: doctorWhere,
      include: [
        {
          model: User,
          attributes: ["name", "phone", "createdAt"],
          where: Object.keys(userWhere).length ? userWhere : undefined,
        },
      ],
      order,
      limit,
      offset,
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Approved doctors retrieved successfully",
      data: doctors,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};

exports.listAllDoctors = async (req, res) => {
  try {
    // Pagination
    let { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Searching (by doctor name, phone, clinic name, specialty, degree, city, state)
    const userWhere = {};
    const doctorWhere = {};
    
    if (search) {
      userWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
      doctorWhere[Op.or] = [
        { clinicName: { [Op.iLike]: `%${search}%` } },
        { specialty: { [Op.iLike]: `%${search}%` } },
        { degree: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { state: { [Op.iLike]: `%${search}%` } },
        { registrationNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Sorting
    let order = [];
    if (sortBy === 'name' || sortBy === 'phone' || sortBy === 'createdAt') {
      order.push([{ model: User }, sortBy, sortOrder.toUpperCase()]);
    } else if (sortBy === 'clinicName' || sortBy === 'specialty' || sortBy === 'degree' || 
               sortBy === 'yearsOfExperience' || sortBy === 'city' || sortBy === 'state' || 
               sortBy === 'isApproved' || sortBy === 'is_active') {
      order.push([sortBy, sortOrder.toUpperCase()]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    // Count total for pagination
    const { count, rows: doctors } = await Doctor.findAndCountAll({
      where: Object.keys(doctorWhere).length ? doctorWhere : undefined,
      include: [
        {
          model: User,
          attributes: ["name", "phone", "createdAt"],
          where: Object.keys(userWhere).length ? userWhere : undefined,
        },
      ],
      order,
      limit,
      offset,
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Doctors retrieved successfully",
      data: doctors,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};

exports.toggleDoctorApproval = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: User,
          attributes: ["name"],
        },
      ],
    });
    
    if (!doctor) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "Doctor not found",
      });
    }

    doctor.isApproved = !doctor.isApproved;
    await doctor.save();

    // Send email notification to doctor
    try {
      const emailData = {
        doctorName: doctor.User.name,
        platformName: process.env.APP_NAME || 'Healthcare Platform',
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/doctor/dashboard`,
        approvalReason: req.body.approvalReason || 'Administrative review',
        approvalDate: new Date().toLocaleDateString()
      };

      const templateType = doctor.isApproved ? 'doctor_approved' : 'doctor_disapproved';
      
      const emailResult = await emailService.sendAppointmentEmail(
        doctor.email,
        templateType,
        emailData
      );

      if (emailResult.success) {
        console.log(`Approval status email sent successfully to Dr. ${doctor.User.name}`);
      } else {
        console.error('Failed to send approval status email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending approval status email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: `Doctor ${doctor.isApproved ? "approved" : "disapproved"
        } successfully`,
      isApproved: doctor.isApproved,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getDoctorDetails = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ["name", "phone", "createdAt"],
        },
      ],
    });
    if (!doctor) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "Doctor not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Doctor details retrieved successfully",
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.toggleDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findOne({
      where: { id },
      include: [
        {
          model: User,
          attributes: ["name"],
        },
      ],
    });

    if (!doctor) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Doctor not found",
        data: null,
      });
    }

    // Toggle the is_active status
    const newStatus = !doctor.is_active;
    await doctor.update({ is_active: newStatus });

    // Send email notification to doctor
    try {
      const emailData = {
        doctorName: doctor.User.name,
        platformName: process.env.APP_NAME || 'Healthcare Platform',
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/doctor/dashboard`,
        supportUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support`,
        suspensionReason: req.body.suspensionReason || 'Administrative review',
        suspensionDate: new Date().toLocaleDateString(),
        reviewDate: req.body.reviewDate || null
      };

      const templateType = newStatus ? 'doctor_activated' : 'doctor_suspended';
      
      const emailResult = await emailService.sendAppointmentEmail(
        doctor.email,
        templateType,
        emailData
      );

      if (emailResult.success) {
        console.log(`Status change email sent successfully to Dr. ${doctor.User.name}`);
      } else {
        console.error('Failed to send status change email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending status change email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      status: "success",
      code: 200,
      message: `Doctor ${newStatus ? "activated" : "deactivated"} successfully`,
      data: {
        is_active: newStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: error.message,
      data: null,
    });
  }
};

exports.createOrUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password, gender, role = 'user', fcmToken, notificationEnabled } = req.body;

    // Validation
    if (!name || !phone || !gender) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Name, phone, and gender are required",
        data: null
      });
    }

    if (id) {
      // Update existing user
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "User not found",
          data: null
        });
      }

      // Check if phone is being changed and if it already exists
      if (phone !== user.phone) {
        const phoneExists = await User.findOne({ where: { phone } });
        if (phoneExists) {
          return res.status(400).json({
            status: "error",
            code: 400,
            message: "Phone number already exists",
            data: null
          });
        }
      }

      // Update user data
      const updateData = { name, phone, gender, role };
      if (password) updateData.password = password;
      if (fcmToken !== undefined) updateData.fcmToken = fcmToken;
      if (notificationEnabled !== undefined) updateData.notificationEnabled = notificationEnabled;

      await user.update(updateData);

      res.status(200).json({
        status: "success",
        code: 200,
        message: "User updated successfully",
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          gender: user.gender,
          notificationEnabled: user.notificationEnabled
        }
      });
    } else {
      // Create new user
      if (!password) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Password is required for new user",
          data: null
        });
      }

      // Check if phone already exists
      const phoneExists = await User.findOne({ where: { phone } });
      if (phoneExists) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Phone number already exists",
          data: null
        });
      }

      const user = await User.create({
        name,
        phone,
        password,
        gender,
        role,
        fcmToken,
        notificationEnabled
      });

      res.status(201).json({
        status: "success",
        code: 201,
        message: "User created successfully",
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          gender: user.gender,
          notificationEnabled: user.notificationEnabled
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};

exports.createOrUpdateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // User data
      name, phone, password, gender,
      // Doctor data
      doctorPhoto, degree, registrationNumber, clinicName, clinicPhotos,
      yearsOfExperience, specialty, clinicContactNumber, email, address,
      country, state, city, locationPin, startTime, endTime, is_active
    } = req.body;

    // Validation for required fields
    if (!name || !phone || !gender || !degree || !registrationNumber ||
      !clinicName || !yearsOfExperience || !clinicContactNumber ||
      !email || !address || !country || !state || !city || !locationPin) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "All required fields must be provided",
        data: null
      });
    }

    if (id) {
      // Update existing doctor
      const doctor = await Doctor.findByPk(id, {
        include: [{ model: User, attributes: ['id', 'name', 'phone', 'gender'] }]
      });

      if (!doctor) {
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "Doctor not found",
          data: null
        });
      }

      // Check if phone is being changed and if it already exists
      if (phone !== doctor.User.phone) {
        const phoneExists = await User.findOne({ where: { phone } });
        if (phoneExists) {
          return res.status(400).json({
            status: "error",
            code: 400,
            message: "Phone number already exists",
            data: null
          });
        }
      }

      // Check if registration number is being changed and if it already exists
      if (registrationNumber !== doctor.registrationNumber) {
        const regExists = await Doctor.findOne({ where: { registrationNumber } });
        if (regExists) {
          return res.status(400).json({
            status: "error",
            code: 400,
            message: "Registration number already exists",
            data: null
          });
        }
      }

      // Update user data
      const userUpdateData = { name, phone, gender, role: 'doctor' };
      if (password) userUpdateData.password = password;
      await doctor.User.update(userUpdateData);

      // Update doctor data
      const doctorUpdateData = {
        doctorPhoto, degree, registrationNumber, clinicName, clinicPhotos,
        yearsOfExperience, specialty, clinicContactNumber, email, address,
        country, state, city, locationPin, startTime, endTime
      };
      if (is_active !== undefined) doctorUpdateData.is_active = is_active;

      await doctor.update(doctorUpdateData);

      // Fetch updated doctor with user data
      const updatedDoctor = await Doctor.findByPk(id, {
        include: [{ model: User, attributes: ['id', 'name', 'phone', 'gender', 'role'] }]
      });

      res.status(200).json({
        status: "success",
        code: 200,
        message: "Doctor updated successfully",
        data: updatedDoctor
      });
    } else {
      // Create new doctor
      if (!password) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Password is required for new doctor",
          data: null
        });
      }

      // Check if phone already exists
      const phoneExists = await User.findOne({ where: { phone } });
      if (phoneExists) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Phone number already exists",
          data: null
        });
      }

      // Check if registration number already exists
      const regExists = await Doctor.findOne({ where: { registrationNumber } });
      if (regExists) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Registration number already exists",
          data: null
        });
      }

      // Create user first
      const user = await User.create({
        name,
        phone,
        password,
        gender,
        role: 'doctor'
      });

      // Create doctor profile
      const doctor = await Doctor.create({
        userId: user.id,
        doctorPhoto,
        degree,
        registrationNumber,
        clinicName,
        clinicPhotos,
        yearsOfExperience,
        specialty,
        clinicContactNumber,
        email,
        address,
        country,
        state,
        city,
        locationPin,
        startTime,
        endTime,
        is_active: is_active !== undefined ? is_active : true,
        isApproved: false // Default to false, admin can approve later
      });

      // Fetch created doctor with user data
      const createdDoctor = await Doctor.findByPk(doctor.id, {
        include: [{ model: User, attributes: ['id', 'name', 'phone', 'gender', 'role'] }]
      });

      res.status(201).json({
        status: "success",
        code: 201,
        message: "Doctor created successfully",
        data: createdDoctor
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};


exports.listAllUsers = async (req, res) => {
  try {
    // Pagination
    let { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Searching (by user name, phone, gender)
    const where = { role: 'user' };
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { gender: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Sorting
    let order = [];
    if (sortBy === 'name' || sortBy === 'phone' || sortBy === 'gender' || sortBy === 'createdAt') {
      order.push([sortBy, sortOrder.toUpperCase()]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    // Count total for pagination
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: ["id", "name", "phone", "gender", "createdAt", "notificationEnabled"],
      order,
      limit,
      offset,
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Users retrieved successfully",
      data: users,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};
