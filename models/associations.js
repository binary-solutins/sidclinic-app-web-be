const User = require('./user.model');
const Doctor = require('./doctor.model');
const Query = require('./query.model');

User.hasOne(Doctor, { foreignKey: 'userId', onDelete: 'CASCADE' });
Doctor.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Query associations
User.hasMany(Query, { foreignKey: 'raisedBy', as: 'RaisedQueries', onDelete: 'CASCADE' });
Query.belongsTo(User, { foreignKey: 'raisedBy', as: 'RaisedByUser', onDelete: 'CASCADE' });

User.hasMany(Query, { foreignKey: 'assignedTo', as: 'AssignedQueries', onDelete: 'SET NULL' });
Query.belongsTo(User, { foreignKey: 'assignedTo', as: 'AssignedToUser', onDelete: 'SET NULL' });

module.exports = { User, Doctor, Query };
