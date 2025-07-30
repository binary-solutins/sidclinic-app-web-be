/**
 * @swagger
 * components:
 *   schemas:
 *     Query:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - category
 *         - priority
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Appointment booking issue"
 *           maxLength: 200
 *         description:
 *           type: string
 *           example: "I'm unable to book an appointment for tomorrow"
 *           maxLength: 2000
 *         category:
 *           type: string
 *           enum: [General, Technical, Billing, Appointment, Medical, Other]
 *           example: "Appointment"
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
 *           example: "Medium"
 *         status:
 *           type: string
 *           enum: [Open, In Progress, Resolved, Closed]
 *           example: "Open"
 *         raisedBy:
 *           type: integer
 *           example: 1
 *         raisedByRole:
 *           type: string
 *           enum: [user, doctor]
 *           example: "user"
 *         assignedTo:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://example.com/file1.jpg"]
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         resolution:
 *           type: string
 *           nullable: true
 *           example: "Issue resolved by updating the booking system"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateQueryRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - category
 *         - priority
 *       properties:
 *         title:
 *           type: string
 *           example: "Appointment booking issue"
 *         description:
 *           type: string
 *           example: "I'm unable to book an appointment for tomorrow"
 *         category:
 *           type: string
 *           enum: [General, Technical, Billing, Appointment, Medical, Other]
 *           example: "Appointment"
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
 *           example: "Medium"
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://example.com/file1.jpg"]
 *     UpdateQueryRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Updated appointment booking issue"
 *         description:
 *           type: string
 *           example: "Updated description of the issue"
 *         category:
 *           type: string
 *           enum: [General, Technical, Billing, Appointment, Medical, Other]
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
 *         status:
 *           type: string
 *           enum: [Open, In Progress, Resolved, Closed]
 *         assignedTo:
 *           type: integer
 *           example: 2
 *         resolution:
 *           type: string
 *           example: "Issue resolved by updating the booking system"
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *     QueryResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Query created successfully"
 *         data:
 *           $ref: '#/components/schemas/Query'
 *     QueryListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Queries retrieved successfully"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Query'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 10
 *             total:
 *               type: integer
 *               example: 25
 *             totalPages:
 *               type: integer
 *               example: 3
 */

const Query = require('../models/query.model');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const { Op } = require('sequelize');

/**
 * Create a new query
 */
const createQuery = async (req, res) => {
  try {
    const { title, description, category, priority, attachments } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate user role
    if (!['user', 'doctor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only users and doctors can create queries'
      });
    }

    const query = await Query.create({
      title,
      description,
      category,
      priority,
      raisedBy: userId,
      raisedByRole: userRole,
      attachments: attachments || []
    });

    // Fetch the created query with user details
    const queryWithUser = await Query.findByPk(query.id, {
      include: [
        {
          model: User,
          as: 'RaisedByUser',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Query created successfully',
      data: queryWithUser
    });
  } catch (error) {
    console.error('Create query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create query',
      error: error.message
    });
  }
};

/**
 * Get all queries with filtering and pagination
 */
const getAllQueries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      raisedByRole,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { isActive: true };

    // Add filters
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (raisedByRole) where.raisedByRole = raisedByRole;

    // Add search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Query.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'RaisedByUser',
          attributes: ['id', 'name', 'phone', 'role']
        },
        {
          model: User,
          as: 'AssignedToUser',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      message: 'Queries retrieved successfully',
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get queries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve queries',
      error: error.message
    });
  }
};

/**
 * Get queries by current user
 */
const getMyQueries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;
    const where = { 
      raisedBy: userId,
      isActive: true 
    };

    if (status) where.status = status;

    const { count, rows } = await Query.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'AssignedToUser',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      message: 'Your queries retrieved successfully',
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get my queries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your queries',
      error: error.message
    });
  }
};

/**
 * Get query by ID
 */
const getQueryById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = await Query.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'RaisedByUser',
          attributes: ['id', 'name', 'phone', 'role']
        },
        {
          model: User,
          as: 'AssignedToUser',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    res.json({
      success: true,
      message: 'Query retrieved successfully',
      data: query
    });
  } catch (error) {
    console.error('Get query by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve query',
      error: error.message
    });
  }
};

/**
 * Update query
 */
const updateQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const query = await Query.findByPk(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Check permissions
    if (userRole === 'admin') {
      // Admin can update any query
    } else if (query.raisedBy === userId) {
      // User can only update their own queries
      // Remove fields that users shouldn't be able to update
      delete updateData.assignedTo;
      delete updateData.status;
      delete updateData.resolution;
    } else {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own queries'
      });
    }

    await query.update(updateData);

    // Fetch updated query with user details
    const updatedQuery = await Query.findByPk(id, {
      include: [
        {
          model: User,
          as: 'RaisedByUser',
          attributes: ['id', 'name', 'phone', 'role']
        },
        {
          model: User,
          as: 'AssignedToUser',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Query updated successfully',
      data: updatedQuery
    });
  } catch (error) {
    console.error('Update query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update query',
      error: error.message
    });
  }
};

/**
 * Delete query (soft delete)
 */
const deleteQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const query = await Query.findByPk(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Check permissions
    if (userRole === 'admin') {
      // Admin can delete any query
    } else if (query.raisedBy === userId) {
      // User can only delete their own queries
    } else {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own queries'
      });
    }

    await query.update({ isActive: false });

    res.json({
      success: true,
      message: 'Query deleted successfully'
    });
  } catch (error) {
    console.error('Delete query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete query',
      error: error.message
    });
  }
};

/**
 * Assign query to admin/support
 */
const assignQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can assign queries'
      });
    }

    const query = await Query.findByPk(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    await query.update({ assignedTo });

    const updatedQuery = await Query.findByPk(id, {
      include: [
        {
          model: User,
          as: 'RaisedByUser',
          attributes: ['id', 'name', 'phone', 'role']
        },
        {
          model: User,
          as: 'AssignedToUser',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Query assigned successfully',
      data: updatedQuery
    });
  } catch (error) {
    console.error('Assign query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign query',
      error: error.message
    });
  }
};

/**
 * Get query statistics
 */
const getQueryStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view query statistics'
      });
    }

    const stats = await Query.findAll({
      attributes: [
        'status',
        'category',
        'priority',
        [Query.sequelize.fn('COUNT', Query.sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['status', 'category', 'priority'],
      raw: true
    });

    // Process stats into a more readable format
    const processedStats = {
      byStatus: {},
      byCategory: {},
      byPriority: {},
      total: 0
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      processedStats.total += count;

      // Group by status
      if (!processedStats.byStatus[stat.status]) {
        processedStats.byStatus[stat.status] = 0;
      }
      processedStats.byStatus[stat.status] += count;

      // Group by category
      if (!processedStats.byCategory[stat.category]) {
        processedStats.byCategory[stat.category] = 0;
      }
      processedStats.byCategory[stat.category] += count;

      // Group by priority
      if (!processedStats.byPriority[stat.priority]) {
        processedStats.byPriority[stat.priority] = 0;
      }
      processedStats.byPriority[stat.priority] += count;
    });

    res.json({
      success: true,
      message: 'Query statistics retrieved successfully',
      data: processedStats
    });
  } catch (error) {
    console.error('Get query stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve query statistics',
      error: error.message
    });
  }
};

module.exports = {
  createQuery,
  getAllQueries,
  getMyQueries,
  getQueryById,
  updateQuery,
  deleteQuery,
  assignQuery,
  getQueryStats
}; 