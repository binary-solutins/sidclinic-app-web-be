# SID Clinic Backend - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the SID Clinic Backend to various platforms and environments.

## Prerequisites

### System Requirements
- **Node.js**: v14.0.0 or higher
- **MySQL**: v8.0.0 or higher
- **Memory**: Minimum 512MB RAM
- **Storage**: Minimum 1GB free space
- **Network**: Stable internet connection

### Required Accounts
- **Database**: MySQL hosting (AWS RDS, PlanetScale, Railway, etc.)
- **File Storage**: Appwrite account
- **Email Service**: SMTP provider (Gmail, SendGrid, etc.)
- **Deployment Platform**: Vercel, Render, Heroku, AWS, etc.

## Environment Configuration

### Required Environment Variables

```env
# Database Configuration
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Appwrite Configuration
APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_BUCKET_ID=your-bucket-id

# Firebase Configuration (Optional)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Azure Communication Services (Optional)
AZURE_COMMUNICATION_CONNECTION_STRING=your-connection-string

# Server Configuration
PORT=3000
NODE_ENV=production
```

### Environment Variable Descriptions

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DB_HOST` | MySQL database host URL | Yes | `localhost` or `your-db-host.com` |
| `DB_USER` | Database username | Yes | `root` or `app_user` |
| `DB_PASSWORD` | Database password | Yes | `your_secure_password` |
| `DB_NAME` | Database name | Yes | `sid_clinic_db` |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | `your-super-secure-secret-key` |
| `EMAIL_HOST` | SMTP server host | Yes | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP server port | Yes | `587` |
| `EMAIL_USER` | SMTP username | Yes | `your-email@gmail.com` |
| `EMAIL_PASS` | SMTP password/app password | Yes | `your-app-password` |
| `APPWRITE_ENDPOINT` | Appwrite instance URL | Yes | `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Appwrite project ID | Yes | `your-project-id` |
| `APPWRITE_API_KEY` | Appwrite API key | Yes | `your-api-key` |
| `APPWRITE_BUCKET_ID` | Appwrite bucket ID | Yes | `your-bucket-id` |
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment mode | No | `production` |

## Database Setup

### 1. Create Database

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE sid_clinic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional)
CREATE USER 'app_user'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON sid_clinic_db.* TO 'app_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Database Hosting Options

#### AWS RDS
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier sid-clinic-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password your-password \
  --allocated-storage 20
```

#### PlanetScale
1. Create account at planetscale.com
2. Create new database
3. Get connection string from dashboard

#### Railway
1. Create account at railway.app
2. Create new MySQL service
3. Get connection details from service dashboard

## File Storage Setup (Appwrite)

### 1. Appwrite Installation

#### Self-hosted Appwrite
```bash
# Install Appwrite CLI
curl -sL https://appwrite.io/cli/install.sh | bash

# Start Appwrite
appwrite init
```

#### Cloud Appwrite
1. Create account at cloud.appwrite.io
2. Create new project
3. Create storage bucket

### 2. Configure Appwrite

```bash
# Create bucket for file uploads
appwrite storage createBucket \
  --bucketId 'uploads' \
  --name 'Uploads' \
  --permissions '["read(\"any\")", "write(\"any\")"]'

# Create API key
appwrite projects createKey \
  --projectId 'your-project-id' \
  --name 'API Key' \
  --scopes '["files.read", "files.write"]'
```

## Email Service Setup

### Gmail SMTP
1. Enable 2-factor authentication
2. Generate app password
3. Use app password in EMAIL_PASS

### SendGrid
1. Create SendGrid account
2. Verify sender email
3. Create API key
4. Update environment variables

## Deployment Options

### 1. Vercel Deployment

#### Prerequisites
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login
```

#### Deployment Steps
```bash
# Navigate to project directory
cd sid-clinic-backend

# Deploy to Vercel
vercel --prod

# Set environment variables
vercel env add DB_HOST
vercel env add DB_USER
vercel env add DB_PASSWORD
vercel env add DB_NAME
vercel env add JWT_SECRET
vercel env add EMAIL_HOST
vercel env add EMAIL_PORT
vercel env add EMAIL_USER
vercel env add EMAIL_PASS
vercel env add APPWRITE_ENDPOINT
vercel env add APPWRITE_PROJECT_ID
vercel env add APPWRITE_API_KEY
vercel env add APPWRITE_BUCKET_ID
```

#### Vercel Configuration
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Render Deployment

#### Prerequisites
1. Create Render account
2. Connect GitHub repository

