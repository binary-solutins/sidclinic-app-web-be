const Report = require('../models/report.model');
const User = require('../models/user.model');
const Patient = require('../models/patient.model');
const FamilyMember = require('../models/familyMember.model');
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

// Create a new report
exports.createReport = async (req, res) => {
  try {
    const { relativeId, relativeName, reportType, boundingBoxData } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!relativeName || !boundingBoxData) {
      return res.status(400).json({
        success: false,
        message: 'relativeName and boundingBoxData are required',
        data: null
      });
    }

    // Validate that exactly 3 images are provided
    if (!req.files || req.files.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Exactly 3 images are required for dental analysis',
        data: null
      });
    }

    // Parse boundingBoxData if it's a string
    let parsedBoundingBoxData;
    try {
      parsedBoundingBoxData = typeof boundingBoxData === 'string' 
        ? JSON.parse(boundingBoxData) 
        : boundingBoxData;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid boundingBoxData format',
        data: null
      });
    }

    // Find the patient record for the authenticated user
    const patient = await Patient.findOne({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found',
        data: null
      });
    }

    // Validate relativeId
    const relativeIdNum = parseInt(relativeId) || 0;
    
    // If relativeId > 0, verify the family member exists and belongs to the patient
    if (relativeIdNum > 0) {
      const familyMember = await FamilyMember.findOne({
        where: { 
          id: relativeIdNum,
          patientId: patient.id
        }
      });
      
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'Family member not found',
          data: null
        });
      }
    }

    // Upload the 3 required images
    let uploadedImages = [];
    for (const file of req.files) {
      try {
        const fileData = await uploadFile(file);
        uploadedImages.push(fileData.fileUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({
          success: false,
          message: 'Error uploading images',
          data: null
        });
      }
    }

    // Create the report
    const report = await Report.create({
      patientId: patient.id,
      relativeId: relativeIdNum,
      relativeName,
      reportType: reportType || 'oral_diagnosis',
      boundingBoxData: parsedBoundingBoxData,
      images: uploadedImages
    });

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: {
        id: report.id,
        relativeId: report.relativeId,
        relativeName: report.relativeName,
        reportType: report.reportType,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        boundingBoxData: report.boundingBoxData,
        images: report.images
      }
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Get reports for a user (patient)
exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { relativeId } = req.query;

    // Find the patient record for the authenticated user
    const patient = await Patient.findOne({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found',
        data: null
      });
    }

    // Build where clause
    const whereClause = {
      patientId: patient.id,
      isActive: true
    };

    // If relativeId is specified, filter by it
    if (relativeId !== undefined) {
      whereClause.relativeId = parseInt(relativeId) || 0;
    }

    const reports = await Report.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      attributes: [
        'id', 'relativeId', 'relativeName', 'reportType', 
        'createdAt', 'updatedAt', 'boundingBoxData', 'images'
      ]
    });

    // Format the response
    const formattedReports = reports.map(report => ({
      id: `report_${report.id}`,
      relativeId: report.relativeId,
      relativeName: report.relativeName,
      reportType: report.reportType,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      boundingBoxData: report.boundingBoxData,
      images: report.images
    }));

    res.status(200).json({
      success: true,
      data: formattedReports
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Get reports for a specific patient (admin/doctor access)
exports.getPatientReports = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { relativeId } = req.query;

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
        data: null
      });
    }

    // Build where clause
    const whereClause = {
      patientId: patient.id,
      isActive: true
    };

    // If relativeId is specified, filter by it
    if (relativeId !== undefined) {
      whereClause.relativeId = parseInt(relativeId) || 0;
    }

    const reports = await Report.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      attributes: [
        'id', 'relativeId', 'relativeName', 'reportType', 
        'createdAt', 'updatedAt', 'boundingBoxData', 'images'
      ]
    });

    // Format the response
    const formattedReports = reports.map(report => ({
      id: `report_${report.id}`,
      relativeId: report.relativeId,
      relativeName: report.relativeName,
      reportType: report.reportType,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      boundingBoxData: report.boundingBoxData,
      images: report.images
    }));

    res.status(200).json({
      success: true,
      data: formattedReports
    });

  } catch (error) {
    console.error('Error fetching patient reports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Get a specific report by ID
exports.getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    // Find the patient record for the authenticated user
    const patient = await Patient.findOne({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found',
        data: null
      });
    }

    const report = await Report.findOne({
      where: {
        id: reportId,
        patientId: patient.id,
        isActive: true
      },
      attributes: [
        'id', 'relativeId', 'relativeName', 'reportType', 
        'createdAt', 'updatedAt', 'boundingBoxData', 'images', 'summary'
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: `report_${report.id}`,
        relativeId: report.relativeId,
        relativeName: report.relativeName,
        reportType: report.reportType,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        boundingBoxData: report.boundingBoxData,
        images: report.images,
        summary: report.summary
      }
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Delete a report (soft delete)
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    // Find the patient record for the authenticated user
    const patient = await Patient.findOne({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found',
        data: null
      });
    }

    const report = await Report.findOne({
      where: {
        id: reportId,
        patientId: patient.id,
        isActive: true
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
        data: null
      });
    }

    // Soft delete
    await report.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      data: null
    });

  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};
