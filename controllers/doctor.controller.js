const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');
const { Client, Storage } = require('appwrite');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { Op } = require('sequelize');
const { sendNewDoctorRegistrationNotification } = require('../services/email.services');

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
    console.log(`[DEBUG] getProfile - User ID: ${req.user.id}`);

    const profile = await Doctor.findOne({
      where: { userId: req.user.id },
      include: [{
        model: User,
        as: 'User',
        attributes: ['name', 'phone', 'gender']
      }]
    });

    console.log(`[DEBUG] getProfile - Profile found:`, profile ? 'Yes' : 'No');

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
    console.error(`[ERROR] getProfile - User ID: ${req.user.id}, Error:`, error.message);
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
    // Validation function
    const validateDoctorData = (data) => {
      const errors = [];
      
      // Required field validations
      if (!data.degree || data.degree.trim() === '') {
        errors.push('Degree is required');
      }
      
      if (!data.registrationNumber || data.registrationNumber.trim() === '') {
        errors.push('Registration number is required');
      }
      
      if (!data.clinicName || data.clinicName.trim() === '') {
        errors.push('Clinic name is required');
      }
      
      if (!data.yearsOfExperience || isNaN(data.yearsOfExperience) || data.yearsOfExperience < 0) {
        errors.push('Years of experience must be a valid positive number');
      }
      
      if (!data.clinicContactNumber || data.clinicContactNumber.trim() === '') {
        errors.push('Clinic contact number is required');
      }
      
      if (!data.email || data.email.trim() === '') {
        errors.push('Email is required');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          errors.push('Please provide a valid email address');
        }
      }
      
      if (!data.address || data.address.trim() === '') {
        errors.push('Address is required');
      }
      
      if (!data.country || data.country.trim() === '') {
        errors.push('Country is required');
      }
      
      if (!data.state || data.state.trim() === '') {
        errors.push('State is required');
      }
      
      if (!data.city || data.city.trim() === '') {
        errors.push('City is required');
      }
      
      if (!data.locationPin || data.locationPin.trim() === '') {
        errors.push('Location pin is required');
      } else if (!/^\d{6}$/.test(data.locationPin)) {
        errors.push('Location pin must be exactly 6 digits');
      }
      
      // Phone number validation
      if (data.clinicContactNumber) {
        const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
        if (!phoneRegex.test(data.clinicContactNumber)) {
          errors.push('Please provide a valid clinic contact number');
        }
      }
      
      return errors;
    };

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

    // Validate input data
    const validationErrors = validateDoctorData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Validation failed',
        errors: validationErrors,
        data: null
      });
    }

    // Handle profile photo upload if provided
    let doctorPhotoUrl = null;
    if (req.files && req.files.doctorPhoto && req.files.doctorPhoto[0]) {
      try {
        doctorPhotoUrl = await uploadImage(req.files.doctorPhoto[0]);
      } catch (uploadError) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Failed to upload doctor photo',
          errors: [uploadError.message],
          data: null
        });
      }
    }

    // Handle multiple clinic photos upload if provided
    let clinicPhotosUrls = [];
    if (req.files && req.files.clinicPhotos && req.files.clinicPhotos.length > 0) {
      try {
        for (const file of req.files.clinicPhotos) {
          const photoUrl = await uploadImage(file);
          clinicPhotosUrls.push(photoUrl);
        }
      } catch (uploadError) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Failed to upload clinic photos',
          errors: [uploadError.message],
          data: null
        });
      }
    }

    // Prepare doctor data - map request body to model fields
    const doctorData = {
      degree: req.body.degree.trim(),
      registrationNumber: req.body.registrationNumber.trim(),
      clinicName: req.body.clinicName.trim(),
      yearsOfExperience: parseInt(req.body.yearsOfExperience),
      specialty: req.body.specialty ? req.body.specialty.trim() : null,
      clinicContactNumber: req.body.clinicContactNumber.trim(),
      email: req.body.email.trim().toLowerCase(),
      address: req.body.address.trim(),
      country: req.body.country.trim(),
      state: req.body.state.trim(),
      city: req.body.city.trim(),
      locationPin: req.body.locationPin.trim(),
      startTime: req.body.startTime || null,
      endTime: req.body.endTime || null,
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

    // Check if registration number is already taken by another doctor
    if (req.body.registrationNumber) {
      const existingDoctorWithRegNumber = await Doctor.findOne({
        where: { 
          registrationNumber: req.body.registrationNumber.trim(),
          userId: { [Op.ne]: user.id } // Exclude current user
        }
      });
      
      if (existingDoctorWithRegNumber) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Registration number is already taken by another doctor',
          errors: ['Registration number must be unique'],
          data: null
        });
      }
    }

    // Update user name if provided
    if (req.body.name && req.body.name.trim() !== '') {
      try {
        await user.update({ name: req.body.name.trim() });
      } catch (userUpdateError) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Failed to update user name',
          errors: [userUpdateError.message],
          data: null
        });
      }
    }

    if (doctor) {
      // Update existing profile
      try {
        await doctor.update(doctorData);
        const message = 'Profile updated successfully';
        const statusCode = 200;
        
        // Fetch updated profile with user data
        const updatedDoctor = await Doctor.findOne({
          where: { userId: user.id },
          include: [{
            model: User,
            as: 'User',
            attributes: ['name', 'phone', 'gender']
          }]
        });
        
        res.status(statusCode).json({ 
          status: 'success',
          code: statusCode,
          message: message,
          data: updatedDoctor 
        });
      } catch (updateError) {
        console.error('Profile update error:', updateError);
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Failed to update profile',
          errors: [updateError.message],
          data: null
        });
      }
    } else {
      // Create new profile
      try {
        doctor = await Doctor.create(doctorData);
        
        // Fetch created profile with user data
        const newDoctor = await Doctor.findOne({
          where: { id: doctor.id },
          include: [{
            model: User,
            as: 'User',
            attributes: ['name', 'phone', 'gender']
          }]
        });

        // Send email notification to admin when doctor profile is completed
        try {
          const emailData = {
            name: newDoctor.User.name,
            email: newDoctor.email,
            phone: newDoctor.User.phone,
            specialization: newDoctor.specialty || 'Not specified',
            id: newDoctor.id
          };
          
          await sendNewDoctorRegistrationNotification(emailData);
          console.log('Admin notification email sent successfully for completed doctor profile');
        } catch (emailError) {
          console.error('Failed to send admin notification email:', emailError);
          // Don't fail the profile creation if email fails, just log the error
        }

        res.status(201).json({ 
          status: 'success',
          code: 201,
          message: 'Profile created successfully',
          data: newDoctor 
        });
      } catch (createError) {
        console.error('Profile creation error:', createError);
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Failed to create profile',
          errors: [createError.message],
          data: null
        });
      }
    }
  } catch (error) {
    console.error('Profile setup error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal server error',
      errors: [error.message],
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
        as: 'User',
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
        as: 'User',
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