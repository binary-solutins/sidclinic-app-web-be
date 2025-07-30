# Query Module Documentation

## Overview
The Query module allows both users and doctors to raise queries/support tickets for various issues related to the SID Clinic platform. The module provides comprehensive query management with filtering, pagination, and role-based access control.

## Features

### For Users & Doctors
- ✅ Create new queries with title, description, category, and priority
- ✅ View their own queries with filtering and pagination
- ✅ Update their own queries (limited fields)
- ✅ Delete their own queries (soft delete)
- ✅ View query details with assigned support information

### For Admins
- ✅ View all queries with advanced filtering
- ✅ Assign queries to support staff
- ✅ Update any query including status and resolution
- ✅ View query statistics and analytics
- ✅ Manage query lifecycle

## Database Schema

### Query Table
```sql
CREATE TABLE Queries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other') DEFAULT 'General',
  priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
  status ENUM('Open', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
  raisedBy INT NOT NULL,
  raisedByRole ENUM('user', 'doctor') NOT NULL,
  assignedTo INT NULL,
  attachments JSON NULL,
  resolvedAt DATETIME NULL,
  resolution TEXT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (raisedBy) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedTo) REFERENCES Users(id) ON DELETE SET NULL,
  
  INDEX idx_raisedBy (raisedBy),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_createdAt (createdAt)
);
```

## API Endpoints

### Base URL: `/api/queries`

### 1. Create Query
**POST** `/api/queries`
- **Authentication**: Required
- **Roles**: user, doctor
- **Body**:
  ```json
  {
    "title": "Appointment booking issue",
    "description": "I'm unable to book an appointment for tomorrow",
    "category": "Appointment",
    "priority": "Medium",
    "attachments": ["https://example.com/file1.jpg"]
  }
  ```

### 2. Get All Queries (Admin)
**GET** `/api/queries`
- **Authentication**: Required
- **Roles**: admin
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `status` (Open, In Progress, Resolved, Closed)
  - `category` (General, Technical, Billing, Appointment, Medical, Other)
  - `priority` (Low, Medium, High, Urgent)
  - `raisedByRole` (user, doctor)
  - `search` (search in title and description)

### 3. Get My Queries
**GET** `/api/queries/my`
- **Authentication**: Required
- **Roles**: user, doctor
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `status` (Open, In Progress, Resolved, Closed)

### 4. Get Query by ID
**GET** `/api/queries/:id`
- **Authentication**: Required
- **Roles**: all

### 5. Update Query
**PUT** `/api/queries/:id`
- **Authentication**: Required
- **Roles**: 
  - Users/Doctors: Can update their own queries (limited fields)
  - Admins: Can update any query
- **Body**: Any fields from UpdateQueryRequest schema

### 6. Delete Query
**DELETE** `/api/queries/:id`
- **Authentication**: Required
- **Roles**: 
  - Users/Doctors: Can delete their own queries
  - Admins: Can delete any query
- **Note**: Soft delete (sets isActive to false)

### 7. Assign Query (Admin Only)
**POST** `/api/queries/:id/assign`
- **Authentication**: Required
- **Roles**: admin
- **Body**:
  ```json
  {
    "assignedTo": 2
  }
  ```

### 8. Get Query Statistics (Admin Only)
**GET** `/api/queries/stats`
- **Authentication**: Required
- **Roles**: admin
- **Response**: Statistics grouped by status, category, and priority

## Query Categories
- **General**: General inquiries and questions
- **Technical**: Technical issues with the platform
- **Billing**: Payment and billing related issues
- **Appointment**: Appointment booking and scheduling issues
- **Medical**: Medical-related queries
- **Other**: Miscellaneous queries

## Query Priorities
- **Low**: Non-urgent queries
- **Medium**: Standard priority queries
- **High**: Important queries requiring attention
- **Urgent**: Critical queries requiring immediate attention

## Query Statuses
- **Open**: New query, not yet assigned
- **In Progress**: Query is being worked on
- **Resolved**: Query has been resolved
- **Closed**: Query is closed (no further action needed)

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Query created successfully",
  "data": {
    "id": 1,
    "title": "Appointment booking issue",
    "description": "I'm unable to book an appointment for tomorrow",
    "category": "Appointment",
    "priority": "Medium",
    "status": "Open",
    "raisedBy": 1,
    "raisedByRole": "user",
    "assignedTo": null,
    "attachments": ["https://example.com/file1.jpg"],
    "resolvedAt": null,
    "resolution": null,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "RaisedByUser": {
      "id": 1,
      "name": "John Doe",
      "phone": "+919876543210",
      "role": "user"
    }
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Queries retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Query not found",
  "error": "Additional error details"
}
```

## Usage Examples

### Creating a Query (User/Doctor)
```javascript
const response = await fetch('/api/queries', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Payment issue',
    description: 'I was charged twice for the same appointment',
    category: 'Billing',
    priority: 'High'
  })
});
```

### Getting User's Queries
```javascript
const response = await fetch('/api/queries/my?page=1&limit=10&status=Open', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Admin Assigning Query
```javascript
const response = await fetch('/api/queries/1/assign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    assignedTo: 5
  })
});
```

## Security Features
- ✅ JWT Authentication required for all endpoints
- ✅ Role-based access control
- ✅ Users can only access their own queries
- ✅ Admins have full access to all queries
- ✅ Soft delete to preserve data integrity
- ✅ Input validation and sanitization

## Database Indexes
- `raisedBy`: For quick lookup of user's queries
- `status`: For filtering by status
- `category`: For filtering by category
- `priority`: For filtering by priority
- `createdAt`: For sorting by creation date

## File Structure
```
├── models/
│   └── query.model.js          # Query model with associations
├── controllers/
│   └── query.controller.js      # Query business logic
├── routes/
│   └── query.routes.js         # Query API routes
├── migrations/
│   └── 20250101000000-create-queries-table.js  # Database migration
└── swagger.js                  # Updated with Query schemas
```

## Testing the Module

### 1. Start the server
```bash
npm start
```

### 2. Access Swagger Documentation
Visit: `http://localhost:3000/api-docs`

### 3. Test Endpoints
- Use the Swagger UI to test all endpoints
- Or use tools like Postman/Insomnia
- Make sure to include JWT token in Authorization header

## Notes
- The module automatically sets `resolvedAt` when status changes to 'Resolved' or 'Closed'
- Attachments are stored as JSON array of URLs
- All timestamps are in UTC
- Soft delete is used to preserve data integrity
- The module integrates with existing User model and authentication system 