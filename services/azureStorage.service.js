const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class AzureStorageService {
  constructor() {
    // Azure Storage configuration from environment variables
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'sid-clinic-images';
    this.isConfigured = true;
    
    // Initialize Azure Blob Service Client
    if (this.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
    } else if (this.accountName && this.accountKey) {
      const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        credential
      );
    } else {
      console.warn('⚠️ Azure Storage configuration is missing. Azure Storage features will be disabled.');
      console.warn('   Please set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY');
      this.isConfigured = false;
      return;
    }

    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  /**
   * Upload a file to Azure Blob Storage
   * @param {Object} file - Multer file object
   * @param {string} folder - Optional folder path (e.g., 'dental-images', 'profile-images')
   * @returns {Promise<Object>} - Upload result with URL and metadata
   */
  async uploadFile(file, folder = 'general') {
    try {
      if (!this.isConfigured) {
        throw new Error('Azure Storage is not configured. Please set the required environment variables.');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${folder}/${uuidv4()}${fileExtension}`;
      
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      
      // Upload file
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
          blobCacheControl: 'public, max-age=31536000' // Cache for 1 year
        },
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString()
        }
      };

      const uploadResponse = await blockBlobClient.upload(
        file.buffer,
        file.buffer.length,
        uploadOptions
      );

      // Return file URL and metadata
      return {
        success: true,
        url: blockBlobClient.url,
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        contentType: file.mimetype,
        etag: uploadResponse.etag,
        lastModified: uploadResponse.lastModified
      };

    } catch (error) {
      console.error('Azure Blob Storage upload error:', error);
      throw new Error(`Failed to upload file to Azure Storage: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to Azure Blob Storage
   * @param {Array} files - Array of Multer file objects
   * @param {string} folder - Optional folder path
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadMultipleFiles(files, folder = 'general') {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, folder));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Azure Blob Storage multiple upload error:', error);
      throw new Error(`Failed to upload multiple files: ${error.message}`);
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   * @param {string} fileName - Name of the file to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(fileName) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      await blockBlobClient.delete();
      return true;
    } catch (error) {
      console.error('Azure Blob Storage delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get file metadata from Azure Blob Storage
   * @param {string} fileName - Name of the file
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(fileName) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      const properties = await blockBlobClient.getProperties();
      return {
        url: blockBlobClient.url,
        size: properties.contentLength,
        contentType: properties.contentType,
        lastModified: properties.lastModified,
        metadata: properties.metadata
      };
    } catch (error) {
      console.error('Azure Blob Storage metadata error:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for private access (if needed)
   * @param {string} fileName - Name of the file
   * @param {number} expiryMinutes - URL expiry time in minutes (default: 60)
   * @returns {Promise<string>} - Signed URL
   */
  async generateSignedUrl(fileName, expiryMinutes = 60) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + expiryMinutes);
      
      const signedUrl = await blockBlobClient.generateSasUrl({
        permissions: 'r', // Read permission
        expiresOn: expiryTime
      });
      
      return signedUrl;
    } catch (error) {
      console.error('Azure Blob Storage signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Check if container exists, create if not
   * @returns {Promise<boolean>} - Success status
   */
  async ensureContainerExists() {
    try {
      if (!this.isConfigured) {
        console.log('⚠️ Azure Storage not configured, skipping container creation');
        return false;
      }

      const exists = await this.containerClient.exists();
      if (!exists) {
        await this.containerClient.create({
          access: 'blob', // Public read access
          metadata: {
            createdBy: 'sid-clinic-backend',
            createdAt: new Date().toISOString()
          }
        });
        console.log(`Azure Storage container '${this.containerName}' created successfully`);
      }
      return true;
    } catch (error) {
      console.error('Azure Storage container creation error:', error);
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }
}

// Create singleton instance
const azureStorageService = new AzureStorageService();

// Initialize container on startup
azureStorageService.ensureContainerExists()
  .then(() => {
    console.log('Azure Blob Storage service initialized successfully');
  })
  .catch((error) => {
    console.error('Failed to initialize Azure Blob Storage:', error);
  });

module.exports = azureStorageService;

