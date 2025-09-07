const Banner = require('../models/banner.model');
const { Op } = require('sequelize');
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

// Get all banners (Public access - no authentication required)
exports.getAllBanners = async (req, res) => {
  try {
    const { isDoctorApp } = req.query;
    
    // Build where conditions
    const where = {
      isActive: true
    };
    
    // Filter by isDoctorApp if provided
    if (isDoctorApp !== undefined) {
      where.isDoctorApp = isDoctorApp === '1' || isDoctorApp === 'true';
    }

    // Get banners with proper ordering
    const banners = await Banner.findAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });

    // Transform data based on isDoctorApp flag
    const transformedBanners = banners.map(banner => {
      if (banner.isDoctorApp) {
        // For doctor app (isDoctorApp = 1): return all fields
        return {
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle,
          image: banner.image,
          isDoctorApp: banner.isDoctorApp,
          order: banner.order,
          createdAt: banner.createdAt
        };
      } else {
        // For patient app (isDoctorApp = 0): return only image
        return {
          id: banner.id,
          image: banner.image,
          order: banner.order,
          createdAt: banner.createdAt
        };
      }
    });

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Banners retrieved successfully',
      data: transformedBanners
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error',
      error: error.message,
      data: null
    });
  }
};

// Get banner by ID (Public access - no authentication required)
exports.getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const banner = await Banner.findOne({
      where: {
        id,
        isActive: true
      }
    });

    if (!banner) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Banner not found',
        data: null
      });
    }

    // Transform data based on isDoctorApp flag
    let transformedBanner;
    if (banner.isDoctorApp) {
      // For doctor app (isDoctorApp = 1): return all fields
      transformedBanner = {
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        image: banner.image,
        isDoctorApp: banner.isDoctorApp,
        order: banner.order,
        createdAt: banner.createdAt
      };
    } else {
      // For patient app (isDoctorApp = 0): return only image
      transformedBanner = {
        id: banner.id,
        image: banner.image,
        order: banner.order,
        createdAt: banner.createdAt
      };
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Banner retrieved successfully',
      data: transformedBanner
    });
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error',
      error: error.message,
      data: null
    });
  }
};

// Create banner (Admin only)
exports.createBanner = async (req, res) => {
  try {
    const { title, subtitle, isDoctorApp, order } = req.body;

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      try {
        imageUrl = await uploadImage(req.file);
      } catch (uploadError) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Failed to upload banner image',
          error: uploadError.message,
          data: null
        });
      }
    } else {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Banner image is required',
        data: null
      });
    }

    // Create banner
    const banner = await Banner.create({
      title: title || null,
      subtitle: subtitle || null,
      image: imageUrl,
      isDoctorApp: isDoctorApp === 1 || isDoctorApp === '1' || isDoctorApp === true,
      order: order || 0,
      isActive: true
    });

    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Banner created successfully',
      data: {
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        image: banner.image,
        isDoctorApp: banner.isDoctorApp,
        order: banner.order,
        isActive: banner.isActive,
        createdAt: banner.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error',
      error: error.message,
      data: null
    });
  }
};

// Update banner (Admin only)
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, isDoctorApp, order, isActive } = req.body;

    // Find banner
    const banner = await Banner.findByPk(id);
    if (!banner) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Banner not found',
        data: null
      });
    }

    // Handle image upload if new image is provided
    let imageUrl = banner.image; // Keep existing image by default
    if (req.file) {
      try {
        imageUrl = await uploadImage(req.file);
      } catch (uploadError) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Failed to upload banner image',
          error: uploadError.message,
          data: null
        });
      }
    }

    // Update banner
    await banner.update({
      title: title !== undefined ? title : banner.title,
      subtitle: subtitle !== undefined ? subtitle : banner.subtitle,
      image: imageUrl,
      isDoctorApp: isDoctorApp !== undefined ? (isDoctorApp === 1 || isDoctorApp === '1' || isDoctorApp === true) : banner.isDoctorApp,
      order: order !== undefined ? order : banner.order,
      isActive: isActive !== undefined ? isActive : banner.isActive
    });

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Banner updated successfully',
      data: {
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        image: banner.image,
        isDoctorApp: banner.isDoctorApp,
        order: banner.order,
        isActive: banner.isActive,
        updatedAt: banner.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error',
      error: error.message,
      data: null
    });
  }
};

// Delete banner (Admin only)
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // Find banner
    const banner = await Banner.findByPk(id);
    if (!banner) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Banner not found',
        data: null
      });
    }

    // Delete banner
    await banner.destroy();

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Banner deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error',
      error: error.message,
      data: null
    });
  }
};

// Get all banners for admin (Admin only - returns all banners including inactive)
exports.getAllBannersAdmin = async (req, res) => {
  try {
    const { isDoctorApp, isActive, page = 1, limit = 10 } = req.query;
    
    // Build where conditions
    const where = {};
    
    // Filter by isDoctorApp if provided
    if (isDoctorApp !== undefined) {
      where.isDoctorApp = isDoctorApp === '1' || isDoctorApp === 'true';
    }
    
    // Filter by isActive if provided
    if (isActive !== undefined) {
      where.isActive = isActive === '1' || isActive === 'true';
    }

    const offset = (page - 1) * limit;

    // Get banners with pagination
    const { count, rows: banners } = await Banner.findAndCountAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Banners retrieved successfully',
      data: banners,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching banners for admin:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error',
      error: error.message,
      data: null
    });
  }
};

