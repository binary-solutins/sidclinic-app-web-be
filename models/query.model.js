const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Query = sequelize.define('Query', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000]
    }
  },
  category: {
    type: DataTypes.ENUM(
      'Technical Support',
      'Account Issues',
      'Billing',
      'Medical Inquiry',
      'Appointment Issues',
      'Feature Request',
      'Bug Report',
      'General'
    ),
    allowNull: false,
    defaultValue: 'General'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: false,
    defaultValue: 'Medium'
  },
  status: {
    type: DataTypes.ENUM('Open', 'In Progress', 'Resolved', 'Closed'),
    allowNull: false,
    defaultValue: 'Open'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  adminResponse: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'queries',
  timestamps: true
});

Query.associate = function(models) {
  // Query belongs to User (who created the query)
  Query.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // Query belongs to Admin User (who responded to the query)
  Query.belongsTo(models.User, {
    foreignKey: 'adminId',
    as: 'admin'
  });
  
  // Query belongs to Assigned User (who is assigned to handle the query)
  Query.belongsTo(models.User, {
    foreignKey: 'assignedTo',
    as: 'assignedUser'
  });
};


module.exports = Query;