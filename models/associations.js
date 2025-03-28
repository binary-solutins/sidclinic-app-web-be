const User = require('./user.model');
const Doctor = require('./doctor.model');

User.hasOne(Doctor, { foreignKey: 'userId', onDelete: 'CASCADE' });
Doctor.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

module.exports = { User, Doctor };
