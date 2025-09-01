const AdminSetting = require('../models/adminSetting.model');
const User = require('../models/user.model');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminSetting:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Admin setting ID
 *         userId:
 *           type: integer
 *           description: User ID of the admin
 *         virtualAppointmentStartTime:
 *           type: string
 *           format: time
 *           description: Start time for virtual appointments (HH:MM:SS)
 *           example: "09:00:00"
 *         virtualAppointmentEndTime:
 *           type: string
 *           format: time
 *           description: End time for virtual appointments (HH:MM:SS)
 *           example: "18:00:00"
 *         alertEmails:
 *           type: string
 *           description: Comma-separated list of email addresses for alerts
 *           example: "admin@example.com,manager@example.com"
 *         isActive:
 *           type: boolean
 *           description: Whether this admin setting is active
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     AdminSettingUpdate:
 *       type: object
 *       properties:
 *         virtualAppointmentStartTime:
 *           type: string
 *           format: time
 *           description: Start time for virtual appointments (HH:MM:SS)
 *           example: "09:00:00"
 *         virtualAppointmentEndTime:
 *           type: string
 *           format: time
 *           description: End time for virtual appointments (HH:MM:SS)
 *           example: "18:00:00"
 *         alertEmails:
 *           type: string
 *           description: Comma-separated list of email addresses for alerts
 *           example: "admin@example.com,manager@example.com"
 *         isActive:
 *           type: boolean
 *           description: Whether this admin setting is active
 *           example: true
 */

// Get admin settings for the authenticated admin user
exports.getAdminSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is admin
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Access denied. Admin role required.',
        data: null
      });
    }

    let adminSetting = await AdminSetting.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    // If no admin settings exist, create default ones
    if (!adminSetting) {
      adminSetting = await AdminSetting.create({
        userId,
        virtualAppointmentStartTime: '09:00:00',
        virtualAppointmentEndTime: '18:00:00',
        alertEmails: null,
        isActive: true
      });

      // Fetch with user data
      adminSetting = await AdminSetting.findOne({
        where: { userId },
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'name', 'phone', 'role']
          }
        ]
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Admin settings retrieved successfully',
      data: adminSetting
    });
  } catch (error) {
    console.error('Get Admin Settings Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to retrieve admin settings',
      data: null
    });
  }
};

// Update admin settings for the authenticated admin user
exports.updateAdminSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { virtualAppointmentStartTime, virtualAppointmentEndTime, alertEmails, isActive } = req.body;
    
    // Verify user is admin
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Access denied. Admin role required.',
        data: null
      });
    }

    // Validate time format (HH:MM:SS)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    
    if (virtualAppointmentStartTime && !timeRegex.test(virtualAppointmentStartTime)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid start time format. Use HH:MM:SS format.',
        data: null
      });
    }

    if (virtualAppointmentEndTime && !timeRegex.test(virtualAppointmentEndTime)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid end time format. Use HH:MM:SS format.',
        data: null
      });
    }

    // Validate that start time is before end time
    if (virtualAppointmentStartTime && virtualAppointmentEndTime) {
      const startTime = new Date(`2000-01-01T${virtualAppointmentStartTime}`);
      const endTime = new Date(`2000-01-01T${virtualAppointmentEndTime}`);
      
      if (startTime >= endTime) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Start time must be before end time.',
          data: null
        });
      }
    }

    // Validate email format if provided
    if (alertEmails) {
      const emailList = alertEmails.split(',').map(email => email.trim());
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      for (const email of emailList) {
        if (email && !emailRegex.test(email)) {
          return res.status(400).json({
            status: 'error',
            code: 400,
            message: `Invalid email format: ${email}`,
            data: null
          });
        }
      }
    }

    // Find or create admin settings
    let adminSetting = await AdminSetting.findOne({ where: { userId } });
    
    if (!adminSetting) {
      adminSetting = await AdminSetting.create({
        userId,
        virtualAppointmentStartTime: virtualAppointmentStartTime || '09:00:00',
        virtualAppointmentEndTime: virtualAppointmentEndTime || '18:00:00',
        alertEmails: alertEmails || null,
        isActive: isActive !== undefined ? isActive : true
      });
    } else {
      // Update existing settings
      const updateData = {};
      if (virtualAppointmentStartTime !== undefined) updateData.virtualAppointmentStartTime = virtualAppointmentStartTime;
      if (virtualAppointmentEndTime !== undefined) updateData.virtualAppointmentEndTime = virtualAppointmentEndTime;
      if (alertEmails !== undefined) updateData.alertEmails = alertEmails;
      if (isActive !== undefined) updateData.isActive = isActive;

      await adminSetting.update(updateData);
    }

    // Fetch updated settings with user data
    const updatedSetting = await AdminSetting.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Admin settings updated successfully',
      data: updatedSetting
    });
  } catch (error) {
    console.error('Update Admin Settings Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to update admin settings',
      data: null
    });
  }
};

// Get all admin settings (for super admin or system overview)
exports.getAllAdminSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is admin
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Access denied. Admin role required.',
        data: null
      });
    }

    const adminSettings = await AdminSetting.findAll({
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'All admin settings retrieved successfully',
      data: adminSettings
    });
  } catch (error) {
    console.error('Get All Admin Settings Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to retrieve admin settings',
      data: null
    });
  }
};

// Delete admin settings (for cleanup purposes)
exports.deleteAdminSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is admin
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Access denied. Admin role required.',
        data: null
      });
    }

    const adminSetting = await AdminSetting.findOne({ where: { userId } });
    
    if (!adminSetting) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Admin settings not found',
        data: null
      });
    }

    await adminSetting.destroy();

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Admin settings deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Delete Admin Settings Error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to delete admin settings',
      data: null
    });
  }
};

