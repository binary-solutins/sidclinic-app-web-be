const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const DentalImage = require('../models/dentalImage.model');
const FamilyMember = require('../models/familyMember.model');
const Patient = require('../models/patient.model');

// Appwrite configuration
const bucketId = process.env.APPWRITE_BUCKET_ID;

// Helper function to upload image to Appwrite (same as other controllers)
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

// Upload dental images
exports.uploadDentalImages = async (req, res) => {
  try {
    const { relativeId, description, imageType = 'other' } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'No images uploaded',
        data: null
      });
    }

    // Validate relativeId if provided
    if (relativeId) {
      const patient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Patient profile not found',
          data: null
        });
      }

      const relative = await FamilyMember.findOne({
        where: { id: relativeId, patientId: patient.id }
      });
      if (!relative) {
        return res.status(404).json({
          status: 'error',
          code: 404,
          message: 'Relative not found or not associated with this patient',
          data: null
        });
      }
    }

    // Upload all images to Appwrite
    const imageUrls = [];
    for (const file of files) {
      const imageUrl = await uploadImage(file);
      imageUrls.push(imageUrl);
    }

    // Create dental image record
    const dentalImage = await DentalImage.create({
      userId: req.user.id,
      relativeId: relativeId || null,
      imageUrls,
      description,
      imageType
    });

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Dental images uploaded successfully',
      data: {
        id: dentalImage.id,
        imageUrls,
        description,
        imageType,
        relativeId: dentalImage.relativeId,
        createdAt: dentalImage.createdAt
      }
    });
  } catch (error) {
    console.error('Upload dental images error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to upload dental images',
      data: null
    });
  }
};

// Get user's dental images
exports.getUserDentalImages = async (req, res) => {
  try {
    const { page = 1, limit = 10, relativeId, imageType } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = { userId: req.user.id, isActive: true };
    if (relativeId) {
      whereClause.relativeId = relativeId;
    }
    if (imageType) {
      whereClause.imageType = imageType;
    }

    const dentalImages = await DentalImage.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: FamilyMember,
          as: 'FamilyMember',
          attributes: ['id', 'name', 'relation'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(dentalImages.count / limit);

    res.json({
      status: 'success',
      code: 200,
      message: 'Dental images retrieved successfully',
      data: {
        images: dentalImages.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: dentalImages.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user dental images error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to retrieve dental images',
      data: null
    });
  }
};

// Get specific dental image by ID
exports.getDentalImageById = async (req, res) => {
  try {
    const { id } = req.params;

    const dentalImage = await DentalImage.findOne({
      where: { id, userId: req.user.id, isActive: true },
      include: [
        {
          model: FamilyMember,
          as: 'FamilyMember',
          attributes: ['id', 'name', 'relation'],
          required: false
        }
      ]
    });

    if (!dentalImage) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Dental image not found',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Dental image retrieved successfully',
      data: dentalImage
    });
  } catch (error) {
    console.error('Get dental image by ID error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to retrieve dental image',
      data: null
    });
  }
};

// Delete dental image
exports.deleteDentalImage = async (req, res) => {
  try {
    const { id } = req.params;

    const dentalImage = await DentalImage.findOne({
      where: { id, userId: req.user.id, isActive: true }
    });

    if (!dentalImage) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Dental image not found',
        data: null
      });
    }

    // Soft delete by setting isActive to false
    await dentalImage.update({ isActive: false });

    res.json({
      status: 'success',
      code: 200,
      message: 'Dental image deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Delete dental image error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to delete dental image',
      data: null
    });
  }
};

// Admin: Get all dental images with pagination
exports.getAllDentalImages = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, relativeId, imageType } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = { isActive: true };
    if (userId) {
      whereClause.userId = userId;
    }
    if (relativeId) {
      whereClause.relativeId = relativeId;
    }
    if (imageType) {
      whereClause.imageType = imageType;
    }

    const dentalImages = await DentalImage.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: FamilyMember,
          as: 'FamilyMember',
          attributes: ['id', 'name', 'relation'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(dentalImages.count / limit);

    res.json({
      status: 'success',
      code: 200,
      message: 'All dental images retrieved successfully',
      data: {
        images: dentalImages.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: dentalImages.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all dental images error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to retrieve dental images',
      data: null
    });
  }
};

// Admin: Get all image URLs only (for bulk operations)
exports.getAllImageUrls = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const dentalImages = await DentalImage.findAndCountAll({
      where: { isActive: true },
      attributes: ['id', 'imageUrls', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Flatten all image URLs into a single array
    const allImageUrls = dentalImages.rows.reduce((acc, image) => {
      return acc.concat(image.imageUrls);
    }, []);

    const totalPages = Math.ceil(dentalImages.count / limit);

    res.json({
      status: 'success',
      code: 200,
      message: 'All image URLs retrieved successfully',
      data: {
        imageUrls: allImageUrls,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: dentalImages.count,
          itemsPerPage: parseInt(limit),
          totalImageUrls: allImageUrls.length
        }
      }
    });
  } catch (error) {
    console.error('Get all image URLs error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to retrieve image URLs',
      data: null
    });
  }
}; 