# SID Clinic Backend - API Documentation

## Overview

SID Clinic Backend is a comprehensive dental clinic management system built with Node.js, Express, and MySQL. The system provides a complete solution for managing dental clinics, including patient management, appointment scheduling, doctor profiles, medical reports, and real-time video consultations.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT, bcryptjs
- **File Storage**: Appwrite Cloud Storage
- **Real-time**: Socket.io, WebRTC
- **Email**: Nodemailer
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
sid-clinic-backend/
├── config/db.js              # Database configuration
├── controllers/              # Business logic
├── middleware/auth.js        # Authentication middleware
├── models/                   # Database models
├── routes/                   # API routes
├── services/                 # External services
├── templates/emails/         # Email templates
├── uploads/                  # File storage
├── public/                   # Static files
├── server.js                 # Main entry point
├── swagger.js               # API documentation
└── package.json             # Dependencies
```

## Setup & Installation

### Prerequisites
- Node.js (v14+)
- MySQL (v8.0+)
- npm or yarn

### Installation Steps

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd sid-clinic-backend
   npm install
   ```

2. **Environment Configuration**
   Create `.env` file:
   ```env
   # Database
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=sid_clinic_db
   
   # JWT
   JWT_SECRET=your_jwt_secret
   
   # Email
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   
   # Appwrite
   APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   APPWRITE_BUCKET_ID=your_bucket_id
   
   # Server
   PORT=3000
   NODE_ENV=development
   ```

3. **Database Setup**
   ```bash
   mysql -u root -p
   CREATE DATABASE sid_clinic_db;
   ```

4. **Start Application**
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

## Database Schema

### Core Tables

#### Users
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

#### Doctors
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
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);
```

#### Patients
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
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);
```

#### Appointments
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
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctorId) REFERENCES Doctors(id) ON DELETE CASCADE
);
```

## API Endpoints

### Base URLs
- **Development**: `http://localhost:3000/api`
- **Production**: `https://sidclinic-app-web-be-ktgp.onrender.com/api`
- **Documentation**: `/api-docs`

### Authentication Endpoints

#### Send OTP
```http
POST /auth/send-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

#### Check User Exists
```http
POST /auth/check-user-exists
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "exists": true,
  "message": "User exists"
}
```

#### Send Reset OTP
```http
POST /auth/send-reset-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reset OTP sent successfully"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### Register User
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

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "phone": "+919876543210",
  "password": "securePassword123"
}
```

### Doctor Management

#### Create Doctor Profile
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

#### Get Doctor Profile
```http
GET /doctors/profile
Authorization: Bearer <token>
```

### Patient Management

#### Create Patient Profile
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

#### Upload Profile Image
```http
POST /patients/profile-image
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "image": <file>
}
```

### Appointment Management

#### Create Appointment
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

#### Get Appointments
```http
GET /appointments
Authorization: Bearer <token>
```

### Medical Reports

#### Upload Medical Report
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

#### Get Patient Medical Reports
```http
GET /medical-reports/patient/:patientId
Authorization: Bearer <token>
```

### Oral Health Scores

#### Add Oral Health Score
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

#### Get Patient Oral Health Scores
```http
GET /oral-health-scores/patient/:patientId
Authorization: Bearer <token>
```

### Query Management

#### Create Query
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

#### Get Queries
```http
GET /queries
Authorization: Bearer <token>
```

### Blog Management

#### Create Blog
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

#### Get Blogs
```http
GET /blogs
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

## File Upload System

### Appwrite Integration
- **File Types**: Images, PDFs, documents
- **Size Limits**: 10MB per file
- **Security**: Signed URLs for secure access
- **Organization**: Structured folder system

### Upload Endpoints
- Profile images: `/uploads/profiles/`
- Medical reports: `/uploads/reports/`
- Clinic photos: `/uploads/clinics/`

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

### Video Call Implementation
- **WebRTC**: Peer-to-peer video communication
- **Socket.io**: Signaling server
- **Azure Communication Services**: Alternative video solution
- **Room Management**: Unique room IDs for each consultation

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

### Password Security
- **bcryptjs**: Password hashing with salt rounds
- **JWT**: Secure token-based authentication
- **Input Validation**: Request data sanitization

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

## Deployment

### Production Environment Variables
```env
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
DB_NAME=your-production-db-name
JWT_SECRET=your-production-jwt-secret
```

### Deployment Platforms
- **Vercel**: Serverless deployment
- **Render**: Cloud platform
- **Heroku**: Container-based deployment
- **AWS**: EC2 or ECS deployment

## Error Codes

- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

## Rate Limits

- **Authentication**: 100 requests per 15 minutes
- **General API**: 1000 requests per hour
- **File Upload**: 50 requests per hour

## Support

### Documentation Access
- **Swagger UI**: Available at `/api-docs`
- **API Version**: Current version v1
- **Base URL**: All endpoints under `/api/` prefix

### Contact Information
- **Email**: support@sidclinic.com
- **Technical Support**: Available via GitHub issues
- **Documentation**: Comprehensive guides available

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: SID Clinic Development Team 