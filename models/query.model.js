const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Query = sequelize.define('Query', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('user', 'doctor'),
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = Query;
