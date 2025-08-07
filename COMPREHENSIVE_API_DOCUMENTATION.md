# SID Clinic Backend - Comprehensive API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Setup & Installation](#setup--installation)
5. [Environment Configuration](#environment-configuration)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [Authentication & Authorization](#authentication--authorization)
9. [File Upload System](#file-upload-system)
10. [Real-time Features](#real-time-features)
11. [Email Notifications](#email-notifications)
12. [Security Features](#security-features)
13. [Deployment Guide](#deployment-guide)
14. [Troubleshooting](#troubleshooting)

## Overview

SID Clinic Backend is a comprehensive dental clinic management system built with Node.js, Express, and MySQL. The system provides a complete solution for managing dental clinics, including patient management, appointment scheduling, doctor profiles, medical reports, and real-time video consultations.

### Key Features
- **Multi-role Authentication**: User, Doctor, and Admin roles
- **Appointment Management**: Complete appointment lifecycle
- **Patient Management**: Profile, medical history, and reports
- **Doctor Profiles**: Professional profiles with approval system
- **Medical Reports**: File upload and management system
- **Real-time Video Calls**: WebRTC-based video consultations
- **Email Notifications**: Automated email system
- **Oral Health Tracking**: Score-based health assessment
- **Query Management**: Support ticket system
- **Blog Management**: Content management for clinic information

## Technology Stack

### Backend Framework
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **Sequelize**: ORM for database management
- **MySQL**: Primary database

### Authentication & Security
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing
- **Helmet**: Security middleware
- **express-rate-limit**: Rate limiting

### File Management
- **Multer**: File upload handling
- **Appwrite**: Cloud storage for files
- **Firebase Admin**: Push notifications

### Real-time Communication
- **Socket.io**: WebSocket server for real-time features
- **WebRTC**: Peer-to-peer video communication
- **Azure Communication Services**: Video calling integration

### Documentation & API
- **Swagger/OpenAPI**: API documentation
- **Swagger UI**: Interactive API documentation

### Additional Services
- **Nodemailer**: Email service
- **Twilio**: SMS service
- **Luxon**: Date/time handling
- **UUID**: Unique identifier generation

## Project Structure

```
sid-clinic-backend/
├── config/
│   └── db.js                 # Database configuration
├── controllers/              # Business logic controllers
├── middleware/              # Custom middleware
│   └── auth.js             # Authentication middleware
├── models/                  # Database models
│   ├── user.model.js
│   ├── doctor.model.js
│   ├── patient.model.js
│   ├── appoinment.model.js
│   ├── medicalReport.model.js
│   ├── oralHealthScore.model.js
│   ├── query.model.js
│   ├── blog.model.js
│   └── ...
├── routes/                  # API route definitions
│   ├── auth.routes.js
│   ├── doctor.route.js
│   ├── patient.routes.js
│   ├── appoinment.routes.js
│   ├── medicalReport.routes.js
│   ├── oralHealthScore.routes.js
│   ├── query.routes.js
│   └── ...
├── services/               # External service integrations
│   ├── email.services.js
│   └── firebase.services.js
├── templates/             # Email templates
│   └── emails/
├── uploads/              # File uploads (local storage)
├── public/              # Static files
│   ├── js/
│   └── video-call.html
├── server.js            # Main application entry point
├── swagger.js           # API documentation configuration
├── package.json         # Dependencies and scripts
└── vercel.json         # Deployment configuration
```

## Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sid-clinic-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=sid_clinic_db
   
   # JWT Secret
   JWT_SECRET=your_jwt_secret_key
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   
   # Appwrite Configuration
   APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   APPWRITE_BUCKET_ID=your_bucket_id
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   
   # Twilio Configuration (Optional)
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   
   # Azure Communication Services (Optional)
   AZURE_COMMUNICATION_CONNECTION_STRING=your_connection_string
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE sid_clinic_db;
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Environment Configuration

### Required Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DB_HOST` | MySQL database host | Yes | - |
| `DB_USER` | MySQL database user | Yes | - |
| `DB_PASSWORD` | MySQL database password | Yes | - |
| `DB_NAME` | MySQL database name | Yes | - |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `EMAIL_HOST` | SMTP server host | Yes | - |
| `EMAIL_PORT` | SMTP server port | Yes | 587 |
| `EMAIL_USER` | SMTP username | Yes | - |
| `EMAIL_PASS` | SMTP password | Yes | - |
| `APPWRITE_ENDPOINT` | Appwrite instance URL | Yes | - |
| `APPWRITE_PROJECT_ID` | Appwrite project ID | Yes | - |
| `APPWRITE_API_KEY` | Appwrite API key | Yes | - |
| `APPWRITE_BUCKET_ID` | Appwrite bucket ID | Yes | - |
| `FIREBASE_PROJECT_ID` | Firebase project ID | No | - |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | No | - |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email | No | - |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | No | - |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No | - |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | No | - |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | Azure connection string | No | - |
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment mode | No | development |

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE Users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'doctor', 'admin') DEFAULT 'user',
  fcmToken VARCHAR(500),
  notificationEnabled BOOLEAN DEFAULT TRUE,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Doctors Table
```sql
CREATE TABLE Doctors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  doctorPhoto VARCHAR(255),
  degree VARCHAR(255) NOT NULL,
  registrationNumber VARCHAR(255) UNIQUE NOT NULL,
  clinicName VARCHAR(255) NOT NULL,
  clinicPhotos JSON,
  yearsOfExperience INT NOT NULL,
  specialty VARCHAR(255),
  clinicContactNumber VARCHAR(15) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  country VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  locationPin VARCHAR(6) NOT NULL,
  isApproved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  startTime TIME,
  endTime TIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);
```

#### Patients Table
```sql
CREATE TABLE Patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  profileImage VARCHAR(255),
  dateOfBirth DATE,
  bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  emergencyContact VARCHAR(15),
  address TEXT,
  medicalHistory TEXT,
  allergies TEXT,
  currentMedications TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);
```

#### Appointments Table
```sql
CREATE TABLE Appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  doctorId INT NOT NULL,
  appointmentDate DATE NOT NULL,
  appointmentTime TIME NOT NULL,
  status ENUM('Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show') DEFAULT 'Scheduled',
  appointmentType ENUM('Consultation', 'Treatment', 'Follow-up', 'Emergency') DEFAULT 'Consultation',
  symptoms TEXT,
  diagnosis TEXT,
  prescription TEXT,
  notes TEXT,
  consultationFee DECIMAL(10,2),
  paymentStatus ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctorId) REFERENCES Doctors(id) ON DELETE CASCADE
);
```

#### Medical Reports Table
```sql
CREATE TABLE MedicalReports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  filePath VARCHAR(255) NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  fileSize INT,
  fileType VARCHAR(100),
  reportType ENUM('X-Ray', 'Blood Test', 'Dental Report', 'Medical Certificate', 'Prescription', 'Other') DEFAULT 'Other',
  uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  uploadedBy INT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE
);
```

#### Oral Health Scores Table
```sql
CREATE TABLE OralHealthScores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  assessmentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  assessedBy INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE
);
```

#### Queries Table
```sql
CREATE TABLE Queries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other') NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL,
  status ENUM('Open', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
  raisedBy INT NOT NULL,
  raisedByRole ENUM('user', 'doctor') NOT NULL,
  assignedTo INT,
  attachments JSON,
  resolvedAt DATETIME,
  resolution TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Blogs Table
```sql
CREATE TABLE Blogs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  authorId INT NOT NULL,
  authorName VARCHAR(255) NOT NULL,
  tags JSON,
  isPublished BOOLEAN DEFAULT FALSE,
  publishedAt DATETIME,
  viewCount INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Documentation

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://sidclinic-app-web-be-ktgp.onrender.com/api`

### Authentication Endpoints

#### 1. Send OTP
```http
POST /auth/send-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

#### 2. Register User
```http
POST /auth/register
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456",
  "name": "John Doe",
  "password": "securePassword123",
  "gender": "Male",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "phone": "+919876543210",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. Login
```http
POST /auth/login
Content-Type: application/json

{
  "phone": "+919876543210",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "John Doe",
    "phone": "+919876543210",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Doctor Management Endpoints

#### 1. Create Doctor Profile
```http
POST /doctors/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "degree": "MBBS, MD",
  "registrationNumber": "MCI-12345",
  "clinicName": "HealthCare Medical Center",
  "yearsOfExperience": 10,
  "specialty": "Cardiology",
  "clinicContactNumber": "+1234567890",
  "email": "doctor@example.com",
  "address": "123 Medical Street, Healthcare City",
  "country": "India",
  "state": "Maharashtra",
  "city": "Mumbai",
  "locationPin": "19.0760,72.8777"
}
```

#### 2. Get Doctor Profile
```http
GET /doctors/profile
Authorization: Bearer <token>
```

#### 3. Update Doctor Profile
```http
PUT /doctors/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "clinicName": "Updated Clinic Name",
  "specialty": "Updated Specialty"
}
```

### Patient Management Endpoints

#### 1. Create Patient Profile
```http
POST /patients/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "dateOfBirth": "1990-01-01",
  "bloodGroup": "A+",
  "emergencyContact": "+919876543210",
  "address": "123 Patient Street",
  "medicalHistory": "Previous dental issues",
  "allergies": "None",
  "currentMedications": "None"
}
```

#### 2. Upload Profile Image
```http
POST /patients/profile-image
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "image": <file>
}
```

#### 3. Get Patient Profile
```http
GET /patients/profile
Authorization: Bearer <token>
```

### Appointment Management Endpoints

#### 1. Create Appointment
```http
POST /appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctorId": 1,
  "appointmentDate": "2024-01-15",
  "appointmentTime": "10:00:00",
  "appointmentType": "Consultation",
  "symptoms": "Tooth pain"
}
```

#### 2. Get Appointments
```http
GET /appointments
Authorization: Bearer <token>
```

#### 3. Update Appointment Status
```http
PUT /appointments/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Confirmed"
}
```

### Medical Reports Endpoints

#### 1. Upload Medical Report
```http
POST /medical-reports
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Dental X-Ray",
  "description": "Routine dental checkup X-Ray",
  "reportType": "X-Ray",
  "file": <file>
}
```

#### 2. Get Patient Medical Reports
```http
GET /medical-reports/patient/:patientId
Authorization: Bearer <token>
```

#### 3. Download Medical Report
```http
GET /medical-reports/:id/download
Authorization: Bearer <token>
```

### Oral Health Scores Endpoints

#### 1. Add Oral Health Score
```http
POST /oral-health-scores
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": 1,
  "score": 85,
  "notes": "Good oral health, minor issues detected"
}
```

#### 2. Get Patient Oral Health Scores
```http
GET /oral-health-scores/patient/:patientId
Authorization: Bearer <token>
```

### Query Management Endpoints

#### 1. Create Query
```http
POST /queries
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Appointment booking issue",
  "description": "I'm unable to book an appointment for tomorrow",
  "category": "Appointment",
  "priority": "Medium"
}
```

#### 2. Get Queries
```http
GET /queries
Authorization: Bearer <token>
```

#### 3. Update Query
```http
PUT /queries/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "In Progress",
  "assignedTo": 2
}
```

### Blog Management Endpoints

#### 1. Create Blog
```http
POST /blogs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Dental Care Tips",
  "content": "Regular brushing and flossing are essential...",
  "authorName": "Dr. John Doe",
  "tags": ["dental care", "hygiene"]
}
```

#### 2. Get Blogs
```http
GET /blogs
```

#### 3. Publish Blog
```http
PUT /blogs/:id/publish
Authorization: Bearer <token>
```

## Authentication & Authorization

### JWT Token Structure
```json
{
  "id": 1,
  "name": "John Doe",
  "phone": "+919876543210",
  "role": "user",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Role-based Access Control

#### User Role
- View own profile
- Manage appointments
- Upload medical reports
- Create queries
- View blogs

#### Doctor Role
- All user permissions
- Manage patient profiles
- Update appointment status
- Add oral health scores
- View assigned queries

#### Admin Role
- All doctor permissions
- Manage all users
- Approve doctor profiles
- Manage all queries
- Manage blogs
- View system statistics

### Middleware Usage
```javascript
// Authentication required
const { authenticate } = require('../middleware/auth');
router.get('/profile', authenticate, controller.getProfile);

// Role-based authorization
const { authorize } = require('../middleware/auth');
router.post('/admin/users', authenticate, authorize(['admin']), controller.createUser);
```

## File Upload System

### Appwrite Integration
The system uses Appwrite for cloud file storage with the following features:

- **File Types**: Images, PDFs, documents
- **Size Limits**: 10MB per file
- **Security**: Signed URLs for secure access
- **Organization**: Structured folder system

### Upload Endpoints
- Profile images: `/uploads/profiles/`
- Medical reports: `/uploads/reports/`
- Clinic photos: `/uploads/clinics/`

### File Management
```javascript
// Upload file to Appwrite
const uploadFile = async (file, folder) => {
  const fileName = `${uuid.v4()}-${file.originalname}`;
  const filePath = `${folder}/${fileName}`;
  // Upload logic
  return filePath;
};
```

## Real-time Features

### WebSocket Events

#### Video Call Events
```javascript
// Join room
socket.emit('join-room', roomId);

// WebRTC signaling
socket.on('offer', (offer) => socket.to(roomId).emit('offer', offer));
socket.on('answer', (answer) => socket.to(roomId).emit('answer', answer));
socket.on('ice-candidate', (candidate) => socket.to(roomId).emit('ice-candidate', candidate));
```

#### Notification Events
```javascript
// Send notification
socket.emit('notification', {
  type: 'appointment_reminder',
  message: 'Your appointment is in 1 hour',
  data: { appointmentId: 1 }
});
```

### Video Call Implementation
- **WebRTC**: Peer-to-peer video communication
- **Socket.io**: Signaling server
- **Azure Communication Services**: Alternative video solution
- **Room Management**: Unique room IDs for each consultation

## Email Notifications

### Email Templates
Located in `templates/emails/`:
- `doctor_activated.hbs`
- `doctor_approved.hbs`
- `doctor_disapproved.hbs`
- `doctor_suspended.hbs`

### Email Types
- **Account Activation**: Welcome emails
- **Appointment Reminders**: 24h and 1h before
- **Status Updates**: Doctor approval/rejection
- **Password Reset**: OTP emails

### Email Configuration
```javascript
// Nodemailer configuration
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

## Security Features

### Rate Limiting
```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many authentication attempts"
});
```

### Helmet Security
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "script-src": ["'self'", "'unsafe-inline'"],
      "media-src": ["'self'", "blob:"],
      "connect-src": ["'self'", "wss:", "ws:"]
    }
  }
}));
```

