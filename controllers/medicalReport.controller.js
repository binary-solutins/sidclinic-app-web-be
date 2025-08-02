const MedicalReport = require('../models/medicalReport.model');
const Patient = require('../models/patient.model');
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

// Helper function to upload file to Appwrite
const uploadFile = async (file) => {
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
    return {
      fileId: uploadedFile.$id,
      fileUrl: `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype
    };
  } catch (error) {
    console.error('Error uploading file via API:', error.response ? error.response.data : error.message);
    throw new Error('File upload failed');
  }
};

// Upload medical report
exports.uploadMedicalReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'No file uploaded',
        data: null
      });
    }

    const { patientId, title, description, reportType } = req.body;

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

    // Upload file to Appwrite
    const fileData = await uploadFile(req.file);

    const medicalReport = await MedicalReport.create({
      patientId,
      title,
      description,
      filePath: fileData.fileUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
      reportType: reportType || 'Other',
      uploadedBy: req.user.id
    });

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Medical report uploaded successfully',
      data: medicalReport
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

// Get all medical reports for a patient
exports.getPatientMedicalReports = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10, reportType } = req.query;
    const offset = (page - 1) * limit;

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

    const whereClause = { patientId, isActive: true };
    if (reportType) {
      whereClause.reportType = reportType;
    }

    const { count, rows } = await MedicalReport.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['uploadDate', 'DESC']],
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
      message: 'Medical reports retrieved successfully',
      data: {
        reports: rows,
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

// Download medical report
exports.downloadMedicalReport = async (req, res) => {
  try {
    const { id } = req.params;

    const medicalReport = await MedicalReport.findByPk(id, {
      include: [{
        model: Patient,
        attributes: ['id', 'email'],
        include: [{
          model: User,
          attributes: ['name']
        }]
      }]
    });

    if (!medicalReport) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Medical report not found',
        data: null
      });
    }

    // Return the Appwrite URL for download
    res.json({
      status: 'success',
      code: 200,
      message: 'Medical report URL retrieved successfully',
      data: {
        downloadUrl: medicalReport.filePath,
        fileName: medicalReport.fileName,
        fileSize: medicalReport.fileSize,
        fileType: medicalReport.fileType
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

// Update medical report details
exports.updateMedicalReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, reportType } = req.body;

    const medicalReport = await MedicalReport.findByPk(id);
    if (!medicalReport) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Medical report not found',
        data: null
      });
    }

    await medicalReport.update({
      title: title || medicalReport.title,
      description: description !== undefined ? description : medicalReport.description,
      reportType: reportType || medicalReport.reportType
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Medical report updated successfully',
      data: medicalReport
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

// Delete medical report (soft delete)
exports.deleteMedicalReport = async (req, res) => {
  try {
    const { id } = req.params;

    const medicalReport = await MedicalReport.findByPk(id);
    if (!medicalReport) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Medical report not found',
        data: null
      });
    }

    // Soft delete
    await medicalReport.update({ isActive: false });

    res.json({
      status: 'success',
      code: 200,
      message: 'Medical report deleted successfully',
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

// Get all medical reports (for admin/doctor dashboard)
exports.getAllMedicalReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, patientId, reportType } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };
    if (patientId) {
      whereClause.patientId = patientId;
    }
    if (reportType) {
      whereClause.reportType = reportType;
    }

    const { count, rows } = await MedicalReport.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['uploadDate', 'DESC']],
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
      message: 'Medical reports retrieved successfully',
      data: {
        reports: rows,
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