const Doctor = require("../models/doctor.model");
const User = require("../models/user.model");
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
    // Create a file ID
    const fileId = uuidv4();

    // Create form data
    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });

    // Make direct API call to Appwrite
    const response = await axios.post(
      `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': process.env.APPWRITE_API_KEY  // You'll need an API key for server-side operations
        }
      }
    );

    // Return the file URL based on the response
    const uploadedFile = response.data;
    return `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
  } catch (error) {
    console.error('Error uploading image via API:', error.response ? error.response.data : error.message);
    throw new Error('Image upload failed');
  }
};

exports.listPendingDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      where: { isApproved: false },
      include: [
        {
          model: User,
          attributes: ["name", "phone", "createdAt"],
        },
      ],
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listApprovedDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      where: { isApproved: true },
      include: [
        {
          model: User,
          attributes: ["name", "phone", "createdAt"],
        },
      ],
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        {
          model: User,
          attributes: ["name", "phone", "createdAt"],
        },
      ],
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleDoctorApproval = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "Doctor not found",
      });
    }

    doctor.isApproved = !doctor.isApproved;
    await doctor.save();

    res.status(200).json({
      status: "success",
      code: 200,
      message: `Doctor ${doctor.isApproved ? "approved" : "disapproved"
        } successfully`,
      isApproved: doctor.isApproved,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getDoctorDetails = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ["name", "phone", "createdAt"],
        },
      ],
    });
    if (!doctor) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "Doctor not found",
      });
    }
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Doctor details retrieved successfully",
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.toggleDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findOne({
      where: { id },
      include: [
        {
          model: User,
          attributes: ["name"],
        },
      ],
    });

    if (!doctor) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Doctor not found",
        data: null,
      });
    }

    // Toggle the is_active status
    const newStatus = !doctor.is_active;
    await doctor.update({ is_active: newStatus });

    res.json({
      status: "success",
      code: 200,
      message: `Doctor ${newStatus ? "activated" : "deactivated"} successfully`,
      data: {
        is_active: newStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: error.message,
      data: null,
    });
  }
};

