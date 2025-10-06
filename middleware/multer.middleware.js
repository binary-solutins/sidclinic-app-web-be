const multer = require('multer');

// Centralized multer middleware factory
class MulterMiddleware {
  constructor() {
    // Default configuration for most uploads
    this.defaultConfig = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 4 * 1024 * 1024, // 4MB limit
        files: 10 // Maximum 10 files
      },
      fileFilter: (req, file, cb) => {
        // Allow only image files
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });

    // Large file configuration for medical reports
    this.largeFileConfig = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit for medical reports
        files: 5
      },
      fileFilter: (req, file, cb) => {
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
    });

    // Form data only (no files)
    this.formDataConfig = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 0 // No file uploads allowed
      }
    });
  }

  // Standard image upload (4MB limit)
  imageUpload() {
    return this.defaultConfig.single('image');
  }

  // Multiple images upload (4MB per file, max 10 files)
  multipleImages() {
    return this.defaultConfig.array('images', 10);
  }

  // Multiple images with field names (4MB per file, max 5 files)
  multipleImagesWithFields() {
    return this.defaultConfig.fields([
      { name: 'images', maxCount: 5 },
      { name: 'documents', maxCount: 3 }
    ]);
  }

  // Large file upload (25MB limit)
  largeFileUpload() {
    return this.largeFileConfig.single('file');
  }

  // Multiple large files (25MB per file, max 3 files)
  multipleLargeFiles() {
    return this.largeFileConfig.array('files', 3);
  }

  // Form data only (no files)
  formDataOnly() {
    return this.formDataConfig.none();
  }

  // Custom configuration
  custom(options = {}) {
    const defaultOptions = {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 4 * 1024 * 1024, // 4MB default
        files: 10
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    };

    const config = { ...defaultOptions, ...options };
    return multer(config);
  }
}

// Create singleton instance
const multerMiddleware = new MulterMiddleware();

// Error handling middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum size is 4MB for images',
        data: null
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed',
        data: null
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
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

module.exports = {
  multerMiddleware,
  handleMulterError
};
