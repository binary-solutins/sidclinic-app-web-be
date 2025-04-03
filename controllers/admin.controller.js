const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');

exports.listPendingDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      where: { isApproved: false },
      include: [{
        model: User,
        attributes: ['name', 'phone', 'createdAt']
      }]
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listApprovedDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      where: { isApproved: true },
      include: [{
        model: User,
        attributes: ['name', 'phone', 'createdAt']
      }]
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [{
        model: User,
        attributes: ['name', 'phone', 'createdAt']
      }]
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleDoctorApproval = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) {
      return res.status(404).json({ 
        status: "error",
        statusCode: 404,
        message: "Doctor not found" 
      });
    }

    doctor.isApproved = !doctor.isApproved;
    await doctor.save();

    res.status(200).json({ 
      status: "success",
      code: 200,
      message: `Doctor ${doctor.isApproved ? 'approved' : 'disapproved'} successfully`, 
      isApproved: doctor.isApproved 
    });

  } catch (error) {
    res.status(500).json({ 
      status: "error",
      statusCode: 500,
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};


exports.getDoctorDetails = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['name', 'phone', 'createdAt']
      }]
    });
    if (!doctor) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "Doctor not found"
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Doctor details retrieved successfully",
      data: doctor
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
