const Patient = require('../models/patient.model');
const FamilyMember = require('../models/familyMember.model');
const MedicalHistory = require('../models/medicalHistory.model');
const ConsultationReport = require('../models/consultationReport.model');
const User = require('../models/user.model');

exports.getProfile = async (req, res) => {
  try {
    const profile = await Patient.findOne({
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
        message: 'Patient profile not found or not associated with user',
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

    const [patient, created] = await Patient.findOrCreate({
      where: { userId: user.id },
      defaults: {
        ...req.body,
        userId: user.id
      }
    });

    if (!created) {
      await patient.update(req.body);
    }

    res.status(created ? 201 : 200).json({ 
      status: 'success',
      code: created ? 201 : 200,
      message: created ? 'Profile created successfully' : 'Profile updated successfully',
      data: patient 
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

exports.addFamilyMember = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const familyMember = await FamilyMember.create({
      ...req.body,
      patientId: patient.id
    });

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Family member added successfully',
      data: familyMember
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

exports.getFamilyMembers = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const familyMembers = await FamilyMember.findAll({
      where: { patientId: patient.id }
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Family members retrieved successfully',
      data: familyMembers
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

exports.updateFamilyMember = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const familyMember = await FamilyMember.findOne({
      where: { 
        id: req.params.id,
        patientId: patient.id 
      }
    });

    if (!familyMember) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Family member not found',
        data: null
      });
    }

    await familyMember.update(req.body);

    res.json({
      status: 'success',
      code: 200,
      message: 'Family member updated successfully',
      data: familyMember
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

exports.deleteFamilyMember = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const familyMember = await FamilyMember.findOne({
      where: { 
        id: req.params.id,
        patientId: patient.id 
      }
    });

    if (!familyMember) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Family member not found',
        data: null
      });
    }

    await familyMember.destroy();

    res.json({
      status: 'success',
      code: 200,
      message: 'Family member deleted successfully',
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

exports.setupMedicalHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const [medicalHistory, created] = await MedicalHistory.findOrCreate({
      where: { patientId: patient.id },
      defaults: {
        ...req.body,
        patientId: patient.id
      }
    });

    if (!created) {
      await medicalHistory.update(req.body);
    }

    res.status(created ? 201 : 200).json({
      status: 'success',
      code: created ? 201 : 200,
      message: created ? 'Medical history created successfully' : 'Medical history updated successfully',
      data: medicalHistory
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

exports.getMedicalHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const medicalHistory = await MedicalHistory.findOne({
      where: { patientId: patient.id }
    });

    if (!medicalHistory) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Medical history not found',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Medical history retrieved successfully',
      data: medicalHistory
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

exports.addConsultationReport = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const consultationReport = await ConsultationReport.create({
      ...req.body,
      patientId: patient.id
    });

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Consultation report added successfully',
      data: consultationReport
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

exports.getConsultationReports = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const reports = await ConsultationReport.findAll({
      where: { patientId: patient.id },
      order: [['consultationDate', 'DESC']]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Consultation reports retrieved successfully',
      data: reports
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

exports.getConsultationReport = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    const report = await ConsultationReport.findOne({
      where: { 
        id: req.params.id,
        patientId: patient.id 
      }
    });

    if (!report) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Consultation report not found',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Consultation report retrieved successfully',
      data: report
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