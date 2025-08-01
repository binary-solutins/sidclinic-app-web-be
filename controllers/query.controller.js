const Query = require("../models/query.model");
const User = require("../models/user.model");
const { Op } = require('sequelize');
const { emailService } = require('../services/email.services');
const sequelize = require("../config/db");

// Create a new query (User/Doctor)
exports.createQuery = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, category, priority, attachments, tags, isPublic } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Title and description are required",
        data: null
      });
    }

    const query = await Query.create({
      userId,
      title,
      description,
      category: category || 'General',
      priority: priority || 'Medium',
      attachments: attachments || [],
      tags: tags || [],
      isPublic: isPublic || false
    });

    // Fetch the created query with user details
    const createdQuery = await Query.findByPk(query.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    // Send notification email to admin (optional)
    try {
      const emailData = {
        queryId: query.id,
        userName: req.user.name,
        userRole: req.user.role,
        title: query.title,
        category: query.category,
        priority: query.priority,
        description: query.description.substring(0, 200) + '...',
        dashboardUrl: `${process.env.ADMIN_URL || 'http://localhost:3000'}/admin/queries/${query.id}`
      };

      await emailService.sendAppointmentEmail(
        process.env.ADMIN_EMAIL,
        'new_query_notification',
        emailData
      );
    } catch (emailError) {
      console.error('Error sending query notification email:', emailError);
    }

    res.status(201).json({
      status: "success",
      code: 201,
      message: "Query created successfully",
      data: createdQuery
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

// Get all queries for the logged-in user
exports.getUserQueries = async (req, res) => {
  try {
    const userId = req.user.id;
    let { page = 1, limit = 10, status, category, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const where = { userId };
    
    if (status) {
      where.status = status;
    }
    
    if (category) {
      where.category = category;
    }

    // Sorting
    let order = [];
    if (['createdAt', 'updatedAt', 'title', 'priority', 'status'].includes(sortBy)) {
      order.push([sortBy, sortOrder.toUpperCase()]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    const { count, rows: queries } = await Query.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order,
      limit,
      offset
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "User queries retrieved successfully",
      data: queries,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
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

// Get query details by ID (User can only see their own queries)
exports.getQueryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const where = { id };
    
    // Non-admin users can only see their own queries
    if (userRole !== 'admin') {
      where.userId = userId;
    }

    const query = await Query.findOne({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'role']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    if (!query) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Query not found",
        data: null
      });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Query details retrieved successfully",
      data: query
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

// Update query (User can only update their own queries and only certain fields)
exports.updateQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, category, priority, attachments, tags, isPublic } = req.body;

    const query = await Query.findOne({
      where: { id, userId }
    });

    if (!query) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Query not found or you don't have permission to update it",
        data: null
      });
    }

    // Users can only update open queries
    if (query.status !== 'Open') {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Cannot update query that is not in Open status",
        data: null
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (priority) updateData.priority = priority;
    if (attachments) updateData.attachments = attachments;
    if (tags) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    await query.update(updateData);

    const updatedQuery = await Query.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Query updated successfully",
      data: updatedQuery
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

// Delete query (User can only delete their own open queries)
exports.deleteQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = await Query.findOne({
      where: { id, userId }
    });

    if (!query) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Query not found or you don't have permission to delete it",
        data: null
      });
    }

    // Users can only delete open queries
    if (query.status !== 'Open') {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Cannot delete query that is not in Open status",
        data: null
      });
    }

    await query.destroy();

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Query deleted successfully",
      data: null
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

