const express = require('express');
const sequelize = require('./config/db');
const swaggerUi = require('swagger-ui-express');
const specs = require('./swagger');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const queryRoutes = require('./routes/query.routes');


const app = express();

app.use(express.json());


sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Unable to connect to the database:', err));


sequelize.sync({ alter: true });


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));


app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/query', queryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});