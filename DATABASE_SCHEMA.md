# SID Clinic Backend - Database Schema Documentation

## Overview

This document provides a comprehensive overview of the database schema for the SID Clinic Backend system. The database is built using MySQL with Sequelize ORM and includes all necessary tables for managing a dental clinic system.

## Database Information

- **Database Type**: MySQL 8.0+
- **ORM**: Sequelize
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **Connection Pool**: Configured for optimal performance

## Table Structure

### 1. Users Table

**Purpose**: Core user authentication and profile information

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
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_phone (phone),
  INDEX idx_role (role),
  INDEX idx_created_at (createdAt)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `name`: User's full name
- `phone`: Unique phone number for authentication
- `password`: Hashed password using bcrypt
- `role`: User role (user, doctor, admin)
- `fcmToken`: Firebase Cloud Messaging token for push notifications
- `notificationEnabled`: Boolean to control notification preferences
- `gender`: User's gender
- `createdAt`: Record creation timestamp
- `updatedAt`: Record last update timestamp

### 2. Doctors Table

**Purpose**: Extended profile information for medical professionals

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
  
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_user_id (userId),
  INDEX idx_registration_number (registrationNumber),
  INDEX idx_city (city),
  INDEX idx_is_approved (isApproved),
  INDEX idx_is_active (is_active)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `userId`: Foreign key to Users table
- `doctorPhoto`: URL to doctor's profile photo
- `degree`: Medical degrees and qualifications
- `registrationNumber`: Unique medical registration number
- `clinicName`: Name of the doctor's clinic
- `clinicPhotos`: JSON array of clinic photo URLs
- `yearsOfExperience`: Number of years of professional experience
- `specialty`: Medical specialty
- `clinicContactNumber`: Contact number for the clinic
- `email`: Professional email address
- `address`: Physical address of the clinic
- `country`: Country of the clinic
- `state`: State/province of the clinic
- `city`: City of the clinic
- `locationPin`: Geographic coordinates or location pin
- `isApproved`: Boolean for admin approval status
- `is_active`: Boolean for active/inactive status
- `startTime`: Daily start time for consultations
- `endTime`: Daily end time for consultations

### 3. Patients Table

**Purpose**: Extended profile information for patients

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
  
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_user_id (userId),
  INDEX idx_date_of_birth (dateOfBirth),
  INDEX idx_blood_group (bloodGroup)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `userId`: Foreign key to Users table
- `profileImage`: URL to patient's profile image
- `dateOfBirth`: Patient's date of birth
- `bloodGroup`: Patient's blood group
- `emergencyContact`: Emergency contact number
- `address`: Patient's address
- `medicalHistory`: Previous medical history
- `allergies`: Known allergies
- `currentMedications`: Current medications

### 4. Appointments Table

**Purpose**: Appointment scheduling and management

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
  FOREIGN KEY (doctorId) REFERENCES Doctors(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patientId),
  INDEX idx_doctor_id (doctorId),
  INDEX idx_appointment_date (appointmentDate),
  INDEX idx_status (status),
  INDEX idx_appointment_type (appointmentType),
  INDEX idx_payment_status (paymentStatus),
  INDEX idx_date_time (appointmentDate, appointmentTime)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `patientId`: Foreign key to Patients table
- `doctorId`: Foreign key to Doctors table
- `appointmentDate`: Date of the appointment
- `appointmentTime`: Time of the appointment
- `status`: Current status of the appointment
- `appointmentType`: Type of appointment
- `symptoms`: Patient's symptoms
- `diagnosis`: Doctor's diagnosis
- `prescription`: Prescribed medications/treatments
- `notes`: Additional notes
- `consultationFee`: Fee for the consultation
- `paymentStatus`: Payment status

### 5. Medical Reports Table

**Purpose**: Medical report and document management

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
  
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patientId),
  INDEX idx_report_type (reportType),
  INDEX idx_upload_date (uploadDate),
  INDEX idx_is_active (isActive)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `patientId`: Foreign key to Patients table
- `title`: Title of the medical report
- `description`: Description of the report
- `filePath`: URL to the uploaded file
- `fileName`: Original filename
- `fileSize`: File size in bytes
- `fileType`: MIME type of the file
- `reportType`: Type of medical report
- `uploadDate`: Date when file was uploaded
- `uploadedBy`: User ID who uploaded the file
- `isActive`: Soft delete flag

### 6. Oral Health Scores Table

**Purpose**: Track oral health assessments

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
  
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patientId),
  INDEX idx_assessment_date (assessmentDate),
  INDEX idx_score (score)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `patientId`: Foreign key to Patients table
