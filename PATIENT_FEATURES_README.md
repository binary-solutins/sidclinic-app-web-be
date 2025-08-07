# Patient Features Implementation

This document outlines the new features implemented for patient management in the SID Clinic Backend.

## New Features Added

### 1. Patient Profile Images
- **Feature**: Patients can now upload and manage their profile images
- **Storage**: Images are stored in Appwrite cloud storage
- **File Naming**: Unique filenames with UUID generation
- **Supported Formats**: Common image formats (JPEG, PNG, WebP, etc.)

#### API Endpoints:
- `POST /api/patients/profile-image` - Upload profile image
- `GET /api/patients/profile-image` - Get profile image URL

### 2. Medical Reports Management
- **Feature**: Upload, manage, and download medical reports/documents
- **Storage**: Files stored in Appwrite cloud storage
- **Report Types**: X-Ray, Blood Test, Dental Report, Medical Certificate, Prescription, Other
- **File Management**: Soft delete functionality, file size tracking, MIME type detection

#### API Endpoints:
- `POST /api/medical-reports` - Upload medical report
- `GET /api/medical-reports/patient/:patientId` - Get patient's medical reports
- `GET /api/medical-reports/:id/download` - Get medical report download URL
- `PUT /api/medical-reports/:id` - Update medical report details
- `DELETE /api/medical-reports/:id` - Delete medical report (soft delete)
- `GET /api/medical-reports` - Get all medical reports (admin/doctor dashboard)

### 3. Oral Health Scores
- **Feature**: Track and manage oral health scores for each patient
- **Score Range**: 0-100 scale
- **Assessment Tracking**: Date, notes, and doctor who assessed
- **History**: Complete history of all assessments per patient

#### API Endpoints:
- `POST /api/oral-health-scores` - Add oral health score
- `GET /api/oral-health-scores/patient/:patientId` - Get patient's oral health scores
- `GET /api/oral-health-scores/patient/:patientId/latest` - Get latest oral health score
- `PUT /api/oral-health-scores/:id` - Update oral health score
- `DELETE /api/oral-health-scores/:id` - Delete oral health score
- `GET /api/oral-health-scores` - Get all oral health scores (admin/doctor dashboard)

## Database Schema Changes

### Patients Table
Added `profileImage` field:
```sql
ALTER TABLE Patients ADD COLUMN profileImage VARCHAR(255) COMMENT 'Appwrite URL to patient profile image';
```

### New Tables

#### OralHealthScores Table
```sql
CREATE TABLE OralHealthScores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  assessmentDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  assessedBy INT COMMENT 'Doctor ID who assessed the score',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE,
  INDEX idx_patientId (patientId),
  INDEX idx_assessmentDate (assessmentDate)
);
```

#### MedicalReports Table
```sql
CREATE TABLE MedicalReports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  filePath VARCHAR(255) NOT NULL COMMENT 'Appwrite URL to the uploaded file',
  fileName VARCHAR(255) NOT NULL,
  fileSize INT COMMENT 'File size in bytes',
  fileType VARCHAR(100) COMMENT 'MIME type of the file',
  reportType ENUM('X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other') NOT NULL DEFAULT 'Other',
  uploadDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploadedBy INT COMMENT 'User ID who uploaded the report',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE,
  INDEX idx_patientId (patientId),
  INDEX idx_reportType (reportType),
  INDEX idx_uploadDate (uploadDate)
);
```

## Appwrite Configuration

### Environment Variables Required
```env
APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_BUCKET_ID=your-bucket-id
APPWRITE_API_KEY=your-api-key
```

### File Upload Configuration
- **Storage**: Appwrite cloud storage
- **File Size Limits**: 10MB for profile images, 50MB for medical reports
- **File Filtering**: Automatic file type detection
- **Unique Naming**: UUID-based filenames to prevent conflicts
- **Memory Storage**: Files are temporarily stored in memory before upload

## Security Features

### Authentication
- All endpoints require authentication via JWT tokens
- User role-based access control
- Patient data isolation (patients can only access their own data)

### File Security
- File type validation
- File size limits
- Secure file naming (UUID-based)
- Appwrite built-in security features
- Soft delete for sensitive documents

### Data Validation
- Score range validation (0-100 for oral health scores)
- Required field validation
- File upload validation
- Patient existence verification

## Usage Examples

### Upload Profile Image
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('/api/patients/profile-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Add Oral Health Score
```javascript
fetch('/api/oral-health-scores', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    patientId: 1,
    score: 85,
    notes: 'Good oral hygiene, minor tartar buildup'
  })
});
```

### Upload Medical Report
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('patientId', '1');
formData.append('title', 'Blood Test Results');
formData.append('description', 'Complete blood count and lipid profile');
formData.append('reportType', 'Blood Test');

fetch('/api/medical-reports', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Download Medical Report
```javascript
fetch('/api/medical-reports/123/download', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => response.json())
.then(data => {
  // data.data.downloadUrl contains the Appwrite URL for download
  window.open(data.data.downloadUrl, '_blank');
});
```

## Error Handling

### Common Error Responses
- `400 Bad Request`: Invalid input data, missing required fields
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Patient, report, or file not found
- `413 Payload Too Large`: File size exceeds limit
- `415 Unsupported Media Type`: Unsupported file type
- `500 Internal Server Error`: Server-side errors

### Error Response Format
```json
{
  "status": "error",
  "code": 400,
  "message": "Invalid score value. Score must be between 0 and 100",
  "data": null
}
```

## Migration Instructions

1. Run the database migration:
   ```bash
   npx sequelize-cli db:migrate
   ```

2. Configure Appwrite environment variables in your `.env` file:
   ```env
   APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
   APPWRITE_PROJECT_ID=your-project-id
   APPWRITE_BUCKET_ID=your-bucket-id
   APPWRITE_API_KEY=your-api-key
   ```

3. Ensure your Appwrite bucket has the correct permissions for file uploads.

## Testing

### API Testing
Use the provided Swagger documentation at `/api-docs` to test all endpoints.

### File Upload Testing
- Test with various file types and sizes
- Verify file upload to Appwrite
- Test error handling for invalid files

### Database Testing
- Verify foreign key constraints
- Test cascade deletes
- Validate data integrity

## Performance Considerations

### Appwrite Storage
- Leverage Appwrite's CDN for fast file delivery
- Use Appwrite's built-in file optimization
- Monitor storage usage and costs

### Database Optimization
- Indexes on frequently queried fields
- Pagination for large datasets
- Efficient query patterns

### Caching
- Consider implementing image caching
- Cache frequently accessed patient data
- Leverage Appwrite's caching features

## Future Enhancements

1. **Image Processing**: Automatic image resizing and optimization via Appwrite functions
2. **File Compression**: Automatic compression for large files
3. **Advanced Search**: Full-text search for medical reports
4. **Analytics**: Oral health score trends and analytics
5. **Notifications**: Automated notifications for new reports/scores
6. **Export**: PDF generation for medical reports
7. **Backup**: Automated backup using Appwrite's backup features
8. **File Versioning**: Implement file versioning for medical reports 