const User = require('../models/user.model');
const Appointment = require('../models/appoinment.model');
const Payment = require('../models/payment.model');
const { Op } = require('sequelize');

/**
 * @swagger
 * /dashboard/getDashboardCardData:
 *   get:
 *     summary: Get comprehensive dashboard metrics for graphs and cards
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns comprehensive dashboard metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userCounts:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     user:
 *                       type: integer
 *                     doctor:
 *                       type: integer
 *                     admin:
 *                       type: integer
 *                     virtualDoctor:
 *                       type: integer
 *                 appointmentCounts:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     confirmed:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     canceled:
 *                       type: integer
 *                     rejected:
 *                       type: integer
 *                     reschedule_requested:
 *                       type: integer
 *                 paymentStats:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                       format: float
 *                     totalTransactions:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                 todayStats:
 *                   type: object
 *                   properties:
 *                     appointments:
 *                       type: integer
 *                     newUsers:
 *                       type: integer
 *                     revenue:
 *                       type: number
 *                       format: float
 *                 weeklyTrends:
 *                   type: object
 *                   properties:
 *                     appointments:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     revenue:
 *                       type: array
 *                       items:
 *                         type: number
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
      // Get current date and calculate date ranges
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));
      
      // Calculate last 7 days for trends
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last7Days.push(date);
      }

      // 1. User counts by role
      const userCounts = {
        total: await User.count(),
        user: await User.count({ where: { role: 'user' } }),
        doctor: await User.count({ where: { role: 'doctor' } }),
        admin: await User.count({ where: { role: 'admin' } }),
        virtualDoctor: await User.count({ where: { role: 'virtual-doctor' } })
      };

      // 2. Appointment counts by status
      const appointmentCounts = await Appointment.getStatusCounts();

      // 3. Payment statistics
      const paymentStats = await Payment.getTotalRevenue(new Date(0), new Date());
      const paymentStatusCounts = await Payment.findAll({
        attributes: [
          'status',
          [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Convert payment status counts to object
      const paymentStatusObj = {};
      paymentStatusCounts.forEach(item => {
        paymentStatusObj[item.status] = parseInt(item.count);
      });

      // 4. Today's statistics
      const todayAppointments = await Appointment.count({
        where: {
          createdAt: { [Op.between]: [todayStart, todayEnd] }
        }
      });

      const todayNewUsers = await User.count({
        where: {
          createdAt: { [Op.between]: [todayStart, todayEnd] }
        }
      });

      const todayRevenue = await Payment.findOne({
        where: {
          status: 'success',
          completedAt: { [Op.between]: [todayStart, todayEnd] }
        },
        attributes: [
          [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
        ],
        raw: true
      });

      // 5. Weekly trends for appointments and revenue
      const weeklyAppointments = [];
      const weeklyRevenue = [];

      for (const day of last7Days) {
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        // Appointments per day
        const dayAppointments = await Appointment.count({
          where: {
            createdAt: { [Op.between]: [day, dayEnd] }
          }
        });
        weeklyAppointments.push(dayAppointments);

        // Revenue per day
        const dayRevenue = await Payment.findOne({
          where: {
            status: 'success',
            completedAt: { [Op.between]: [day, dayEnd] }
          },
          attributes: [
            [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
          ],
          raw: true
        });
        weeklyRevenue.push(parseFloat(dayRevenue?.total || 0));
      }

      res.status(200).json({
        status: 'success',
        code: 200,
        message: 'Dashboard metrics retrieved successfully',
        data: {
          userCounts,
          appointmentCounts,
          paymentStats: {
            totalRevenue: paymentStats.totalRevenue,
            totalTransactions: paymentStats.totalTransactions,
            success: paymentStatusObj.success || 0,
            pending: (paymentStatusObj.pending || 0) + (paymentStatusObj.initiated || 0) + (paymentStatusObj.processing || 0),
            failed: (paymentStatusObj.failed || 0) + (paymentStatusObj.cancelled || 0) + (paymentStatusObj.expired || 0)
          },
          todayStats: {
            appointments: todayAppointments,
            newUsers: todayNewUsers,
            revenue: parseFloat(todayRevenue?.total || 0)
          },
          weeklyTrends: {
            appointments: weeklyAppointments,
            revenue: weeklyRevenue
          }
        }
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ 
        status: 'error',
        code: 500,
        message: error.message 
      });
    }
  };