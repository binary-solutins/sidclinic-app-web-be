const PersonalPatient = require('../models/personalPatient.model');
const Doctor = require('../models/doctor.model');
const { Op } = require('sequelize');

/**
 * Create a new personal patient
 */
exports.createPersonalPatient = async (req, res) => {
  try {
    // Get doctor ID from authenticated user
    const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Doctor profile not found',
        data: null
      });
    }

    const {
      name,
      phone,
      gender,
      description,
      medicalHistory,
      date,
      time
    } = req.body;

    const personalPatient = await PersonalPatient.create({
      doctorId: doctor.id,
      name,
      phone,
      gender,
      description,
      medicalHistory,
      date,
      time
    });

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Personal patient created successfully',
      data: personalPatient
    });
  } catch (error) {
    console.error('Error creating personal patient:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

/**
 * Get all personal patients for the authenticated doctor
 */
exports.getAllPersonalPatients = async (req, res) => {
  try {
    // Get doctor ID from authenticated user
    const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Doctor profile not found',
        data: null
      });
    }

    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {
      doctorId: doctor.id,
      isActive: true
    };

    // Add search functionality
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    const { count, rows } = await PersonalPatient.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Personal patients retrieved successfully',
      data: {
        patients: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching personal patients:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

/**
 * Get a specific personal patient by ID
 */
exports.getPersonalPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor ID from authenticated user
    const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Doctor profile not found',
        data: null
      });
    }

    const personalPatient = await PersonalPatient.findOne({
      where: {
        id,
        doctorId: doctor.id,
        isActive: true
      }
    });

    if (!personalPatient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Personal patient not found',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Personal patient retrieved successfully',
      data: personalPatient
    });
  } catch (error) {
    console.error('Error fetching personal patient:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

/**
 * Update a personal patient
 */
exports.updatePersonalPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      gender,
      description,
      medicalHistory,
      date,
      time
    } = req.body;

    // Get doctor ID from authenticated user
    const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Doctor profile not found',
        data: null
      });
    }

    const personalPatient = await PersonalPatient.findOne({
      where: {
        id,
        doctorId: doctor.id,
        isActive: true
      }
    });

    if (!personalPatient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Personal patient not found',
        data: null
      });
    }

    // Update the patient
    await personalPatient.update({
      name,
      phone,
      gender,
      description,
      medicalHistory,
      date,
      time
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Personal patient updated successfully',
      data: personalPatient
    });
  } catch (error) {
    console.error('Error updating personal patient:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

/**
 * Delete a personal patient (soft delete)
 */
exports.deletePersonalPatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor ID from authenticated user
    const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Doctor profile not found',
        data: null
      });
    }

    const personalPatient = await PersonalPatient.findOne({
      where: {
        id,
        doctorId: doctor.id,
        isActive: true
      }
    });

    if (!personalPatient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Personal patient not found',
        data: null
      });
    }

    // Soft delete by setting isActive to false
    await personalPatient.update({ isActive: false });

    res.json({
      status: 'success',
      code: 200,
      message: 'Personal patient deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error deleting personal patient:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

/**
 * Restore a deleted personal patient
 */
exports.restorePersonalPatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor ID from authenticated user
    const doctor = await Doctor.findOne({ where: { userId: req.user.id } });
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Doctor profile not found',
        data: null
      });
    }

    const personalPatient = await PersonalPatient.findOne({
      where: {
        id,
        doctorId: doctor.id,
        isActive: false
      }
    });

    if (!personalPatient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Personal patient not found or already active',
        data: null
      });
    }

    // Restore by setting isActive to true
    await personalPatient.update({ isActive: true });

    res.json({
      status: 'success',
      code: 200,
      message: 'Personal patient restored successfully',
      data: personalPatient
    });
  } catch (error) {
    console.error('Error restoring personal patient:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};