### CORS Configuration
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

### Password Security
- **bcryptjs**: Password hashing with salt rounds
- **JWT**: Secure token-based authentication
- **Input Validation**: Request data sanitization

## Deployment Guide

### Local Development
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Production Deployment

#### Using Vercel
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

#### Using Render
1. **Connect GitHub repository**
2. **Set environment variables**
3. **Deploy automatically**

#### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
DB_NAME=your-production-db-name
JWT_SECRET=your-production-jwt-secret
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
mysql -h $DB_HOST -u $DB_USER -p $DB_NAME

# Verify environment variables
echo $DB_HOST $DB_USER $DB_NAME
```

#### File Upload Issues
- Check Appwrite credentials
- Verify file size limits
- Ensure proper file permissions

#### Email Delivery Issues
- Verify SMTP credentials
- Check email provider settings
- Review firewall settings

#### Video Call Issues
- Check WebRTC browser support
- Verify Socket.io connection
- Test network connectivity

### Logs and Debugging
```javascript
// Enable Sequelize logging
const sequelize = new Sequelize({
  // ... other config
  logging: console.log
});

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

### Performance Optimization
- **Database Indexing**: Add indexes for frequently queried fields
- **Connection Pooling**: Configure Sequelize connection pool
- **Caching**: Implement Redis for session storage
- **CDN**: Use CDN for static file delivery

### Monitoring
- **Health Check Endpoint**: `/api/health`
- **Error Tracking**: Implement error logging
- **Performance Monitoring**: Use APM tools
- **Uptime Monitoring**: Set up monitoring services

## API Documentation Access

### Swagger UI
- **Development**: `http://localhost:3000/api-docs`
- **Production**: `https://sidclinic-app-web-be-ktgp.onrender.com/api-docs`

### API Versioning
Current version: v1
- All endpoints are under `/api/` prefix
- Future versions will use `/api/v2/` format

### Rate Limits
- **Authentication**: 100 requests per 15 minutes
- **General API**: 1000 requests per hour
- **File Upload**: 50 requests per hour

### Error Codes
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

## Support and Contact

### Technical Support
- **Email**: support@sidclinic.com
- **Documentation**: Available at `/api-docs`
- **Issues**: Report via GitHub issues

### Development Team
- **Backend Lead**: [Contact Information]
- **Database Admin**: [Contact Information]
- **DevOps**: [Contact Information]

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: SID Clinic Development Team 