exports.createOrUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password, gender, role = 'user', fcmToken, notificationEnabled } = req.body;

    // Validation
    if (!name || !phone || !gender) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Name, phone, and gender are required",
        data: null
      });
    }

    if (id) {
      // Update existing user
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "User not found",
          data: null
        });
      }

      // Check if phone is being changed and if it already exists
      if (phone !== user.phone) {
        const phoneExists = await User.findOne({ where: { phone } });
        if (phoneExists) {
          return res.status(400).json({
            status: "error",
            code: 400,
            message: "Phone number already exists",
            data: null
          });
        }
      }

      // Update user data
      const updateData = { name, phone, gender, role };
      if (password) updateData.password = password;
      if (fcmToken !== undefined) updateData.fcmToken = fcmToken;
      if (notificationEnabled !== undefined) updateData.notificationEnabled = notificationEnabled;

      await user.update(updateData);

      res.status(200).json({
        status: "success",
        code: 200,
        message: "User updated successfully",
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          gender: user.gender,
          notificationEnabled: user.notificationEnabled
        }
      });
    } else {
      // Create new user
      if (!password) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Password is required for new user",
          data: null
        });
      }

      // Check if phone already exists
      const phoneExists = await User.findOne({ where: { phone } });
      if (phoneExists) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Phone number already exists",
          data: null
        });
      }

      const user = await User.create({
        name,
        phone,
        password,
        gender,
        role,
        fcmToken,
        notificationEnabled
      });

      res.status(201).json({
        status: "success",
        code: 201,
        message: "User created successfully",
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          gender: user.gender,
          notificationEnabled: user.notificationEnabled
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};

exports.createOrUpdateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // User data
      name, phone, password, gender,
      // Doctor data
      degree, registrationNumber, clinicName,
      yearsOfExperience, specialty, clinicContactNumber, email, address,
      country, state, city, locationPin, startTime, endTime, is_active
    } = req.body;

    // Handle file uploads
    let doctorPhotoUrl = null;
    let degreeCertificateUrl = null;
    let clinicPhotosUrls = [];

    try {
      // Upload doctor photo if provided
      if (req.files && req.files.doctorPhoto && req.files.doctorPhoto[0]) {
        doctorPhotoUrl = await uploadImage(req.files.doctorPhoto[0]);
      }

      // Upload degree certificate if provided
      if (req.files && req.files.degreeCertificate && req.files.degreeCertificate[0]) {
        degreeCertificateUrl = await uploadImage(req.files.degreeCertificate[0]);
      }

      // Upload clinic photos if provided
      if (req.files && req.files.clinicPhotos && req.files.clinicPhotos.length > 0) {
        const uploadPromises = req.files.clinicPhotos.map(file => uploadImage(file));
        clinicPhotosUrls = await Promise.all(uploadPromises);
      }
    } catch (uploadError) {
      console.error('Error uploading files:', uploadError);
      return res.status(500).json({
        status: "error",
        code: 500,
        message: "Failed to upload files. Please try again.",
        data: null
      });
    }

    // Validation for required fields
    if (!name || !phone || !gender || !degree || !registrationNumber ||
      !clinicName || !yearsOfExperience || !clinicContactNumber ||
      !email || !address || !country || !state || !city || !locationPin) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "All required fields must be provided",
        data: null
      });
    }

    if (id) {
      // Update existing doctor
      const doctor = await Doctor.findByPk(id, {
        include: [{ model: User, attributes: ['id', 'name', 'phone', 'gender'] }]
      });

      if (!doctor) {
        return res.status(404).json({
          status: "error",
          code: 404,
          message: "Doctor not found",
          data: null
        });
      }

      // Check if phone is being changed and if it already exists
      if (phone !== doctor.User.phone) {
        const phoneExists = await User.findOne({ where: { phone } });
        if (phoneExists) {
          return res.status(400).json({
            status: "error",
            code: 400,
            message: "Phone number already exists",
            data: null
          });
        }
      }

      // Check if registration number is being changed and if it already exists
      if (registrationNumber !== doctor.registrationNumber) {
        const regExists = await Doctor.findOne({ where: { registrationNumber } });
        if (regExists) {
          return res.status(400).json({
            status: "error",
            code: 400,
            message: "Registration number already exists",
            data: null
          });
        }
      }

      // Update user data
      const userUpdateData = { name, phone, gender, role: 'doctor' };
      if (password) userUpdateData.password = password;
      await doctor.User.update(userUpdateData);

      // Update doctor data
      const doctorUpdateData = {
        degree, registrationNumber, clinicName,
        yearsOfExperience, specialty, clinicContactNumber, email, address,
        country, state, city, locationPin, startTime, endTime
      };

      // Only update image fields if new files were uploaded
      if (doctorPhotoUrl) doctorUpdateData.doctorPhoto = doctorPhotoUrl;
      if (degreeCertificateUrl) doctorUpdateData.degreeCertificate = degreeCertificateUrl;
      if (clinicPhotosUrls.length > 0) doctorUpdateData.clinicPhotos = JSON.stringify(clinicPhotosUrls);

      if (is_active !== undefined) doctorUpdateData.is_active = is_active;

      await doctor.update(doctorUpdateData);

      // Fetch updated doctor with user data
      const updatedDoctor = await Doctor.findByPk(id, {
        include: [{ model: User, attributes: ['id', 'name', 'phone', 'gender', 'role'] }]
      });

      res.status(200).json({
        status: "success",
        code: 200,
        message: "Doctor updated successfully",
        data: updatedDoctor
      });
    } else {
      // Create new doctor
      if (!password) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Password is required for new doctor",
          data: null
        });
      }

      // Check if phone already exists
      const phoneExists = await User.findOne({ where: { phone } });
      if (phoneExists) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Phone number already exists",
          data: null
        });
      }

      // Check if registration number already exists
      const regExists = await Doctor.findOne({ where: { registrationNumber } });
      if (regExists) {
        return res.status(400).json({
          status: "error",
          code: 400,
          message: "Registration number already exists",
          data: null
        });
      }

      // Create user first
      const user = await User.create({
        name,
        phone,
        password,
        gender,
        role: 'doctor'
      });

      console.log('degreeCertificateUrl ==========> ', degreeCertificateUrl)

      // Create doctor profile
      const doctor = await Doctor.create({
        userId: user.id,
        doctorPhoto: doctorPhotoUrl,
        // degreeCertificate: degreeCertificateUrl,
        degree,
        registrationNumber,
        clinicName,
        clinicPhotos: clinicPhotosUrls.length > 0 ? JSON.stringify(clinicPhotosUrls) : null,
        yearsOfExperience,
        specialty,
        clinicContactNumber,
        email,
        address,
        country,
        state,
        city,
        locationPin,
        startTime,
        endTime,
        is_active: is_active !== undefined ? is_active : true,
        isApproved: false // Default to false, admin can approve later
      });

      // Fetch created doctor with user data
      const createdDoctor = await Doctor.findByPk(doctor.id, {
        include: [{ model: User, attributes: ['id', 'name', 'phone', 'gender', 'role'] }]
      });

      res.status(201).json({
        status: "success",
        code: 201,
        message: "Doctor created successfully",
        data: createdDoctor
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};


exports.listAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: 'user' },
      attributes: ["id", "name", "phone", "gender", "createdAt", "notificationEnabled"]
    });
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Users retrieved successfully",
      data: users
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal Server Error",
      error: error.message,
      data: null
    });
  }
};
