const User = require('../models/user.model');

/**
 * @swagger
 * /dashboard/getDashboardCardData:
 *   get:
 *     summary: Get counts of customers and doctors
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns counts of customers and doctors
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
      // Count customers (assuming 'customer' is the role for customers)
      const customerCount = await User.count({
        where: { role: 'user' }
      });
  
      // Count doctors (assuming 'doctor' is the role for doctors)
      const doctorCount = await User.count({
        where: { role: 'doctor' }
      });
  
      res.status(200).json({
        customerCount,
        doctorCount
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };