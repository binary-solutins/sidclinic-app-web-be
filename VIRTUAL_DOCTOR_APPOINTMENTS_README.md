# Virtual Doctor Appointment Management

This document describes the new functionality that allows virtual doctors to manage virtual appointments in the SID Clinic backend system.

## Overview

Virtual doctors can now perform all actions on virtual appointments, including:
- Confirming appointments
- Rejecting appointments
- Approving/rejecting reschedule requests
- Canceling appointments
- Completing appointments
- Viewing appointment statistics

## New API Endpoints

### Virtual Doctor Appointment Management

#### 1. Confirm Virtual Appointment
```
PATCH /appointments/virtual/{id}/confirm
```
- **Authentication**: Virtual Doctor only
- **Description**: Confirm a pending virtual appointment
- **Response**: Appointment details with confirmed status

#### 2. Reject Virtual Appointment
```
PATCH /appointments/virtual/{id}/reject
```
- **Authentication**: Virtual Doctor only
- **Description**: Reject a pending virtual appointment with optional reason
- **Request Body**: `{ "rejectionReason": "string" }`
- **Response**: Appointment details with rejected status

#### 3. Approve Virtual Appointment Reschedule
```
PATCH /appointments/virtual/{id}/approve-reschedule
```
- **Authentication**: Virtual Doctor only
- **Description**: Approve a patient's reschedule request for a virtual appointment
- **Response**: Appointment details with new confirmed time

#### 4. Reject Virtual Appointment Reschedule
```
PATCH /appointments/virtual/{id}/reject-reschedule
```
- **Authentication**: Virtual Doctor only
- **Description**: Reject a patient's reschedule request with optional reason
- **Request Body**: `{ "rejectionReason": "string" }`
- **Response**: Appointment details with original time maintained

#### 5. Cancel Virtual Appointment
```
PATCH /appointments/virtual/{id}/cancel
```
- **Authentication**: Virtual Doctor only
- **Description**: Cancel a virtual appointment with optional reason
- **Request Body**: `{ "cancelReason": "string" }`
- **Response**: Appointment details with canceled status

#### 6. Complete Virtual Appointment
```
PATCH /appointments/virtual/{id}/complete
```
- **Authentication**: Virtual Doctor only
- **Description**: Mark a virtual appointment as completed with consultation notes and prescription
- **Request Body**: `{ "consultationNotes": "string", "prescription": "string" }`
- **Response**: Appointment details with completed status

### Virtual Appointment Viewing

#### 7. Get All Virtual Appointments
```
GET /appointments/virtual
```
- **Authentication**: Virtual Doctor only
- **Description**: Retrieve all virtual appointments with filtering and pagination
- **Query Parameters**:
  - `status`: Filter by appointment status
  - `fromDate`: Filter from date (YYYY-MM-DD)
  - `toDate`: Filter to date (YYYY-MM-DD)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response**: Paginated list of virtual appointments

#### 8. Get Virtual Appointment by ID
```
GET /appointments/virtual/{id}
```
- **Authentication**: Virtual Doctor only
- **Description**: Get detailed information about a specific virtual appointment
- **Response**: Virtual appointment details

#### 9. Get Virtual Appointment Statistics
```
GET /appointments/virtual/stats/dashboard
```
- **Authentication**: Virtual Doctor only
- **Description**: Get comprehensive statistics for virtual appointments
- **Response**: Statistics including total, pending, confirmed, completed, canceled, today, this week, this month, and reschedule requests

## Database Changes

### New Fields Added to Appointments Table

1. **confirmedBy** (INTEGER, nullable)
   - References users table
   - Tracks which virtual doctor confirmed the appointment

2. **rejectedBy** (INTEGER, nullable)
   - References users table
   - Tracks which virtual doctor rejected the appointment

3. **rescheduleApprovedBy** (INTEGER, nullable)
   - References users table
   - Tracks which virtual doctor approved the reschedule request

4. **rescheduleRejectedBy** (INTEGER, nullable)
   - References users table
   - Tracks which virtual doctor rejected the reschedule request

5. **canceledByUserId** (INTEGER, nullable)
   - References users table
   - Tracks which virtual doctor canceled the appointment

6. **completedBy** (INTEGER, nullable)
   - References users table
   - Tracks which virtual doctor completed the appointment

### Updated Fields

1. **canceledBy** (ENUM)
   - Updated to include 'virtual-doctor' option
   - Values: 'patient', 'doctor', 'virtual-doctor'

## Migration

Run the following migration to add the new fields:

```bash
npx sequelize-cli db:migrate
```

The migration file is: `migrations/20250101000005-add-virtual-doctor-tracking.js`

## Security

- All virtual doctor endpoints require authentication with the 'virtual-doctor' role
- Virtual doctors can only access virtual appointments (type = 'virtual' and doctorId = null)
- Each action is tracked with the virtual doctor's user ID for audit purposes

## Email Notifications

The system automatically sends email notifications for all virtual doctor actions:

1. **Appointment Confirmed**: Email sent to patient with confirmation details
2. **Appointment Rejected**: Email sent to patient with rejection reason
3. **Reschedule Approved**: Email sent to patient with new appointment time
4. **Reschedule Rejected**: Email sent to patient with rejection reason
5. **Appointment Canceled**: Email sent to patient with cancellation details
6. **Appointment Completed**: Email sent to patient with consultation notes and prescription

## Video Call Integration

Virtual doctors can access video call credentials for confirmed virtual appointments using the existing endpoint:

```
GET /appointments/video-credentials/{id}
```

This endpoint has been updated to support virtual doctors and will create Azure Communication Services tokens on demand.

## Error Handling

The system includes comprehensive error handling:

- **400 Bad Request**: Invalid appointment type, status, or request data
- **403 Forbidden**: Unauthorized access (non-virtual doctor)
- **404 Not Found**: Appointment not found
- **500 Internal Server Error**: Server-side errors

## Usage Examples

### Confirming a Virtual Appointment
```javascript
const response = await fetch('/appointments/virtual/123/confirm', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer <virtual-doctor-token>',
    'Content-Type': 'application/json'
  }
});
```

### Rejecting a Virtual Appointment
```javascript
const response = await fetch('/appointments/virtual/123/reject', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer <virtual-doctor-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rejectionReason: "Virtual doctor not available at this time"
  })
});
```

### Getting Virtual Appointments
```javascript
const response = await fetch('/appointments/virtual?status=pending&page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer <virtual-doctor-token>'
  }
});
```

## Testing

To test the virtual doctor functionality:

1. Create a virtual doctor user with role 'virtual-doctor'
2. Create a virtual appointment (type = 'virtual', doctorId = null)
3. Use the virtual doctor token to access the new endpoints
4. Verify that emails are sent for each action
5. Check that the tracking fields are properly populated in the database

## Future Enhancements

Potential future enhancements could include:

1. Virtual doctor availability scheduling
2. Automated appointment assignment to available virtual doctors
3. Virtual doctor performance metrics
4. Integration with AI-powered consultation tools
5. Multi-language support for virtual consultations
