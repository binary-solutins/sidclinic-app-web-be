const Query = require('../models/query.model');
const jwt = require('jsonwebtoken'); 

// ✅ Create Query
exports.createQuery = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded.role; // Fetch role from token (user or doctor)

        if (!role || (role !== 'user' && role !== 'doctor')) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const query = await Query.create({ name, email, phone, message, role });

        res.status(201).json({ message: "Query created successfully", query });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Fetch all Queries (Admin access)
exports.getAllQueries = async (req, res) => {
    try {
        const queries = await Query.findAll();
        res.status(200).json(queries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Fetch Queries Based on Role (User/Doctor)
exports.getQueriesByRole = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded.role;

        const queries = await Query.findAll({ where: { role } });

        res.status(200).json(queries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Edit Query by ID
exports.editQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const query = await Query.findByPk(id);
        if (!query) return res.status(404).json({ message: "Query not found" });

        query.message = message;
        await query.save();

        res.status(200).json({ message: "Query updated successfully", query });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
