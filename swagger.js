const swaggerJsdoc = require('swagger-jsdoc');
const { version } = require('./package.json');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SID Clinic API',
      version,
      description: 'Comprehensive Dental Clinic Management System API',
      contact: {
        name: 'API Support',
        email: 'support@sidclinic.com'
      }
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Development server' },
      { url: 'https://sidclinic-app-web-be-ktgp.onrender.com/api', description: 'Testing Server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'phone', 'password', 'gender'],
          properties: {
            name: {
              type: 'string',
              example: 'John Doe'
            },
            phone: {
              type: 'string',
              example: '+919876543210'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'strongPassword123!'
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Other'],
              example: 'Male'
            },
            role: {
              type: 'string',
              enum: ['user', 'doctor', 'admin'],
              default: 'user'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              example: 400
            },
            message: {
              type: 'string',
              example: 'Invalid request'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Phone number must be valid']
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            phone: {
              type: 'string',
              example: '+919876543210'
            },
            role: {
              type: 'string',
              example: 'user'
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        // Add this new schema for card data response
        CardDataResponse: {
          type: 'object',
          properties: {
            customerCount: {
              type: 'integer',
              example: 42,
              description: 'Number of customers in the system'
            },
            doctorCount: {
              type: 'integer',
              example: 5,
              description: 'Number of doctors in the system'
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Invalid or missing authentication token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Dashboard',
        description: 'Dashboard statistics and overview operations'
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Dashboard',
        description: 'Dashboard statistics and overview operations'
      },
      {
        name: 'Queries',
        description: 'Queries Related Operations'
      }
      // Add more tags as needed
    ]
  },
  apis: ['./routes/*.js', './models/*.js', './controllers/*.js'] // Added controllers path
};

const specs = swaggerJsdoc(options);
module.exports = specs;