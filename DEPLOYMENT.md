# Deployment Guide

## Production Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Database backups created
- [ ] Performance testing completed

### Frontend Deployment (Netlify)

#### Automatic Deployment
1. Connect repository to Netlify
2. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18

#### Manual Deployment
```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Backend Deployment (Docker)

#### Production Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6.0
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=ai-supply-chain

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  mongo_data:
  redis_data:
```

#### Deploy Commands
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### Environment Configuration

#### Production Environment Variables
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-supply-chain
REDIS_URL=redis://redis-instance:6379
JWT_SECRET=your-production-jwt-secret-256-bits
JWT_REFRESH_SECRET=your-production-refresh-secret-256-bits
CLIENT_URL=https://your-domain.com
LOG_LEVEL=info
```

### SSL/TLS Configuration

#### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://app:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Database Migration

#### Production Database Setup
```bash
# Create production database
mongosh "mongodb+srv://cluster.mongodb.net/ai-supply-chain" --username admin

# Run migrations
npm run migrate:prod

# Create indexes
npm run create-indexes
```

### Monitoring Setup

#### Health Check Endpoint
```bash
curl https://your-api-domain.com/health
```

#### Log Monitoring
```bash
# View application logs
docker-compose logs -f app

# Monitor error logs
tail -f logs/error.log
```

### Scaling Configuration

#### Horizontal Scaling
```yaml
services:
  app:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

#### Load Balancer Configuration
```nginx
upstream backend {
    server app1:3001;
    server app2:3001;
    server app3:3001;
}
```

### Backup Strategy

#### Database Backup
```bash
# MongoDB backup
mongodump --uri="mongodb+srv://cluster.mongodb.net/ai-supply-chain" --out=backup/

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="backup/backup_$DATE"
```

#### Redis Backup
```bash
# Redis backup
redis-cli --rdb backup/dump.rdb
```

### Security Hardening

#### Firewall Configuration
```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

#### Docker Security
```dockerfile
# Use non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

### Performance Optimization

#### Database Optimization
```javascript
// Create production indexes
db.orders.createIndex({ "customerId": 1, "createdAt": -1 })
db.orders.createIndex({ "storeId": 1, "status": 1 })
db.inventory.createIndex({ "storeId": 1, "sku": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
```

#### Caching Configuration
```javascript
// Redis caching strategy
const cacheConfig = {
  sessions: { ttl: 900 },      // 15 minutes
  inventory: { ttl: 300 },     // 5 minutes
  routes: { ttl: 1800 },       // 30 minutes
  analytics: { ttl: 600 }      // 10 minutes
};
```

### Rollback Procedures

#### Application Rollback
```bash
# Rollback to previous version
docker-compose down
docker-compose up -d --scale app=0
docker-compose up -d
```

#### Database Rollback
```bash
# Restore from backup
mongorestore --uri="$MONGODB_URI" --drop backup/backup_YYYYMMDD_HHMMSS/
```

### Post-deployment Verification

#### Smoke Tests
```bash
# Test API endpoints
curl -f https://your-api-domain.com/health
curl -f https://your-api-domain.com/api/stores

# Test WebSocket connection
wscat -c wss://your-api-domain.com/socket.io/

# Test agent communication
curl -X POST https://your-api-domain.com/api/agents/health
```

#### Performance Tests
```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://your-api-domain.com/api/orders

# Monitor response times
curl -w "@curl-format.txt" -s -o /dev/null https://your-api-domain.com/api/health
```

### Maintenance Procedures

#### Regular Maintenance
- Weekly database optimization
- Monthly log rotation
- Quarterly security updates
- Bi-annual performance reviews

#### Update Procedures
```bash
# Update application
git pull origin main
npm install
npm run build
docker-compose up -d --build

# Update dependencies
npm audit fix
npm update
```

This deployment guide ensures a robust, secure, and scalable production environment for the AI Supply Chain Command Center.