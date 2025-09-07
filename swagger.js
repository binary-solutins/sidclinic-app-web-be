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
        Query: {
          type: 'object',
          required: ['title', 'description', 'category', 'priority'],
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            title: {
              type: 'string',
              example: 'Appointment booking issue',
              maxLength: 200
            },
            description: {
              type: 'string',
              example: 'I\'m unable to book an appointment for tomorrow',
              maxLength: 2000
            },
            category: {
              type: 'string',
              enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other'],
              example: 'Appointment'
            },
            priority: {
              type: 'string',
              enum: ['Low', 'Medium', 'High', 'Urgent'],
              example: 'Medium'
            },
            status: {
              type: 'string',
              enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
              example: 'Open'
            },
            raisedBy: {
              type: 'integer',
              example: 1
            },
            raisedByRole: {
              type: 'string',
              enum: ['user', 'doctor'],
              example: 'user'
            },
            assignedTo: {
              type: 'integer',
              nullable: true,
              example: 2
            },
            attachments: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['https://example.com/file1.jpg']
            },
            resolvedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            resolution: {
              type: 'string',
              nullable: true,
              example: 'Issue resolved by updating the booking system'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        CreateQueryRequest: {
          type: 'object',
          required: ['title', 'description', 'category', 'priority'],
          properties: {
            title: {
              type: 'string',
              example: 'Appointment booking issue'
            },
            description: {
              type: 'string',
              example: 'I\'m unable to book an appointment for tomorrow'
            },
            category: {
              type: 'string',
              enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other'],
              example: 'Appointment'
            },
            priority: {
              type: 'string',
              enum: ['Low', 'Medium', 'High', 'Urgent'],
              example: 'Medium'
            },
            attachments: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['https://example.com/file1.jpg']
            }
          }
        },
        UpdateQueryRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              example: 'Updated appointment booking issue'
            },
            description: {
              type: 'string',
              example: 'Updated description of the issue'
            },
            category: {
              type: 'string',
              enum: ['General', 'Technical', 'Billing', 'Appointment', 'Medical', 'Other']
            },
            priority: {
              type: 'string',
              enum: ['Low', 'Medium', 'High', 'Urgent']
            },
            status: {
              type: 'string',
              enum: ['Open', 'In Progress', 'Resolved', 'Closed']
            },
            assignedTo: {
              type: 'integer',
              example: 2
            },
            resolution: {
              type: 'string',
              example: 'Issue resolved by updating the booking system'
            },
            attachments: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        },
        QueryResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Query created successfully'
            },
            data: {
              $ref: '#/components/schemas/Query'
            }
          }
        },
        QueryListResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Queries retrieved successfully'
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Query'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  example: 10
                },
                total: {
                  type: 'integer',
                  example: 25
                },
                totalPages: {
                  type: 'integer',
                  example: 3
                }
              }
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
        },
        Report: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'report_123'
            },
            relativeId: {
              type: 'integer',
              example: 1
            },
            relativeName: {
              type: 'string',
              example: 'John Doe'
            },
            reportType: {
              type: 'string',
              enum: ['oral_diagnosis', 'dental_analysis', 'teeth_detection', 'cavity_detection', 'plaque_detection', 'other'],
              example: 'oral_diagnosis'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            boundingBoxData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  imageName: {
                    type: 'string',
                    example: 'front_teeth.jpg'
                  },
                  imageType: {
                    type: 'string',
                    example: 'front'
                  },
                  description: {
                    type: 'string',
                    example: 'Front teeth analysis showing detected issues: cavities, plaque'
                  },
                  originalImageUri: {
                    type: 'string',
                    example: 'file://path/to/image1.jpg'
                  },
                  detections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        class_name: {
                          type: 'string',
                          example: 'cavity'
                        },
                        confidence: {
                          type: 'number',
                          example: 0.85
                        },
                        bbox: {
                          type: 'array',
                          items: {
                            type: 'number'
                          },
                          example: [100, 150, 200, 250]
                        }
                      }
                    }
                  },
                  teethDetection: {
                    type: 'object',
                    properties: {
                      teeth_count: {
                        type: 'integer',
                        example: 8
                      },
                      positions: {
                        type: 'array',
                        items: {
                          type: 'object'
                        }
                      }
                    }
                  },
                  imageDimensions: {
                    type: 'object',
                    properties: {
                      width: {
                        type: 'integer',
                        example: 800
                      },
                      height: {
                        type: 'integer',
                        example: 600
                      }
                    }
                  },
                  defectSummary: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        className: {
                          type: 'string',
                          example: 'cavity'
                        },
                        confidence: {
                          type: 'number',
                          example: 0.85
                        },
                        locations: {
                          type: 'array',
                          items: {
                            type: 'string'
                          },
                          example: ['front']
                        }
                      }
                    }
                  }
                }
              }
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['https://appwrite.io/storage/buckets/bucket_id/files/file_id/view']
            }
          }
        },
        VirtualDoctor: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
              description: 'Doctor record ID'
            },
            userId: {
              type: 'integer',
              example: 1,
              description: 'User record ID'
            },
            name: {
              type: 'string',
              example: 'Dr. Virtual Smith'
            },
            phone: {
              type: 'string',
              example: '+1234567890'
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Other'],
              example: 'Male'
            },
            role: {
              type: 'string',
              example: 'virtual-doctor'
            },
            specialty: {
              type: 'string',
              example: 'General Medicine'
            },
            degree: {
              type: 'string',
              example: 'MBBS'
            },
            registrationNumber: {
              type: 'string',
              example: 'VIRTUAL-1705123456789',
              description: 'Medical registration number'
            },
            clinicName: {
              type: 'string',
              example: 'Virtual Health Clinic'
            },
            yearsOfExperience: {
              type: 'integer',
              example: 5
            },
            isApproved: {
              type: 'boolean',
              example: true,
              description: 'Auto-approved for virtual doctors'
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            notificationEnabled: {
              type: 'boolean',
              example: true
            }
          }
        },
        CreateVirtualDoctorRequest: {
          type: 'object',
          required: ['name', 'phone', 'gender', 'password'],
          properties: {
            name: {
              type: 'string',
              description: 'Virtual doctor\'s full name',
              example: 'Dr. Virtual Smith'
            },
            phone: {
              type: 'string',
              description: 'Virtual doctor\'s phone number',
              example: '+1234567890'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Virtual doctor\'s password',
              example: 'virtual123'
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Other'],
              description: 'Virtual doctor\'s gender',
              example: 'Male'
            },
            specialty: {
              type: 'string',
              description: 'Virtual doctor\'s medical specialty',
              default: 'General Medicine',
              example: 'General Medicine'
            },
            degree: {
              type: 'string',
              description: 'Virtual doctor\'s medical degree',
              default: 'MBBS',
              example: 'MBBS'
            },
            registrationNumber: {
              type: 'string',
              description: 'Medical registration number (auto-generated if not provided)',
              default: 'VIRTUAL-{timestamp}',
              example: 'VIRTUAL-1705123456789'
            },
            yearsOfExperience: {
              type: 'integer',
              description: 'Years of medical experience',
              default: 0,
              example: 5
            },
            clinicName: {
              type: 'string',
              description: 'Virtual clinic name',
              default: 'Virtual Clinic',
              example: 'Virtual Health Clinic'
            },
            clinicContactNumber: {
              type: 'string',
              description: 'Clinic contact number (defaults to phone if not provided)',
              example: '+1234567890'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Virtual doctor\'s email (defaults to phone@virtual.com if not provided)',
              example: 'dr.virtual@clinic.com'
            },
            address: {
              type: 'string',
              description: 'Virtual clinic address',
              default: 'Virtual Address',
              example: '123 Virtual Street, Digital City'
            },
            country: {
              type: 'string',
              description: 'Country',
              default: 'India',
              example: 'India'
            },
            state: {
              type: 'string',
              description: 'State',
              default: 'Virtual State',
              example: 'Maharashtra'
            },
            city: {
              type: 'string',
              description: 'City',
              default: 'Virtual City',
              example: 'Mumbai'
            },
            locationPin: {
              type: 'string',
              description: 'Location PIN code',
              default: '000000',
              example: '400001'
            },
            startTime: {
              type: 'string',
              format: 'time',
              description: 'Virtual clinic start time (HH:MM:SS format)',
              default: '09:00:00',
              example: '09:00:00'
            },
            endTime: {
              type: 'string',
              format: 'time',
              description: 'Virtual clinic end time (HH:MM:SS format)',
              default: '18:00:00',
              example: '18:00:00'
            }
          }
        }
      },
      Banner: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
            description: 'Banner ID'
          },
          title: {
            type: 'string',
            example: 'Modern Dental Care',
            description: 'Banner title'
          },
          subtitle: {
            type: 'string',
            example: 'Advanced Technology for Perfect Smiles',
            description: 'Banner subtitle'
          },
          image: {
            type: 'string',
            example: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=800',
            description: 'Banner image URL'
          },
          isDoctorApp: {
            type: 'boolean',
            example: true,
            description: 'Flag to determine app type (true = doctor app, false = patient app)'
          },
          order: {
            type: 'integer',
            example: 1,
            description: 'Display order for banners'
          },
          isActive: {
            type: 'boolean',
            example: true,
            description: 'Banner active status'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
            description: 'Banner creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
            description: 'Banner last update timestamp'
          }
        }
      },
      DoctorAppBanner: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
            description: 'Banner ID'
          },
          title: {
            type: 'string',
            example: 'Modern Dental Care',
            description: 'Banner title'
          },
          subtitle: {
            type: 'string',
            example: 'Advanced Technology for Perfect Smiles',
            description: 'Banner subtitle'
          },
          image: {
            type: 'string',
            example: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=800',
            description: 'Banner image URL'
          },
          isDoctorApp: {
            type: 'boolean',
            example: true,
            description: 'Flag indicating this is for doctor app'
          },
          order: {
            type: 'integer',
            example: 1,
            description: 'Display order for banners'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
            description: 'Banner creation timestamp'
          }
        }
      },
      PatientAppBanner: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
            description: 'Banner ID'
          },
          image: {
            type: 'string',
            example: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=800',
            description: 'Banner image URL'
          },
          order: {
            type: 'integer',
            example: 1,
            description: 'Display order for banners'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
            description: 'Banner creation timestamp'
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
        name: 'Queries',
        description: 'Queries Related Operations'
      },
      {
        name: 'Reports',
        description: 'Dental analysis reports and medical reports operations'
      },
      {
        name: 'Admin - Virtual Doctors',
        description: 'Admin endpoints for managing virtual doctors'
      },
      {
        name: 'Virtual Doctor',
        description: 'Virtual doctor specific endpoints and operations'
      },
      // Add more tags as needed
      {
        name: 'Banners',
        description: 'Banner management endpoints'
      }
    ]
  },
  apis: ['./routes/*.js', './models/*.js', './controllers/*.js'] // Added controllers path
};

const specs = swaggerJsdoc(options);
module.exports = specs;