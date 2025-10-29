const User = require('../models/user.model');
const Appointment = require('../models/appoinment.model');
const Payment = require('../models/payment.model');
const Query = require('../models/query.model');
const MedicalReport = require('../models/medicalReport.model');
const { Op } = require('sequelize');

// Helper function to generate monthly data for the last 12 months
const generateMonthlyData = async (model, dateField, whereCondition = {}) => {
  const monthlyData = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const count = await model.count({
      where: {
        ...whereCondition,
        [dateField]: {
          [Op.between]: [monthStart, monthEnd]
        }
      }
    });
    
    monthlyData.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
      count: count
    });
  }
  
  return monthlyData;
};

/**
 * @swagger
 * /dashboard/getDashboardCardData:
 *   get:
 *     summary: Get counts of customers and doctors with graph data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns counts of customers and doctors with graph data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customerCount:
 *                   type: integer
 *                   description: Number of customers in the system
 *                 doctorCount:
 *                   type: integer
 *                   description: Number of doctors in the system
 *                 totalAppointments:
 *                   type: integer
 *                   description: Total number of appointments in the system
 *                 totalSuccessfulPayments:
 *                   type: integer
 *                   description: Total number of successful payments
 *                 totalRevenue:
 *                   type: number
 *                   format: float
 *                   description: Total revenue from successful payments
 *                 totalQueries:
 *                   type: integer
 *                   description: Total number of support queries
 *                 totalMedicalReports:
 *                   type: integer
 *                   description: Total number of medical reports
 *                 pendingAppointments:
 *                   type: integer
 *                   description: Number of pending appointments
 *                 completedAppointments:
 *                   type: integer
 *                   description: Number of completed appointments
 *                 graphData:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             description: Month and year (e.g., Jan 2025)
 *                           count:
 *                             type: integer
 *                             description: Number of users registered in that month
 *                     appointments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             description: Month and year
 *                           count:
 *                             type: integer
 *                             description: Number of appointments in that month
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             description: Month and year
 *                           count:
 *                             type: integer
 *                             description: Number of successful payments in that month
 *                     revenue:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             description: Month and year
 *                           amount:
 *                             type: number
 *                             format: float
 *                             description: Total revenue in that month
 *                     queries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             description: Month and year
 *                           count:
 *                             type: integer
 *                             description: Number of queries in that month
 *                     medicalReports:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             description: Month and year
 *                           count:
 *                             type: integer
 *                             description: Number of medical reports in that month
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.getCardData = async (req, res) => {
    try {
      // Count customers (assuming 'user' is the role for customers)
      const customerCount = await User.count({
        where: { role: 'user' }
      });
  
      // Count doctors (assuming 'doctor' is the role for doctors)
      const doctorCount = await User.count({
        where: { role: 'doctor' }
      });

      // Get additional total counts for card data
      const [
        totalAppointments,
        totalSuccessfulPayments,
        totalRevenue,
        totalQueries,
        totalMedicalReports,
        pendingAppointments,
        completedAppointments
      ] = await Promise.all([
        // Total appointments
        Appointment.count(),
        
        // Total successful payments
        Payment.count({ where: { status: 'success' } }),
        
        // Total revenue from successful payments
        Payment.sum('amount', { where: { status: 'success' } }),
        
        // Total queries
        Query.count(),
        
        // Total medical reports
        MedicalReport.count(),
        
        // Pending appointments
        Appointment.count({ where: { status: 'pending' } }),
        
        // Completed appointments
        Appointment.count({ where: { status: 'completed' } })
      ]);

      // Generate graph data for various metrics
      const [
        usersMonthly,
        appointmentsMonthly,
        paymentsMonthly,
        revenueMonthly,
        queriesMonthly,
        medicalReportsMonthly
      ] = await Promise.all([
        // Users registration by month
        generateMonthlyData(User, 'createdAt'),
        
        // Appointments by month
        generateMonthlyData(Appointment, 'createdAt'),
        
        // Successful payments count by month
        generateMonthlyData(Payment, 'createdAt', { status: 'success' }),
        
        // Revenue by month (sum of successful payments)
        (async () => {
          const revenueData = [];
          const now = new Date();
          
          for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            
            const result = await Payment.sum('amount', {
              where: {
                status: 'success',
                createdAt: {
                  [Op.between]: [monthStart, monthEnd]
                }
              }
            });
            
            revenueData.push({
              month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
              amount: result || 0
            });
          }
          
          return revenueData;
        })(),
        
        // Queries by month
        generateMonthlyData(Query, 'createdAt'),
        
        // Medical reports by month
        generateMonthlyData(MedicalReport, 'uploadDate')
      ]);
  
      res.status(200).json({
        status: 'success',
        code: 200,
        message: 'Counts retrieved successfully',
        data: {
          customerCount,
          doctorCount,
          totalAppointments,
          totalSuccessfulPayments,
          totalRevenue: totalRevenue || 0,
          totalQueries,
          totalMedicalReports,
          pendingAppointments,
          completedAppointments,
          graphData: {
            users: usersMonthly,
            appointments: appointmentsMonthly,
            payments: paymentsMonthly,
            revenue: revenueMonthly,
            queries: queriesMonthly,
            medicalReports: medicalReportsMonthly
          }
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error',
        code: 500,
        message: error.message 
      });
    }
  };