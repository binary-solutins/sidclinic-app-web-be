const Blog = require('../models/blog.model');
const User = require('../models/user.model');
const azureStorageService = require('../services/azureStorage.service');
const { Op } = require('sequelize'); // Added Op for search functionality

// Helper function to upload image to Azure Blob Storage
const uploadImage = async (file) => {
  try {
    const result = await azureStorageService.uploadFile(file, 'blog-images');
    return result.url;
  } catch (error) {
    console.error('Error uploading image to Azure Storage:', error.message);
    throw new Error('Image upload failed');
  }
};
// Create a new blog post
exports.createBlog = async (req, res) => {
  try {
    const { title, content, category, tags, status, is_featured, meta_title, meta_description } = req.body;
    
    // Check if user is admin or doctor
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Unauthorized: Only admins and doctors can create blogs',
        data: null
      });
    }
    
    let coverImageUrl = null;
    
    // Handle cover image upload if provided
    if (req.file) {
      coverImageUrl = await uploadImage(req.file);
    }
    
    // Create blog post
    const blog = await Blog.create({
      userId: req.user.id,
      title,
      content,
      coverImage: coverImageUrl,
      category,
      tags: tags ? JSON.parse(tags) : null,
      status,
      is_featured: is_featured === 'true',
      meta_title,
      meta_description,
      published_at: status === 'published' ? new Date() : null
    });
    
    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'Blog created successfully',
      data: blog
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null,
      
    });
  }
};

