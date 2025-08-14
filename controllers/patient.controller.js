const Patient = require('../models/patient.model');
const FamilyMember = require('../models/familyMember.model');
const MedicalHistory = require('../models/medicalHistory.model');
const ConsultationReport = require('../models/consultationReport.model');
const User = require('../models/user.model');
const { Client, Storage } = require('appwrite');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');

// Configure Appwrite
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID);

const storage = new Storage(client);
const bucketId = process.env.APPWRITE_BUCKET_ID;

// Helper function to upload image to Appwrite
const uploadImage = async (file) => {
  try {
    const fileId = uuidv4();

    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });

    const response = await axios.post(
      `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': process.env.APPWRITE_API_KEY
        }
      }
    );

    const uploadedFile = response.data;
    return `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
  } catch (error) {
    console.error('Error uploading image via API:', error.response ? error.response.data : error.message);
    throw new Error('Image upload failed');
  }
};

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

    // Handle user profile updates (name, phone, gender)
    // Check if name is provided directly in request body or nested under user
    let userUpdateData = {};

    if (req.body.user) {
      if (req.body.user.name) userUpdateData.name = req.body.user.name;
      if (req.body.user.phone) userUpdateData.phone = req.body.user.phone;
      if (req.body.user.gender) userUpdateData.gender = req.body.user.gender;
    } else if (req.body.name) {
      // Handle case where name is sent directly in request body
      userUpdateData.name = req.body.name;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await user.update(userUpdateData);
      await user.reload();
    }

    // Handle patient profile updates
    const patientData = { ...req.body };
    delete patientData.user; // Remove user data from patient update
    delete patientData.name; // Remove name from patient data since it's handled in user table

    // Validate email if provided
    if (patientData.email !== undefined && patientData.email !== null) {
      if (patientData.email === '') {
        delete patientData.email; // Remove empty email to avoid validation error
      }
    }

    const [patient, created] = await Patient.findOrCreate({
      where: { userId: user.id },
      defaults: {
        ...patientData,
        userId: user.id
      }
    });

    if (!created) {
      await patient.update(patientData);
    }

    // Fetch updated data with user information
    const updatedPatient = await Patient.findOne({
      where: { userId: user.id },
      include: [{
        model: User,
        attributes: ['name', 'phone', 'gender']
      }]
    });

    res.status(created ? 201 : 200).json({
      status: 'success',
      code: created ? 201 : 200,
      message: created ? 'Profile created successfully' : 'Profile updated successfully',
      data: updatedPatient
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
        status: 'success',
        code: 200,
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

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'No image uploaded',
        data: null
      });
    }

    const patient = await Patient.findOne({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Patient profile not found',
        data: null
      });
    }

    // Upload image to Appwrite
    const imageUrl = await uploadImage(req.file);

    // Update patient profile with new image URL
    await patient.update({ profileImage: imageUrl });

    res.json({
      status: 'success',
      code: 200,
      message: 'Profile image uploaded successfully',
      data: {
        profileImage: imageUrl,
        fileName: req.file.originalname
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

// Get profile image
exports.getProfileImage = async (req, res) => {
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

    if (!patient.profileImage) {
      return res.status(200).json({
        status: 'success',
        code: 200,
        message: 'No profile image found',
        data: null
      });
    }

    // Return the Appwrite URL directly
    res.json({
      status: 'success',
      code: 200,
      message: 'Profile image URL retrieved successfully',
      data: {
        profileImage: patient.profileImage
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