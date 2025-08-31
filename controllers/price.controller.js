const Price = require('../models/price.model');
const { Op } = require('sequelize');

// Predefined services list
const PREDEFINED_SERVICES = [
 "Clinic Appointment",
 "Virtual Appointment"
];

// Initialize predefined services (run this once to setup services)
exports.initializeServices = async (req, res) => {
  try {
    const existingServices = await Price.findAll({
      attributes: ['serviceName']
    });
    
    const existingServiceNames = existingServices.map(s => s.serviceName);
    const newServices = PREDEFINED_SERVICES.filter(service => 
      !existingServiceNames.includes(service)
    );

    if (newServices.length > 0) {
      const servicesToCreate = newServices.map(serviceName => ({
        serviceName,
        price: null // No price initially
      }));

      await Price.bulkCreate(servicesToCreate);
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Services initialized successfully',
      data: {
        newServicesAdded: newServices.length,
        totalServices: PREDEFINED_SERVICES.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Get all services with their prices
exports.getAllPrices = async (req, res) => {
  try {
    const { 
      hasPrice = null, // filter by services that have price set or not
      isActive = true 
    } = req.query;

    const whereClause = { isActive };

    // Filter by whether price is set or not
    if (hasPrice === 'true') {
      whereClause.price = { [Op.ne]: null };
    } else if (hasPrice === 'false') {
      whereClause.price = null;
    }

    const prices = await Price.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Services retrieved successfully',
      data: prices
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Get service by ID
exports.getPriceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Valid service ID is required',
        data: null
      });
    }

    const service = await Price.findByPk(id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Service not found',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Service retrieved successfully',
      data: service
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Add or Update price for a service
exports.addOrUpdatePrice = async (req, res) => {
  try {
    const { serviceName, price } = req.body;

    // Validation
    if (!serviceName) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Service name is required',
        data: null
      });
    }

    if (price === undefined || price === null || price <= 0) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Valid price greater than 0 is required',
        data: null
      });
    }

    // Check if service exists in predefined list
    if (!PREDEFINED_SERVICES.includes(serviceName)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid service name. Service must be from predefined list.',
        data: { availableServices: PREDEFINED_SERVICES }
      });
    }

    // Find or create the service
    const [service, created] = await Price.findOrCreate({
      where: { serviceName },
      defaults: {
        serviceName,
        price: parseFloat(price),
        isActive: true
      }
    });

    // If service exists, update the price
    if (!created) {
      await service.update({ 
        price: parseFloat(price),
        isActive: true 
      });
    }

    res.status(created ? 201 : 200).json({
      status: 'success',
      code: created ? 201 : 200,
      message: created ? 'Price added successfully' : 'Price updated successfully',
      data: service
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Update price by ID
exports.editPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Valid service ID is required',
        data: null
      });
    }

    if (price === undefined || price === null || price <= 0) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Valid price greater than 0 is required',
        data: null
      });
    }

    const service = await Price.findByPk(id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Service not found',
        data: null
      });
    }

    await service.update({ 
      price: parseFloat(price),
      isActive: true 
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Price updated successfully',
      data: service
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

// Remove price (set to null) but keep service active
exports.removePrice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Valid service ID is required',
        data: null
      });
    }

    const service = await Price.findByPk(id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Service not found',
        data: null
      });
    }

    await service.update({ price: null });

    res.json({
      status: 'success',
      code: 200,
      message: 'Price removed successfully',
      data: service
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message,
      data: null
    });
  }
};

exports.getAvailableServices = async (req, res) => {
    try {
      // Get services from database with their details instead of just predefined array
      const services = await Price.findAll({
        where: { 
          serviceName: { [Op.in]: PREDEFINED_SERVICES },
          isActive: true 
        },
        attributes: ['id', 'serviceName', 'price'],
        order: [['createdAt', 'DESC']]
      });
  
      res.json({
        status: 'success',
        code: 200,
        message: 'Available services retrieved successfully',
        data: {
          services: services,
          totalCount: services.length
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 500,
        message: error.message,
        data: null
      });
    }
  };