// Update blog post
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, status, is_featured, meta_title, meta_description } = req.body;
    
    // Find the blog post
    const blog = await Blog.findByPk(id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Blog not found',
        data: null
      });
    }
    
    // Check if user is admin or the author of the blog
    if (req.user.role !== 'admin' && blog.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Unauthorized: You can only update your own blogs',
        data: null
      });
    }
    
    // Handle cover image upload if provided
    let coverImageUrl = blog.coverImage;
    if (req.file) {
      coverImageUrl = await uploadImage(req.file);
    }
    
    // Update blog post
    const updateData = {
      title,
      content,
      coverImage: coverImageUrl,
      category,
      tags: tags ? JSON.parse(tags) : blog.tags,
      status,
      is_featured: is_featured === 'true',
      meta_title,
      meta_description
    };
    
    // If status is changing from draft to published, update published_at
    if (blog.status === 'draft' && status === 'published') {
      updateData.published_at = new Date();
    }
    
    await blog.update(updateData);
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Blog updated successfully',
      data: await blog.reload()
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Get all blogs (with filters)
exports.getAllBlogs = async (req, res) => {
  try {
    const { category, status, featured, page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    
    // Build query conditions
    const where = {};
    
    // Add filters if provided
    if (category) where.category = category;
    if (status) where.status = status;
    if (featured === 'true') where.is_featured = true;
    
    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { meta_title: { [Op.iLike]: `%${search}%` } },
        { meta_description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Only published blogs are visible to public
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'doctor')) {
      where.status = 'published';
      where.is_active = true;
    }
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Sorting - Always ensure DESC order for recent first
    let order = [];
    if (sortBy === 'title' || sortBy === 'category' || sortBy === 'status' || 
        sortBy === 'is_featured' || sortBy === 'view_count' || sortBy === 'published_at' || 
        sortBy === 'createdAt' || sortBy === 'updatedAt') {
      // For all fields, if ASC is requested, still add createdAt DESC as secondary sort
      if (sortOrder.toUpperCase() === 'ASC') {
        order.push([sortBy, 'ASC'], ['createdAt', 'DESC']);
      } else {
        order.push([sortBy, sortOrder.toUpperCase()]);
      }
    } else {
      order.push(['createdAt', 'DESC']);
    }
    
    // Get blogs with pagination
    const { count, rows: blogs } = await Blog.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'role']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order
    });
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Blogs retrieved successfully',
      data: {
        blogs,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          perPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting all blogs:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Get blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findByPk(id, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'role']
      }]
    });
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Blog not found',
        data: null
      });
    }
    
  
    
    // Increment view count for published blogs
    if (blog.status === 'published') {
      await blog.update({ view_count: blog.view_count + 1 });
    }
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Blog retrieved successfully',
      data: blog
    });
  } catch (error) {
    console.error('Error getting blog by ID:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findByPk(id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Blog not found',
        data: null
      });
    }
    
    // Check if user is admin or the author of the blog
    if (req.user.role !== 'admin' && blog.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Unauthorized: You can only delete your own blogs',
        data: null
      });
    }
    
    await blog.destroy();
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Blog deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Get blogs by user ID
exports.getBlogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    
    // Build query conditions
    const where = { userId };
    
    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Only published blogs are visible to public
    if (!req.user || (req.user.role !== 'admin' && req.user.id !== parseInt(userId))) {
      where.status = 'published';
      where.is_active = true;
    }
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Sorting - Always ensure DESC order for recent first
    let order = [];
    if (sortBy === 'title' || sortBy === 'category' || sortBy === 'status' || 
        sortBy === 'is_featured' || sortBy === 'view_count' || sortBy === 'published_at' || 
        sortBy === 'createdAt' || sortBy === 'updatedAt') {
      // For all fields, if ASC is requested, still add createdAt DESC as secondary sort
      if (sortOrder.toUpperCase() === 'ASC') {
        order.push([sortBy, 'ASC'], ['createdAt', 'DESC']);
      } else {
        order.push([sortBy, sortOrder.toUpperCase()]);
      }
    } else {
      order.push(['createdAt', 'DESC']);
    }
    
    // Get blogs with pagination
    const { count, rows: blogs } = await Blog.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'role']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order
    });
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'User blogs retrieved successfully',
      data: {
        blogs,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          perPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting blogs by user ID:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Toggle blog active status (Admin only)
exports.toggleBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Unauthorized: Only admins can toggle blog status',
        data: null
      });
    }
    
    const blog = await Blog.findByPk(id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Blog not found',
        data: null
      });
    }
    
    // Toggle status
    await blog.update({ is_active: !blog.is_active });
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: `Blog ${blog.is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        is_active: blog.is_active
      }
    });
  } catch (error) {
    console.error('Error toggling blog status:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Toggle featured status (Admin only)
exports.toggleFeaturedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Unauthorized: Only admins can toggle featured status',
        data: null
      });
    }
    
    const blog = await Blog.findByPk(id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Blog not found',
        data: null
      });
    }
    
    // Toggle featured status
    await blog.update({ is_featured: !blog.is_featured });
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: `Blog ${blog.is_featured ? 'featured' : 'unfeatured'} successfully`,
      data: {
        is_featured: blog.is_featured
      }
    });
  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Get featured blogs
exports.getFeaturedBlogs = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const blogs = await Blog.findAll({
      where: {
        is_featured: true,
        status: 'published',
        is_active: true
      },
      include: [{
        model: User,
        attributes: ['id', 'name', 'role']
      }],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Featured blogs retrieved successfully',
      data: blogs
    });
  } catch (error) {
    console.error('Error getting featured blogs:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};


exports.getAllBlogsAdmin = async (req, res) => {
  try {
    const { category, status, featured, page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    
    // Build query conditions
    const where = {};
    
    // Add filters if provided
    if (category) where.category = category;
    if (status) where.status = status;
    if (featured === 'true') where.is_featured = true;
    
    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { meta_title: { [Op.iLike]: `%${search}%` } },
        { meta_description: { [Op.iLike]: `%${search}%` } }
      ];
    }
  
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Sorting - Always ensure DESC order for recent first
    let order = [];
    if (sortBy === 'title' || sortBy === 'category' || sortBy === 'status' || 
        sortBy === 'is_featured' || sortBy === 'view_count' || sortBy === 'published_at' || 
        sortBy === 'createdAt' || sortBy === 'updatedAt') {
      // For all fields, if ASC is requested, still add createdAt DESC as secondary sort
      if (sortOrder.toUpperCase() === 'ASC') {
        order.push([sortBy, 'ASC'], ['createdAt', 'DESC']);
      } else {
        order.push([sortBy, sortOrder.toUpperCase()]);
      }
    } else {
      order.push(['createdAt', 'DESC']);
    }
    
    // Get blogs with pagination
    const { count, rows: blogs } = await Blog.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'role']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order
    });
    
    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Blogs retrieved successfully',
      data: {
        blogs,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          perPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting all blogs:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};