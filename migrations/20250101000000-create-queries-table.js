'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Queries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          len: [1, 200]
        }
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
          len: [10, 2000]
        }
      },
      category: {
        type: Sequelize.ENUM('General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other'),
        allowNull: false,
        defaultValue: 'General'
      },
      priority: {
        type: Sequelize.ENUM('Low', 'Medium', 'High', 'Urgent'),
        allowNull: false,
        defaultValue: 'Medium'
      },
      status: {
        type: Sequelize.ENUM('Open', 'In Progress', 'Resolved', 'Closed'),
        allowNull: false,
        defaultValue: 'Open'
      },
      raisedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      raisedByRole: {
        type: Sequelize.ENUM('user', 'doctor'),
        allowNull: false
      },
      assignedTo: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolution: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('Queries', ['raisedBy']);
    await queryInterface.addIndex('Queries', ['status']);
    await queryInterface.addIndex('Queries', ['category']);
    await queryInterface.addIndex('Queries', ['priority']);
    await queryInterface.addIndex('Queries', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Queries');
  }
}; 