#### Deployment Steps
1. **Create New Web Service**
   - Connect GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm start`

2. **Environment Variables**
   - Add all required environment variables in Render dashboard
   - Set `NODE_ENV=production`

3. **Database Setup**
   - Create PostgreSQL service in Render
   - Update `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### 3. Heroku Deployment

#### Prerequisites
```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login to Heroku
heroku login
```

#### Deployment Steps
```bash
# Create Heroku app
heroku create sid-clinic-backend

# Add MySQL addon
heroku addons:create jawsdb:kitefin

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set EMAIL_HOST=smtp.gmail.com
heroku config:set EMAIL_PORT=587
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-app-password
heroku config:set APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
heroku config:set APPWRITE_PROJECT_ID=your-project-id
heroku config:set APPWRITE_API_KEY=your-api-key
heroku config:set APPWRITE_BUCKET_ID=your-bucket-id

# Deploy
git push heroku main
```

### 4. AWS EC2 Deployment

#### Prerequisites
- AWS account
- EC2 instance (t2.micro or higher)
- Security group with ports 22, 80, 443, 3000

#### Deployment Steps

1. **Connect to EC2**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

2. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install MySQL
   sudo apt install mysql-server -y
   sudo mysql_secure_installation

   # Install PM2
   sudo npm install -g pm2
   ```

3. **Clone and Setup**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/sid-clinic-backend.git
   cd sid-clinic-backend

   # Install dependencies
   npm install

   # Create .env file
   nano .env
   # Add all environment variables
   ```

4. **Setup Database**
   ```bash
   # Connect to MySQL
   sudo mysql

   # Create database
   CREATE DATABASE sid_clinic_db;
   CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON sid_clinic_db.* TO 'app_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. **Start Application**
   ```bash
   # Start with PM2
   pm2 start server.js --name "sid-clinic-backend"

   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx (Optional)**
   ```bash
   # Install Nginx
   sudo apt install nginx -y

   # Create Nginx configuration
   sudo nano /etc/nginx/sites-available/sid-clinic
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/sid-clinic /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 5. Docker Deployment

#### Create Dockerfile
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### Create docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_USER=app_user
      - DB_PASSWORD=your_password
      - DB_NAME=sid_clinic_db
      - JWT_SECRET=your_jwt_secret
      - EMAIL_HOST=smtp.gmail.com
      - EMAIL_PORT=587
      - EMAIL_USER=your_email@gmail.com
      - EMAIL_PASS=your_app_password
      - APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
      - APPWRITE_PROJECT_ID=your_project_id
      - APPWRITE_API_KEY=your_api_key
      - APPWRITE_BUCKET_ID=your_bucket_id
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=sid_clinic_db
      - MYSQL_USER=app_user
      - MYSQL_PASSWORD=your_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

#### Deploy with Docker
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f app
```

## SSL/HTTPS Setup

### Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare SSL
1. Add domain to Cloudflare
2. Update nameservers
3. Enable SSL/TLS encryption mode to "Full"
4. Enable "Always Use HTTPS"

## Monitoring and Logging

### PM2 Monitoring
```bash
# Monitor application
pm2 monit

# View logs
pm2 logs sid-clinic-backend

# Restart application
pm2 restart sid-clinic-backend
```

### Health Check Endpoint
```javascript
// Add to server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});
```

### Error Monitoring
```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Initialize Sentry
sentry init
```

## Backup Strategy

### Database Backup
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup_$DATE.sql

# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

### File Backup
```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Test database connection
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SELECT 1;"

# Check environment variables
echo $DB_HOST $DB_USER $DB_NAME
```

#### Port Issues
```bash
# Check if port is in use
sudo netstat -tulpn | grep :3000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3000)
```

#### Memory Issues
```bash
# Check memory usage
free -h

# Increase swap space
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Log Analysis
```bash
# View application logs
pm2 logs sid-clinic-backend --lines 100

# View system logs
sudo journalctl -u nginx -f
```

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_appointments_date ON Appointments(appointmentDate);
CREATE INDEX idx_appointments_status ON Appointments(status);
CREATE INDEX idx_users_phone ON Users(phone);
CREATE INDEX idx_doctors_city ON Doctors(city);
```

#### Application Optimization
```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Enable caching
app.use(express.static('public', {
  maxAge: '1d'
}));
```

## Security Checklist

- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up CORS properly
- [ ] Use Helmet security headers
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] File upload validation

## Maintenance

### Regular Tasks
- **Daily**: Check application logs
- **Weekly**: Database backup
- **Monthly**: Security updates
- **Quarterly**: Performance review

### Update Process
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Restart application
pm2 restart sid-clinic-backend

# Check status
pm2 status
```

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: SID Clinic Development Team 