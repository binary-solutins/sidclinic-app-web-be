# Dental Image APIs

This document describes the dental image management APIs that allow users to upload, manage, and retrieve dental images for themselves and their family members.

## Overview

The dental image system allows patients to:
- Upload multiple dental images (X-rays, photos, scans, etc.)
- Associate images with family members (relatives) OR upload for themselves
- View and manage their uploaded images
- Filter images by type and relative

Admins can:
- View all dental images across all users
- Get bulk image URLs for processing
- Filter images by various criteria

## Database Schema

### DentalImage Model
```javascript
{
  id: INTEGER (Primary Key, Auto Increment)
  userId: INTEGER (Foreign Key to User)
  relativeId: INTEGER (Foreign Key to FamilyMember, nullable)
  imageUrls: JSON (Array of image URLs)
  description: TEXT (Optional description)
  imageType: ENUM('xray', 'photo', 'scan', 'other')
  isActive: BOOLEAN (Soft delete flag)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

**Note:** `relativeId` is `null` when images are uploaded for the patient themselves.

## User APIs

### 1. Upload Dental Images
**POST** `/api/dental-images`

Upload multiple dental images for the authenticated user or their family members.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `images`: Array of image files (max 10 files, 10MB each)
  - `relativeId`: (Optional) ID of family member OR `0` for self
  - `description`: (Optional) Description of images
  - `imageType`: (Optional) Type of image ('xray', 'photo', 'scan', 'other')

**relativeId Values:**
- `0` or `"0"`: Upload for patient themselves (relativeId will be null in database)
- `null` or not provided: Upload for patient themselves
- `{number}`: Upload for specific family member with that ID

**Response:**
```json
{
  "status": "success",
  "code": 201,
  "message": "Dental images uploaded successfully",
  "data": {
    "id": 1,
    "imageUrls": ["url1", "url2"],
    "description": "Front teeth X-ray",
    "imageType": "xray",
    "relativeId": null,
    "isForSelf": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get User's Dental Images
**GET** `/api/dental-images`

Retrieve paginated list of user's dental images with optional filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `relativeId`: Filter by relative ID
  - `0`: Get images uploaded for patient themselves
  - `{number}`: Get images for specific relative
  - Not provided: Get all images
- `imageType`: Filter by image type

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "message": "Dental images retrieved successfully",
  "data": {
    "images": [
      {
        "id": 1,
        "userId": 123,
        "relativeId": null,
        "imageUrls": ["url1", "url2"],
        "description": "Front teeth X-ray",
        "imageType": "xray",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "FamilyMember": null
      },
      {
        "id": 2,
        "userId": 123,
        "relativeId": 5,
        "imageUrls": ["url3", "url4"],
        "description": "Son's dental checkup",
        "imageType": "photo",
        "createdAt": "2024-01-15T11:30:00.000Z",
        "FamilyMember": {
          "id": 5,
          "name": "John Doe Jr.",
          "relation": "Son"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

### 3. Get Specific Dental Image
**GET** `/api/dental-images/{id}`

Retrieve a specific dental image by ID.

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "message": "Dental image retrieved successfully",
  "data": {
    "id": 1,
    "userId": 123,
    "relativeId": null,
    "imageUrls": ["url1", "url2"],
    "description": "Front teeth X-ray",
    "imageType": "xray",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "FamilyMember": null
  }
}
```

### 4. Delete Dental Image
**DELETE** `/api/dental-images/{id}`

Soft delete a dental image (sets isActive to false).

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "message": "Dental image deleted successfully",
  "data": null
}
```

## Admin APIs

### 1. Get All Dental Images
**GET** `/api/admin/dental-images`

Retrieve all dental images across all users with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `userId`: Filter by user ID
- `relativeId`: Filter by relative ID
  - `0`: Get images uploaded for patients themselves
  - `{number}`: Get images for specific relative
  - Not provided: Get all images
- `imageType`: Filter by image type

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "message": "All dental images retrieved successfully",
  "data": {
    "images": [
      {
        "id": 1,
        "userId": 123,
        "relativeId": null,
        "imageUrls": ["url1", "url2"],
        "description": "Front teeth X-ray",
        "imageType": "xray",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "FamilyMember": null
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 200,
      "itemsPerPage": 20
    }
  }
}
```

### 2. Get All Image URLs
**GET** `/api/admin/dental-images/urls`

Retrieve all image URLs as a flat array for bulk processing.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "message": "All image URLs retrieved successfully",
  "data": {
    "imageUrls": [
      "https://appwrite.example.com/storage/buckets/bucket-id/files/file1/view",
      "https://appwrite.example.com/storage/buckets/bucket-id/files/file2/view"
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 4,
      "totalItems": 200,
      "itemsPerPage": 50,
      "totalImageUrls": 150
    }
  }
}
```

## Authentication & Authorization

- **User APIs**: Require valid JWT token with user role
- **Admin APIs**: Require valid JWT token with admin role
- All endpoints use Bearer token authentication

## File Upload Limits

- Maximum 10 files per upload
- Maximum 10MB per file
- Supported formats: All image types (JPEG, PNG, GIF, etc.)

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "code": 400,
  "message": "No images uploaded",
  "data": null
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "code": 401,
  "message": "Invalid credentials",
  "data": null
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "code": 403,
  "message": "Insufficient permissions",
  "data": null
}
```

### 404 Not Found
```json
{
  "status": "error",
  "code": 404,
  "message": "Dental image not found",
  "data": null
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "code": 500,
  "message": "Failed to upload dental images",
  "data": null
}
```

## Usage Examples

### Frontend Integration

```javascript
// Upload dental images for yourself
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
formData.append('relativeId', '0'); // 0 for self
formData.append('description', 'My front teeth X-ray');
formData.append('imageType', 'xray');

const response = await fetch('/api/dental-images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// Upload dental images for a relative
const formDataForRelative = new FormData();
formDataForRelative.append('images', file3);
formDataForRelative.append('relativeId', '5'); // ID of family member
formDataForRelative.append('description', 'Son\'s dental checkup');
formDataForRelative.append('imageType', 'photo');

// Get user's own dental images
const myImages = await fetch('/api/dental-images?relativeId=0', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get images for a specific relative
const relativeImages = await fetch('/api/dental-images?relativeId=5', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get all user's dental images
const allImages = await fetch('/api/dental-images?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Admin: Get all images uploaded for patients themselves
const selfImages = await fetch('/api/admin/dental-images?relativeId=0', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

## Notes

1. Images are stored in Appwrite storage service
2. Soft delete is used (isActive flag) instead of hard delete
3. Family member validation ensures users can only upload images for their own relatives
4. Pagination is implemented for all list endpoints
5. Image URLs are stored as JSON array to support multiple images per record
6. `relativeId: 0` or `null` indicates images uploaded for the patient themselves
7. `relativeId: {number}` indicates images uploaded for a specific family member 