- `score`: Oral health score (0-100)
- `assessmentDate`: Date of assessment
- `notes`: Notes about the assessment
- `assessedBy`: Doctor ID who performed assessment

### 7. Queries Table

**Purpose**: Support ticket and query management

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
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_raised_by (raisedBy),
  INDEX idx_assigned_to (assignedTo),
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_status (status),
  INDEX idx_created_at (createdAt)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `title`: Query title
- `description`: Detailed description
- `category`: Query category
- `priority`: Priority level
- `status`: Current status
- `raisedBy`: User ID who raised the query
- `raisedByRole`: Role of the user who raised the query
- `assignedTo`: User ID assigned to handle the query
- `attachments`: JSON array of attachment URLs
- `resolvedAt`: Date when query was resolved
- `resolution`: Resolution details

### 8. Blogs Table

**Purpose**: Content management for clinic information

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
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_author_id (authorId),
  INDEX idx_is_published (isPublished),
  INDEX idx_published_at (publishedAt),
  INDEX idx_view_count (viewCount)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `title`: Blog title
- `content`: Blog content
- `authorId`: User ID of the author
- `authorName`: Name of the author
- `tags`: JSON array of tags
- `isPublished`: Publication status
- `publishedAt`: Publication date
- `viewCount`: Number of views

### 9. Notifications Table

**Purpose**: System notifications and alerts

```sql
CREATE TABLE Notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('appointment', 'reminder', 'system', 'medical', 'payment') NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  data JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_user_id (userId),
  INDEX idx_type (type),
  INDEX idx_is_read (isRead),
  INDEX idx_created_at (createdAt)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `userId`: Foreign key to Users table
- `title`: Notification title
- `message`: Notification message
- `type`: Type of notification
- `isRead`: Read status
- `data`: Additional data in JSON format

### 10. OTP Table

**Purpose**: One-time password management

```sql
CREATE TABLE OTP (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expiresAt DATETIME NOT NULL,
  isUsed BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_phone (phone),
  INDEX idx_expires_at (expiresAt),
  INDEX idx_is_used (isUsed)
);
```

**Fields Description**:
- `id`: Primary key, auto-incrementing
- `phone`: Phone number
- `otp`: One-time password
- `expiresAt`: Expiration time
- `isUsed`: Usage status

### 11. Location Tables

#### Countries Table
```sql
CREATE TABLE Countries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(3) NOT NULL,
  phoneCode VARCHAR(5),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_name (name)
);
```

#### States Table
```sql
CREATE TABLE States (
  id INT PRIMARY KEY AUTO_INCREMENT,
  countryId INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (countryId) REFERENCES Countries(id) ON DELETE CASCADE,
  INDEX idx_country_id (countryId),
  INDEX idx_name (name)
);
```

#### Cities Table
```sql
CREATE TABLE Cities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stateId INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (stateId) REFERENCES States(id) ON DELETE CASCADE,
  INDEX idx_state_id (stateId),
  INDEX idx_name (name)
);
```

### 12. Price Table

**Purpose**: Service pricing management

```sql
CREATE TABLE Prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serviceName VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_service_name (serviceName),
  INDEX idx_is_active (isActive)
);
```

### 13. Medical History Table

**Purpose**: Detailed medical history tracking

```sql
CREATE TABLE MedicalHistories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  condition VARCHAR(255) NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  startDate DATE,
  endDate DATE,
  isActive BOOLEAN DEFAULT TRUE,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patientId),
  INDEX idx_condition (condition),
  INDEX idx_is_active (isActive)
);
```

### 14. Family Members Table

**Purpose**: Family member information for patients

```sql
CREATE TABLE FamilyMembers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patientId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(255),
  isEmergencyContact BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE,
  INDEX idx_patient_id (patientId),
  INDEX idx_relationship (relationship),
  INDEX idx_is_emergency_contact (isEmergencyContact)
);
```

### 15. Consultation Reports Table

**Purpose**: Detailed consultation documentation

```sql
CREATE TABLE ConsultationReports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointmentId INT NOT NULL,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  followUpDate DATE,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (appointmentId) REFERENCES Appointments(id) ON DELETE CASCADE,
  INDEX idx_appointment_id (appointmentId),
  INDEX idx_follow_up_date (followUpDate)
);
```

## Relationships

### One-to-One Relationships
- `Users` ↔ `Doctors` (via `userId`)
- `Users` ↔ `Patients` (via `userId`)
- `Appointments` ↔ `ConsultationReports` (via `appointmentId`)

### One-to-Many Relationships
- `Users` → `Notifications` (via `userId`)
- `Patients` → `MedicalReports` (via `patientId`)
- `Patients` → `OralHealthScores` (via `patientId`)
- `Patients` → `MedicalHistories` (via `patientId`)
- `Patients` → `FamilyMembers` (via `patientId`)
- `Doctors` → `Appointments` (via `doctorId`)
- `Patients` → `Appointments` (via `patientId`)
- `Countries` → `States` (via `countryId`)
- `States` → `Cities` (via `stateId`)

### Many-to-Many Relationships
- `Users` ↔ `Queries` (via `raisedBy` and `assignedTo`)

## Indexes

### Performance Indexes
```sql
-- Users table
CREATE INDEX idx_users_phone ON Users(phone);
CREATE INDEX idx_users_role ON Users(role);

