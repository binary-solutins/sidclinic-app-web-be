const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');

exports.listPendingDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      where: { isApproved: false },
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'phone', 'createdAt']
      }]
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    
    doctor.isApproved = true;
    await doctor.save();
    res.json({ message: 'Doctor approved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};