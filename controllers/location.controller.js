const Country = require('../models/country.model');
const State = require('../models/state.model');
const City = require('../models/city.model');
const { Op } = require('sequelize');

// Country Controllers
exports.getCountries = async (req, res) => {
  try {
    const { search, is_active } = req.query;
    
    // Build where clause
    let whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { country_name: { [Op.like]: `%${search}%` } },
        { country_short_name: { [Op.like]: `%${search}%` } },
        { country_code: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active;
    }

    const countries = await Country.findAll({
      where: whereClause,
      order: [['country_name', 'ASC']],
      attributes: [
        'country_id',
        'country_name',
        'country_short_name',
        'country_code',
        'is_min_max_available',
        'min_max_length',
        'min',
        'max',
        'date_format',
        'android_date_format',
        'node_date_format',
        'sql_report_date_format',
        'sql_report_date_format_with_time',
        'is_active'
      ]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Countries retrieved successfully',
      data: countries
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

exports.getCountryById = async (req, res) => {
  try {
    const country = await Country.findByPk(req.params.id);

    if (!country) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Country not found',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Country retrieved successfully',
      data: country
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

// State Controllers
exports.getStates = async (req, res) => {
  try {
    const { country_id, search, is_active } = req.query;
    
    // Build where clause
    let whereClause = {};
    
    if (country_id) {
      whereClause.country_id = country_id;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { state_name: { [Op.like]: `%${search}%` } },
        { state_short_name: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active;
    }

    const states = await State.findAll({
      where: whereClause,
      include: [{
        model: Country,
        attributes: ['country_id', 'country_name', 'country_short_name']
      }],
      order: [['state_name', 'ASC']]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'States retrieved successfully',
      data: states
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

exports.getStateById = async (req, res) => {
  try {
    const state = await State.findByPk(req.params.id, {
      include: [{
        model: Country,
        attributes: ['country_id', 'country_name', 'country_short_name']
      }]
    });

    if (!state) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'State not found',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'State retrieved successfully',
      data: state
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

exports.getStatesByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;
    const { search, is_active } = req.query;
    
    // Build where clause
    let whereClause = { country_id };
    
    if (search) {
      whereClause[Op.or] = [
        { state_name: { [Op.like]: `%${search}%` } },
        { state_short_name: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active;
    }

    const states = await State.findAll({
      where: whereClause,
      order: [['state_name', 'ASC']]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'States retrieved successfully',
      data: states
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

// City Controllers
exports.getCities = async (req, res) => {
  try {
    const { state_id, country_id, search, is_active } = req.query;
    
    // Build where clause
    let whereClause = {};
    
    if (state_id) {
      whereClause.state_id = state_id;
    }
    
    if (country_id) {
      whereClause.country_id = country_id;
    }
    
    if (search) {
      whereClause.city_name = { [Op.like]: `%${search}%` };
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active;
    }

    const cities = await City.findAll({
      where: whereClause,
      include: [
        {
          model: State,
          attributes: ['state_id', 'state_name', 'state_short_name']
        },
        {
          model: Country,
          attributes: ['country_id', 'country_name', 'country_short_name']
        }
      ],
      order: [['city_name', 'ASC']]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Cities retrieved successfully',
      data: cities
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

exports.getCityById = async (req, res) => {
  try {
    const city = await City.findByPk(req.params.id, {
      include: [
        {
          model: State,
          attributes: ['state_id', 'state_name', 'state_short_name']
        },
        {
          model: Country,
          attributes: ['country_id', 'country_name', 'country_short_name']
        }
      ]
    });

    if (!city) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'City not found',
        data: null
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'City retrieved successfully',
      data: city
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

exports.getCitiesByState = async (req, res) => {
  try {
    const { state_id } = req.params;
    const { search, is_active } = req.query;
    
    // Build where clause
    let whereClause = { state_id };
    
    if (search) {
      whereClause.city_name = { [Op.like]: `%${search}%` };
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active;
    }

    const cities = await City.findAll({
      where: whereClause,
      order: [['city_name', 'ASC']]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Cities retrieved successfully',
      data: cities
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

exports.getCitiesByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;
    const { search, is_active } = req.query;
    
    // Build where clause
    let whereClause = { country_id };
    
    if (search) {
      whereClause.city_name = { [Op.like]: `%${search}%` };
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active;
    }

    const cities = await City.findAll({
      where: whereClause,
      include: [{
        model: State,
        attributes: ['state_id', 'state_name', 'state_short_name']
      }],
      order: [['city_name', 'ASC']]
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'Cities retrieved successfully',
      data: cities
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