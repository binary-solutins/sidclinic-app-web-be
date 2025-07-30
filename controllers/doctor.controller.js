const Doctor = require('../models/doctor.model');
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

// Helper function to upload image to Appwrite (same as in blog.controller.js)
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

    // Handle profile photo upload if provided
    let doctorPhotoUrl = null;
    if (req.files && req.files.doctorPhoto && req.files.doctorPhoto[0]) {
      doctorPhotoUrl = await uploadImage(req.files.doctorPhoto[0]);
    }

    // Handle multiple clinic photos upload if provided
    let clinicPhotosUrls = [];
    if (req.files && req.files.clinicPhotos && req.files.clinicPhotos.length > 0) {
      for (const file of req.files.clinicPhotos) {
        const photoUrl = await uploadImage(file);
        clinicPhotosUrls.push(photoUrl);
      }
    }

    // Prepare doctor data - map request body to model fields
    const doctorData = {
      degree: req.body.degree,
      registrationNumber: req.body.registrationNumber,
      clinicName: req.body.clinicName,
      yearsOfExperience: req.body.yearsOfExperience,
      specialty: req.body.specialty,
      clinicContactNumber: req.body.clinicContactNumber,
      email: req.body.email,
      address: req.body.address,
      country: req.body.country,
      state: req.body.state,
      city: req.body.city,
      locationPin: req.body.locationPin,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      userId: user.id
    };

    // Add photo URLs if uploaded
    if (doctorPhotoUrl) {
      doctorData.doctorPhoto = doctorPhotoUrl;
    }
    
    if (clinicPhotosUrls.length > 0) {
      doctorData.clinicPhotos = clinicPhotosUrls;
    }

    // Find existing doctor profile
    let doctor = await Doctor.findOne({
      where: { userId: user.id }
    });

    if (doctor) {
      // Update existing profile
      await doctor.update(doctorData);
      const message = 'Profile updated successfully';
      const statusCode = 200;
      
      res.status(statusCode).json({ 
        status: 'success',
        code: statusCode,
        message: message,
        data: doctor 
      });
    } else {
      // Create new profile
      doctor = await Doctor.create(doctorData);
      res.status(201).json({ 
        status: 'success',
        code: 201,
        message: 'Profile created successfully',
        data: doctor 
      });
    }
  } catch (error) {
    console.error('Profile setup error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

exports.findDoctorsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    
    const doctors = await Doctor.findAll({
      where: { 
        city,
        isApproved: true,
        is_active: true
      },
      include: [{
        model: User,
        attributes: ['name', 'phone', 'gender']
      }]
    });

    if (doctors.length === 0) {
      return res.status(404).json({ 
        status: 'error',
        code: 404,
        message: 'No doctors found in the specified city',
        data: []
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Doctors retrieved successfully',
      data: doctors
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

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      where: {
        isApproved: true,
        is_active: true
      },
      include: [{
        model: User,
        attributes: ['name', 'phone', 'gender']
      }]
    });

    if (doctors.length === 0) {
      return res.status(404).json({ 
        status: 'error',
        code: 404,
        message: 'No doctors found',
        data: []
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'All doctors retrieved successfully',
      data: doctors
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