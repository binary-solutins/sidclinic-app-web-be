const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');

exports.getProfile = async (req, res) => {
  try {
    const profile = await Doctor.findOne({
      where: { userId: req.user.id },
      include: [{
        model: User,
        attributes: ['name', 'phone', 'gender']
      }]
    });

    if (!profile) {
      return res.status(404).json({ 
        status: 'error',
        code: 404,
        message: 'Doctor profile not found or not associated with user',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Profile retrieved successfully',
      data: profile
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

exports.setupProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'User not found',
        data: null
      });
    }

    if (user.role !== 'doctor') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'User is not registered as a doctor',
        data: null
      });
    }

    // Find or create doctor profile
    const [doctor, created] = await Doctor.findOrCreate({
      where: { userId: user.id },
      defaults: {
        ...req.body,
        userId: user.id
      }
    });

    // If not created, update existing profile
    if (!created) {
      await doctor.update(req.body);
    }

    res.status(created ? 201 : 200).json({ 
      status: 'success',
      code: created ? 201 : 200,
      message: created ? 'Profile created successfully' : 'Profile updated successfully',
      data: doctor 
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};