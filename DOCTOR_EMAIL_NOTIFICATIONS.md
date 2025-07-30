# Doctor Email Notifications

This document describes the email notification system for doctor status changes in the healthcare platform.

## Overview

When a doctor's status is changed (activated/deactivated or approved/disapproved), the system automatically sends professional email notifications to the doctor with detailed information about the change.

## Email Templates

### 1. Doctor Activated (`doctor_activated`)
- **Trigger**: When a doctor's account is activated (is_active = true)
- **Template**: `templates/emails/doctor_activated.hbs`
- **Subject**: "Account Activated - Welcome Back Dr. [Name]"
- **Content**: 
  - Welcome message
  - What activation means for the doctor
  - Next steps to take
  - Dashboard access link

### 2. Doctor Suspended (`doctor_suspended`)
- **Trigger**: When a doctor's account is suspended (is_active = false)
- **Template**: `templates/emails/doctor_suspended.hbs`
- **Subject**: "Account Suspended - Important Notice"
- **Content**:
  - Suspension notification
  - Reason for suspension
  - What suspension means
  - Next steps to resolve issues
  - Support contact information

### 3. Doctor Approved (`doctor_approved`)
- **Trigger**: When a doctor's account is approved (isApproved = true)
- **Template**: `templates/emails/doctor_approved.hbs`
- **Subject**: "Account Approved - Welcome Dr. [Name]"
- **Content**:
  - Congratulations message
  - What approval means
  - Setup instructions
  - Dashboard access link

### 4. Doctor Disapproved (`doctor_disapproved`)
- **Trigger**: When a doctor's account is disapproved (isApproved = false)
- **Template**: `templates/emails/doctor_disapproved.hbs`
- **Subject**: "Account Disapproved - Important Notice"
- **Content**:
  - Disapproval notification
  - Reason for disapproval
  - What disapproval means
  - Steps to resolve issues
  - Support contact information

## API Endpoints

### Toggle Doctor Status
```
PUT /api/doctors/toggle-status/:id
```

**Optional Request Body:**
```json
{
  "suspensionReason": "Administrative review",
  "reviewDate": "2024-01-15"
}
```

### Toggle Doctor Approval
```
PUT /api/doctors/approve/:id
```

**Optional Request Body:**
```json
{
  "approvalReason": "Incomplete documentation"
}
```

## Email Data Structure

### For Activation/Approval
```javascript
{
  doctorName: "Dr. John Smith",
  platformName: "Healthcare Platform",
  dashboardUrl: "http://localhost:3000/doctor/dashboard",
  supportUrl: "http://localhost:3000/support"
}
```

### For Suspension/Disapproval
```javascript
{
  doctorName: "Dr. Jane Doe",
  platformName: "Healthcare Platform",
  dashboardUrl: "http://localhost:3000/doctor/dashboard",
  supportUrl: "http://localhost:3000/support",
  suspensionReason: "Administrative review", // or approvalReason
  suspensionDate: "1/1/2024", // or approvalDate
  reviewDate: "2024-01-15" // optional
}
```

## Environment Variables

Make sure these environment variables are set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
APP_NAME=Healthcare Platform
FRONTEND_URL=http://localhost:3000
```

## Features

### Professional Styling
- Modern, responsive email design
- Professional color scheme
- Clear typography and layout
- Call-to-action buttons
- Status badges and icons

### Content Features
- Personalized greeting with doctor's name
- Clear explanation of what the status change means
- Step-by-step next actions
- Support contact information
- Platform branding

### Error Handling
- Email failures don't break the main functionality
- Detailed logging for debugging
- Graceful fallback to default templates

## Testing

Run the test script to verify email functionality:

```bash
node test-email.js
```

This will test all four email templates with sample data.

## Implementation Details

### Controller Updates
- `controllers/admin.controller.js` updated to send emails
- Email sending wrapped in try-catch to prevent failures
- Detailed logging for debugging

### Email Service Updates
- `services/email.services.js` updated with new templates
- New email subjects added
- Default templates for fallback

### Route Documentation
- Swagger documentation updated
- Optional request body parameters documented
- Clear API specifications

## Security Considerations

- Email content is sanitized
- No sensitive information in emails
- Professional tone maintained
- Support contact information provided
- Clear next steps for users

## Maintenance

- Templates are stored in `templates/emails/` directory
- Default templates in email service as fallback
- Easy to modify styling and content
- Version controlled templates 