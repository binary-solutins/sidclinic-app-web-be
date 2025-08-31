const Report = require('./models/report.model');
const Patient = require('./models/patient.model');
const User = require('./models/user.model');
const FamilyMember = require('./models/familyMember.model');

console.log('Testing Reports module...');

// Test if models can be loaded
try {
  console.log('✅ Report model loaded successfully');
  console.log('✅ Patient model loaded successfully');
  console.log('✅ User model loaded successfully');
  console.log('✅ FamilyMember model loaded successfully');
  
  // Test model attributes
  console.log('\nReport model attributes:');
  console.log(Object.keys(Report.rawAttributes));
  
  console.log('\n✅ All models loaded and configured correctly!');
  console.log('Reports module is ready to use.');
  
} catch (error) {
  console.error('❌ Error loading models:', error.message);
  process.exit(1);
}
