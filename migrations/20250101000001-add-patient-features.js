'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add profileImage column to patients table
    await queryInterface.addColumn('Patients', 'profileImage', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Appwrite URL to patient profile image'
    });

    // Create OralHealthScores table
    await queryInterface.createTable('OralHealthScores', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      patientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 100
        }
      },
      assessmentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      assessedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Doctor ID who assessed the score'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for OralHealthScores
    await queryInterface.addIndex('OralHealthScores', ['patientId']);
    await queryInterface.addIndex('OralHealthScores', ['assessmentDate']);

    // Create MedicalReports table
    await queryInterface.createTable('MedicalReports', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      patientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Appwrite URL to the uploaded file'
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes'
      },
      fileType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'MIME type of the file'
      },
      reportType: {
        type: Sequelize.ENUM('X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other'),
        allowNull: false,
        defaultValue: 'Other'
      },
      uploadDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User ID who uploaded the report'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for MedicalReports
    await queryInterface.addIndex('MedicalReports', ['patientId']);
    await queryInterface.addIndex('MedicalReports', ['reportType']);
    await queryInterface.addIndex('MedicalReports', ['uploadDate']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop MedicalReports table
    await queryInterface.dropTable('MedicalReports');
    
    // Drop OralHealthScores table
    await queryInterface.dropTable('OralHealthScores');
    
    // Remove profileImage column from patients table
    await queryInterface.removeColumn('Patients', 'profileImage');
  }
}; 