// Admin: Get all queries with advanced filtering
exports.getAllQueries = async (req, res) => {
  try {
    let { 
      page = 1, 
      limit = 10, 
      search = '', 
      status, 
      category, 
      priority, 
      userId, 
      assignedTo,
      sortBy = 'createdAt', 
      sortOrder = 'DESC',
      dateFrom,
      dateTo,
      isPublic
    } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const where = {};
    const userWhere = {};
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { adminResponse: { [Op.iLike]: `%${search}%` } }
      ];
      userWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (userId) where.userId = userId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (isPublic !== undefined) where.isPublic = isPublic;

    // Date filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    // Sorting
    let order = [];
    if (['createdAt', 'updatedAt', 'title', 'priority', 'status', 'resolvedAt'].includes(sortBy)) {
      order.push([sortBy, sortOrder.toUpperCase()]);
    } else if (sortBy === 'userName') {
      order.push([{ model: User, as: 'user' }, 'name', sortOrder.toUpperCase()]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    const { count, rows: queries } = await Query.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'role'],
          where: Object.keys(userWhere).length ? userWhere : undefined
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order,
      limit,
      offset
    });

    // Get statistics
    const stats = await Query.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const statistics = {
      total: count,
      open: stats.find(s => s.status === 'Open')?.count || 0,
      inProgress: stats.find(s => s.status === 'In Progress')?.count || 0,
      resolved: stats.find(s => s.status === 'Resolved')?.count || 0,
      closed: stats.find(s => s.status === 'Closed')?.count || 0
    };

    res.status(200).json({
      status: "success",
      code: 200,
      message: "All queries retrieved successfully",
      data: queries,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      },
      statistics
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

// Admin: Respond to query
exports.respondToQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { adminResponse, status, assignedTo } = req.body;

    if (!adminResponse) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Admin response is required",
        data: null
      });
    }

    const query = await Query.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    if (!query) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Query not found",
        data: null
      });
    }

    const updateData = {
      adminResponse,
      adminId,
      status: status || 'In Progress'
    };

    if (assignedTo) updateData.assignedTo = assignedTo;
    if (status === 'Resolved' || status === 'Closed') {
      updateData.resolvedAt = new Date();
    }

    await query.update(updateData);

    // Send email notification to user
    try {
      const emailData = {
        userName: query.user.name,
        queryTitle: query.title,
        queryId: query.id,
        adminResponse: adminResponse,
        status: updateData.status,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/queries/${query.id}`
      };

      await emailService.sendAppointmentEmail(
        query.user.email || `${query.user.phone}@temp.com`,
        'query_response',
        emailData
      );
    } catch (emailError) {
      console.error('Error sending query response email:', emailError);
    }

    const updatedQuery = await Query.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'role']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Query response added successfully",
      data: updatedQuery
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

// Admin: Update query status
exports.updateQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    if (!status) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Status is required",
        data: null
      });
    }

    const query = await Query.findByPk(id);

    if (!query) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Query not found",
        data: null
      });
    }

    const updateData = { status };
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (status === 'Resolved' || status === 'Closed') {
      updateData.resolvedAt = new Date();
    }

    await query.update(updateData);

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Query status updated successfully",
      data: { status: query.status, assignedTo: query.assignedTo }
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

// Admin: Delete query
exports.deleteQueryAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const query = await Query.findByPk(id);

    if (!query) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Query not found",
        data: null
      });
    }

    await query.destroy();

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Query deleted successfully",
      data: null
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

// User: Rate resolved query
exports.rateQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Rating must be between 1 and 5",
        data: null
      });
    }

    const query = await Query.findOne({
      where: { id, userId, status: 'Resolved' }
    });

    if (!query) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Query not found or not resolved yet",
        data: null
      });
    }

    await query.update({ rating, feedback });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Query rated successfully",
      data: { rating, feedback }
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

// Get public queries (FAQ-like)
exports.getPublicQueries = async (req, res) => {
  try {
    let { page = 1, limit = 10, category, search = '' } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const where = { 
      isPublic: true, 
      status: 'Resolved'
    };
    
    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { adminResponse: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: queries } = await Query.findAndCountAll({
      where,
      attributes: ['id', 'title', 'description', 'category', 'adminResponse', 'createdAt', 'rating'],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Public queries retrieved successfully",
      data: queries,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
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