const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Doctor = require('./doctor.model');
const VirtualDoctor = require('./virtualDoctor.model');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow NULL for virtual appointments
    references: {
      model: Doctor,
      key: 'id'
    }
  },
  virtualDoctorId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow NULL for physical appointments
    references: {
      model: VirtualDoctor,
      key: 'id'
    }
  },
  appointmentDateTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('physical', 'virtual'),
    defaultValue: 'physical'
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'confirmed',
      'completed',
      'canceled',
      'rejected',
      'reschedule_requested'
    ),
    defaultValue: 'pending'
  },

  videoCallLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: true
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  consultationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  cancelReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  canceledBy: {
    type: DataTypes.ENUM('patient', 'doctor', 'virtual-doctor'),
    allowNull: true
  },
  canceledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  originalDateTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Stores original appointment time when reschedule is requested'
  },
  requestedDateTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Stores new requested appointment time'
  },
  rescheduleReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rescheduleRequestedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rescheduleApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rescheduleRejectedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rescheduleRejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  bookingDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  azurePatientUserId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  azurePatientToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  azurePatientTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  azureDoctorUserId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  azureDoctorToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  azureDoctorTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  source: {
    type: DataTypes.ENUM('web', 'mobile', 'admin'),
    defaultValue: 'web'
  },

  // Virtual Doctor Tracking Fields
  confirmedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'User ID who confirmed the appointment (for virtual appointments)'
  },
  rejectedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'User ID who rejected the appointment (for virtual appointments)'
  },
  rescheduleApprovedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'User ID who approved the reschedule request (for virtual appointments)'
  },
  rescheduleRejectedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'User ID who rejected the reschedule request (for virtual appointments)'
  },
  canceledByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'User ID who canceled the appointment (for virtual appointments)'
  },
  completedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'User ID who completed the appointment (for virtual appointments)'
  },

  // Payment related fields
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'initiated', 'success', 'failed', 'refunded'),
    allowNull: true,
    defaultValue: 'pending',
    comment: 'Payment status for virtual appointments'
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Payment amount for virtual appointments'
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to payment record'
  },
  paymentRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether payment is required for this appointment'
  }
}, {
  tableName: 'appointments',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['doctorId']
    },
    {
      fields: ['appointmentDateTime']
    },
    {
      fields: ['status']
    },
    {
      fields: ['doctorId', 'appointmentDateTime']
    },
    {
      fields: ['virtualDoctorId']
    },
    {
      fields: ['virtualDoctorId', 'appointmentDateTime']
    },
    {
      fields: ['paymentStatus']
    },
    {
      fields: ['paymentRequired']
    },
    {
      fields: ['paymentId']
    }
  ]
});

User.hasMany(Appointment, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
Appointment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'patient'
});

Doctor.hasMany(Appointment, {
  foreignKey: 'doctorId',
  onDelete: 'CASCADE'
});
Appointment.belongsTo(Doctor, {
  foreignKey: 'doctorId',
  as: 'doctor'
});

VirtualDoctor.hasMany(Appointment, {
  foreignKey: 'virtualDoctorId',
  onDelete: 'CASCADE'
});
Appointment.belongsTo(VirtualDoctor, {
  foreignKey: 'virtualDoctorId',
  as: 'virtualDoctor'
});

Appointment.prototype.canBeRescheduled = function () {
  const now = new Date();
  const appointmentTime = new Date(this.appointmentDateTime);
  const timeDifference = appointmentTime.getTime() - now.getTime();
  const hoursUntilAppointment = timeDifference / (1000 * 60 * 60);

  return hoursUntilAppointment >= 24 && ['pending', 'confirmed'].includes(this.status);
};

Appointment.prototype.canBeCanceled = function () {
  return !['canceled', 'completed'].includes(this.status);
};

Appointment.prototype.isUpcoming = function () {
  const now = new Date();
  const appointmentTime = new Date(this.appointmentDateTime);
  return appointmentTime > now && ['confirmed', 'reschedule_requested'].includes(this.status);
};

Appointment.prototype.isPast = function () {
  const now = new Date();
  const appointmentTime = new Date(this.appointmentDateTime);
  return appointmentTime < now;
};

// Class methods
Appointment.getStatusCounts = async function (whereCondition = {}) {
  const statuses = ['pending', 'confirmed', 'completed', 'canceled', 'rejected', 'reschedule_requested'];
  const counts = {};

  for (const status of statuses) {
    counts[status] = await this.count({
      where: { ...whereCondition, status }
    });
  }

  return counts;
};

Appointment.getTodaysAppointments = async function (doctorId = null) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const whereCondition = {
    appointmentDateTime: { [Op.between]: [startOfDay, endOfDay] },
    status: { [Op.notIn]: ['canceled', 'rejected'] }
  };

  if (doctorId) {
    whereCondition.doctorId = doctorId;
  }

  return await this.findAll({
    where: whereCondition,
    include: [
      { model: User, as: 'patient', attributes: ['id', 'name', 'phone'] },
      { model: Doctor, as: 'doctor', include: [{ model: User, as: 'User', attributes: ['id', 'name'] }] }
    ],
    order: [['appointmentDateTime', 'ASC']]
  });
};

module.exports = Appointment;