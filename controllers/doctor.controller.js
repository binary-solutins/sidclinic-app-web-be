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
        message: 'Doctor profile not found or not associated with user',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      code: 'SERVER_ERROR'
    });
  }
};

exports.setupProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.role !== 'doctor') {
      return res.status(403).json({
        message: 'User is not registered as a doctor',
        code: 'INVALID_USER_ROLE'
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
      message: created ? 'Profile created successfully' : 'Profile updated successfully',
      doctor 
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      code: 'SERVER_ERROR'
    });
  }
};