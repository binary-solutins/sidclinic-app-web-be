const AdminSetting = require('../models/adminSetting.model');
const User = require('../models/user.model');

/**
 * Get admin settings for a specific admin user
 * @param {number} userId - The user ID of the admin
 * @returns {Promise<Object|null>} Admin settings object or null if not found
 */
exports.getAdminSettingsByUserId = async (userId) => {
  try {
    const adminSetting = await AdminSetting.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'phone', 'role']
        }
      ]
    });

    return adminSetting;
  } catch (error) {
    console.error('Error getting admin settings by user ID:', error);
    return null;
  }
};

/**
 * Get admin settings for the first active admin (fallback for system-wide settings)
 * @returns {Promise<Object|null>} Admin settings object or null if not found
 */
exports.getFirstActiveAdminSettings = async () => {
  try {
    const adminSetting = await AdminSetting.findOne({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'User',
          where: { role: 'admin' },
          attributes: ['id', 'name', 'phone', 'role']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return adminSetting;
  } catch (error) {
    console.error('Error getting first active admin settings:', error);
    return null;
  }
};

/**
 * Get virtual appointment time settings for a specific admin
 * @param {number} userId - The user ID of the admin
 * @returns {Promise<Object>} Object with startTime and endTime
 */
exports.getVirtualAppointmentTimes = async (userId) => {
  try {
    const adminSetting = await AdminSetting.findOne({
      where: { userId, isActive: true }
    });

    if (adminSetting) {
      return {
        startTime: adminSetting.virtualAppointmentStartTime,
        endTime: adminSetting.virtualAppointmentEndTime
      };
    }

    // Return default times if no settings found
    return {
      startTime: '09:00:00',
      endTime: '18:00:00'
    };
  } catch (error) {
    console.error('Error getting virtual appointment times:', error);
    // Return default times on error
    return {
      startTime: '09:00:00',
      endTime: '18:00:00'
    };
  }
};

/**
 * Get alert emails for a specific admin
 * @param {number} userId - The user ID of the admin
 * @returns {Promise<Array>} Array of email addresses
 */
exports.getAlertEmails = async (userId) => {
  try {
    const adminSetting = await AdminSetting.findOne({
      where: { userId, isActive: true }
    });

    if (adminSetting && adminSetting.alertEmails) {
      return adminSetting.alertEmails.split(',').map(email => email.trim()).filter(email => email);
    }

    return [];
  } catch (error) {
    console.error('Error getting alert emails:', error);
    return [];
  }
};

/**
 * Check if a given time is within virtual appointment hours for a specific admin
 * @param {string} time - Time in HH:MM:SS format
 * @param {number} userId - The user ID of the admin
 * @returns {Promise<boolean>} True if time is within appointment hours
 */
exports.isWithinVirtualAppointmentHours = async (time, userId) => {
  try {
    const times = await this.getVirtualAppointmentTimes(userId);
    
    const checkTime = new Date(`2000-01-01T${time}`);
    const startTime = new Date(`2000-01-01T${times.startTime}`);
    const endTime = new Date(`2000-01-01T${times.endTime}`);

    return checkTime >= startTime && checkTime <= endTime;
  } catch (error) {
    console.error('Error checking virtual appointment hours:', error);
    return false;
  }
};

/**
 * Get all active admin settings for system-wide operations
 * @returns {Promise<Array>} Array of active admin settings
 */
exports.getAllActiveAdminSettings = async () => {
  try {
    const adminSettings = await AdminSetting.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'User',
          where: { role: 'admin' },
          attributes: ['id', 'name', 'phone', 'role']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return adminSettings;
  } catch (error) {
    console.error('Error getting all active admin settings:', error);
    return [];
  }
};

/**
 * Create or update admin settings for a user
 * @param {number} userId - The user ID
 * @param {Object} settings - Settings object
 * @returns {Promise<Object>} Created or updated admin settings
 */
exports.createOrUpdateAdminSettings = async (userId, settings) => {
  try {
    const [adminSetting, created] = await AdminSetting.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        virtualAppointmentStartTime: settings.virtualAppointmentStartTime || '09:00:00',
        virtualAppointmentEndTime: settings.virtualAppointmentEndTime || '18:00:00',
        alertEmails: settings.alertEmails || null,
        isActive: settings.isActive !== undefined ? settings.isActive : true
      }
    });

    if (!created) {
      // Update existing settings
      const updateData = {};
      if (settings.virtualAppointmentStartTime !== undefined) {
        updateData.virtualAppointmentStartTime = settings.virtualAppointmentStartTime;
      }
      if (settings.virtualAppointmentEndTime !== undefined) {
        updateData.virtualAppointmentEndTime = settings.virtualAppointmentEndTime;
      }
      if (settings.alertEmails !== undefined) {
        updateData.alertEmails = settings.alertEmails;
      }
      if (settings.isActive !== undefined) {
        updateData.isActive = settings.isActive;
      }

      await adminSetting.update(updateData);
    }

    return adminSetting;
  } catch (error) {
    console.error('Error creating or updating admin settings:', error);
    throw error;
  }
};

