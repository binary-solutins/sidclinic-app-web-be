const OralHealthScore = require('../models/oralHealthScore.model');
const Patient = require('../models/patient.model');
const User = require('../models/user.model');

// Add oral health score for a patient
exports.addOralHealthScore = async (req, res) => {
  try {
    const { patientId, score, notes } = req.body;

    // Validate score
    if (score < 0 || score > 100) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Score must be between 0 and 100',
        data: null
      });
    }

    // Check if patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient not found',
        data: null
      });
    }

    const oralHealthScore = await OralHealthScore.create({
      patientId,
      score,
      notes,
      assessedBy: req.user.id
    });

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Oral health score added successfully',
      data: oralHealthScore
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

// Get all oral health scores for a patient
exports.getPatientOralHealthScores = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check if patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient not found',
        data: null
      });
    }

    const scores = await OralHealthScore.findAll({
      where: { patientId },
      order: [['assessmentDate', 'DESC']],
      include: [{
        model: Patient,
        attributes: ['id', 'email'],
        include: [{
          model: User,
          attributes: ['name']
        }]
      }]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Oral health scores retrieved successfully',
      data: scores
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

// Get latest oral health score for a patient
exports.getLatestOralHealthScore = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check if patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient not found',
        data: null
      });
    }

    const latestScore = await OralHealthScore.findOne({
      where: { patientId },
      order: [['assessmentDate', 'DESC']],
      include: [{
        model: Patient,
        attributes: ['id', 'email'],
        include: [{
          model: User,
          attributes: ['name']
        }]
      }]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Latest oral health score retrieved successfully',
      data: latestScore
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

// Update oral health score
exports.updateOralHealthScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, notes } = req.body;

    const oralHealthScore = await OralHealthScore.findByPk(id);
    if (!oralHealthScore) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Oral health score not found',
        data: null
      });
    }

    // Validate score if provided
    if (score !== undefined && (score < 0 || score > 100)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Score must be between 0 and 100',
        data: null
      });
    }

    await oralHealthScore.update({
      score: score !== undefined ? score : oralHealthScore.score,
      notes: notes !== undefined ? notes : oralHealthScore.notes
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Oral health score updated successfully',
      data: oralHealthScore
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

// Delete oral health score
exports.deleteOralHealthScore = async (req, res) => {
  try {
    const { id } = req.params;

    const oralHealthScore = await OralHealthScore.findByPk(id);
    if (!oralHealthScore) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Oral health score not found',
        data: null
      });
    }

    await oralHealthScore.destroy();

    res.json({
      status: 'success',
      code: 200,
      message: 'Oral health score deleted successfully',
      data: null
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

// Get all oral health scores (for admin/doctor dashboard)
exports.getAllOralHealthScores = async (req, res) => {
  try {
    const { page = 1, limit = 10, patientId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (patientId) {
      whereClause.patientId = patientId;
    }

    const { count, rows } = await OralHealthScore.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['assessmentDate', 'DESC']],
      include: [{
        model: Patient,
        attributes: ['id', 'email'],
        include: [{
          model: User,
          attributes: ['name']
        }]
      }]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Oral health scores retrieved successfully',
      data: {
        scores: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
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