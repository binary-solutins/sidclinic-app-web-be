const multer = require('multer');

// Centralized multer configurations for different use cases
const multerConfigs = {
  // Standard image upload (25MB limit)
  imageUpload: multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    }
  }),

  // Medical report upload (50MB limit)
  medicalReportUpload: multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit for medical reports
    },
    fileFilter: (req, file, cb) => {
      // Allow common document types
      const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, Word documents, and image files are allowed'), false);
      }
    }
  }),

  // Multiple images upload (25MB per file, max 10 files)
  multipleImagesUpload: multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit per file
      files: 10 // Maximum 10 files per upload
    },
    fileFilter: (req, file, cb) => {
      // Allow only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    }
  }),

  // Doctor profile upload (25MB per file, max 5 clinic photos)
  doctorProfileUpload: multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit per file
      files: 5 // Maximum 5 clinic photos
    },
    fileFilter: (req, file, cb) => {
      // Allow only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    }
  }),

  // Report analysis upload (10MB per file, exactly 3 files)
  reportAnalysisUpload: multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
      files: 3 // Exactly 3 files required
    },
    fileFilter: (req, file, cb) => {
      // Allow only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    }
  })
};

// Error handling middleware factory
const createMulterErrorHandler = (maxSize = '25MB', maxFiles = null) => {
  return (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${maxSize}`,
          data: null
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT' && maxFiles) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles} files allowed per upload`,
          data: null
        });
      }
    }
    
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed',
        data: null
      });
    }
    
    if (error.message === 'Only PDF, Word documents, and image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF, Word documents, and image files are allowed',
        data: null
      });
    }
    
    next(error);
  };
};

module.exports = {
  multerConfigs,
  createMulterErrorHandler
};

