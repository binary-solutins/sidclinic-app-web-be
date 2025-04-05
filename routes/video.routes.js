const express = require('express');
const router = express.Router();
const path = require('path');
const { Appointment, User, Doctor } = require('../models');
const bcrypt = require('bcryptjs');

router.get('/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/video-call.html'));
});

router.post('/:roomId/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const { roomId } = req.params;

    const user = await User.findOne({ where: { phone } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const appointment = await Appointment.findOne({
      where: { roomId },
      include: [
        { model: User, as: 'patient' },
        { model: Doctor, as: 'doctor', include: [User] }
      ]
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.status !== 'booked') return res.status(403).json({ error: 'Appointment not active' });

    const isPatient = user.id === appointment.userId;
    const isDoctor = user.id === appointment.doctor.User.id;
    
    if (!isPatient && !isDoctor) return res.status(403).json({ error: 'Access denied' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;