-- Doctors table
CREATE INDEX idx_doctors_city ON Doctors(city);
CREATE INDEX idx_doctors_approved ON Doctors(isApproved);

-- Appointments table
CREATE INDEX idx_appointments_date ON Appointments(appointmentDate);
CREATE INDEX idx_appointments_status ON Appointments(status);
CREATE INDEX idx_appointments_doctor_date ON Appointments(doctorId, appointmentDate);

-- Medical Reports table
CREATE INDEX idx_reports_patient_type ON MedicalReports(patientId, reportType);

-- Queries table
CREATE INDEX idx_queries_status_priority ON Queries(status, priority);
CREATE INDEX idx_queries_raised_by ON Queries(raisedBy, status);
```

## Data Types and Constraints

### String Fields
- **VARCHAR(255)**: Names, titles, emails
- **VARCHAR(15)**: Phone numbers
- **VARCHAR(6)**: OTP codes
- **TEXT**: Long text content
- **JSON**: Array and object data

### Numeric Fields
- **INT**: IDs, counts, scores
- **DECIMAL(10,2)**: Monetary values
- **TIME**: Time values
- **DATE**: Date values
- **DATETIME**: Timestamp values

### Boolean Fields
- **BOOLEAN**: True/false flags

### Enum Fields
- **ENUM**: Predefined value sets

## Constraints

### Primary Keys
- All tables have auto-incrementing integer primary keys

### Foreign Keys
- Proper foreign key constraints with CASCADE delete
- Referential integrity maintained

### Unique Constraints
- Phone numbers in Users table
- Registration numbers in Doctors table
- Email addresses where applicable

### Check Constraints
- Oral health scores: 0-100 range
- Positive monetary values
- Valid date ranges

## Data Integrity

### Triggers (Optional)
```sql
-- Update view count on blog view
DELIMITER //
CREATE TRIGGER update_blog_view_count
AFTER UPDATE ON Blogs
FOR EACH ROW
BEGIN
  IF NEW.viewCount != OLD.viewCount THEN
    UPDATE Blogs SET updatedAt = NOW() WHERE id = NEW.id;
  END IF;
END//
DELIMITER ;

-- Clean up expired OTP
DELIMITER //
CREATE EVENT cleanup_expired_otp
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM OTP WHERE expiresAt < NOW();
//
DELIMITER ;
```

## Backup Strategy

### Automated Backups
```sql
-- Create backup user
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'backup_password';
GRANT SELECT, LOCK TABLES ON *.* TO 'backup_user'@'localhost';

-- Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u backup_user -pbackup_password --single-transaction --routines --triggers sid_clinic_db > backup_$DATE.sql
gzip backup_$DATE.sql
```

### Backup Schedule
- **Daily**: Full database backup
- **Weekly**: Archive old backups
- **Monthly**: Test backup restoration

## Performance Optimization

### Query Optimization
```sql
-- Analyze table statistics
ANALYZE TABLE Users, Doctors, Patients, Appointments;

-- Optimize tables
OPTIMIZE TABLE Users, Doctors, Patients, Appointments;
```

### Connection Pool Settings
```javascript
// Sequelize configuration
const sequelize = new Sequelize({
  // ... other config
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
```

## Security Considerations

### Data Encryption
- Passwords hashed with bcrypt
- Sensitive data encrypted at rest
- SSL/TLS for data in transit

### Access Control
- Database user with minimal privileges
- Application-level authentication
- Role-based access control

### Audit Trail
- All tables include `createdAt` and `updatedAt`
- Soft deletes for important data
- Logging for critical operations

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: SID Clinic Development Team 