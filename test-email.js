const { emailService } = require('./services/email.services');

async function testEmailTemplates() {
  console.log('Testing email templates...');
  
  // Test data for doctor activation
  const activationData = {
    doctorName: 'John Smith',
    platformName: 'Healthcare Platform',
    dashboardUrl: 'http://localhost:3000/doctor/dashboard',
    supportUrl: 'http://localhost:3000/support'
  };

  // Test data for doctor suspension
  const suspensionData = {
    doctorName: 'Jane Doe',
    platformName: 'Healthcare Platform',
    dashboardUrl: 'http://localhost:3000/doctor/dashboard',
    supportUrl: 'http://localhost:3000/support',
    suspensionReason: 'Administrative review',
    suspensionDate: new Date().toLocaleDateString(),
    reviewDate: '2024-01-15'
  };

  // Test data for doctor approval
  const approvalData = {
    doctorName: 'Mike Johnson',
    platformName: 'Healthcare Platform',
    dashboardUrl: 'http://localhost:3000/doctor/dashboard',
    supportUrl: 'http://localhost:3000/support',
    approvalReason: 'Complete documentation provided',
    approvalDate: new Date().toLocaleDateString()
  };

  // Test data for doctor disapproval
  const disapprovalData = {
    doctorName: 'Sarah Wilson',
    platformName: 'Healthcare Platform',
    dashboardUrl: 'http://localhost:3000/doctor/dashboard',
    supportUrl: 'http://localhost:3000/support',
    approvalReason: 'Incomplete documentation',
    approvalDate: new Date().toLocaleDateString()
  };

  try {
    console.log('Testing doctor_activated template...');
    const activationResult = await emailService.sendAppointmentEmail(
      'test@example.com',
      'doctor_activated',
      activationData
    );
    console.log('Activation email result:', activationResult.success ? 'SUCCESS' : 'FAILED');

    console.log('Testing doctor_suspended template...');
    const suspensionResult = await emailService.sendAppointmentEmail(
      'test@example.com',
      'doctor_suspended',
      suspensionData
    );
    console.log('Suspension email result:', suspensionResult.success ? 'SUCCESS' : 'FAILED');

    console.log('Testing doctor_approved template...');
    const approvalResult = await emailService.sendAppointmentEmail(
      'test@example.com',
      'doctor_approved',
      approvalData
    );
    console.log('Approval email result:', approvalResult.success ? 'SUCCESS' : 'FAILED');

    console.log('Testing doctor_disapproved template...');
    const disapprovalResult = await emailService.sendAppointmentEmail(
      'test@example.com',
      'doctor_disapproved',
      disapprovalData
    );
    console.log('Disapproval email result:', disapprovalResult.success ? 'SUCCESS' : 'FAILED');

  } catch (error) {
    console.error('Error testing email templates:', error);
  }
}

// Run the test
testEmailTemplates(); 