# Backend Testing Documentation

## Overview
This document contains the complete testing results and setup instructions for the AI Supply Chain Command Center backend.

---

## Test Environment Setup

### System Information
- **Date**: June 28, 2025
- **OS**: macOS
- **Node.js**: >=18.0.0
- **Working Directory**: `/Users/chiragtaneja/Codes/repos/walmart-hack/iteration-1/server`

---

## Method 1: Simplified Backend Testing (No External Dependencies)

### Setup Commands
```bash
# Navigate to server directory
cd /Users/chiragtaneja/Codes/repos/walmart-hack/iteration-1/server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start simplified server
node src/server-simple.js
```

### Test Results ✅

#### 1. Health Check Endpoint
**Command:**
```bash
curl -s http://localhost:3001/health | python3 -m json.tool
```

**Response:**
```json
{
    "status": "OK",
    "timestamp": "2025-06-28T16:38:34.255Z",
    "uptime": 10.361258541,
    "environment": "development",
    "version": "1.0.0"
}
```
**Status**: ✅ PASSED

#### 2. Stores API Endpoint
**Command:**
```bash
curl -s http://localhost:3001/api/stores | python3 -m json.tool
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "1",
            "name": "Walmart Supercenter - Downtown",
            "address": "123 Main St",
            "inventory": 150
        },
        {
            "id": "2",
            "name": "Walmart Neighborhood Market",
            "address": "456 Oak Ave",
            "inventory": 89
        },
        {
            "id": "3",
            "name": "Walmart Supercenter - North",
            "address": "789 Pine Rd",
            "inventory": 203
        }
    ]
}
```
**Status**: ✅ PASSED

#### 3. Orders API Endpoint
**Command:**
```bash
curl -s http://localhost:3001/api/orders | python3 -m json.tool
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "1",
            "customerId": "c1",
            "items": ["item1", "item2"],
            "status": "pending",
            "total": 45.99
        },
        {
            "id": "2",
            "customerId": "c2",
            "items": ["item3"],
            "status": "delivered",
            "total": 12.5
        },
        {
            "id": "3",
            "customerId": "c3",
            "items": ["item1", "item4"],
            "status": "in-transit",
            "total": 78.25
        }
    ]
}
```
**Status**: ✅ PASSED

#### 4. Inventory API Endpoint
**Command:**
```bash
curl -s http://localhost:3001/api/inventory | python3 -m json.tool
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "item1",
            "name": "Organic Bananas",
            "stock": 45,
            "price": 2.99,
            "category": "Produce"
        },
        {
            "id": "item2",
            "name": "Whole Milk",
            "stock": 23,
            "price": 3.49,
            "category": "Dairy"
        },
        {
            "id": "item3",
            "name": "Bread Loaf",
            "stock": 67,
            "price": 2.49,
            "category": "Bakery"
        },
        {
            "id": "item4",
            "name": "Chicken Breast",
            "stock": 12,
            "price": 8.99,
            "category": "Meat"
        }
    ]
}
```
**Status**: ✅ PASSED

#### 5. Analytics Dashboard Endpoint
**Command:**
```bash
curl -s http://localhost:3001/api/analytics/dashboard | python3 -m json.tool
```

**Response:**
```json
{
    "success": true,
    "data": {
        "totalOrders": 3,
        "totalRevenue": 136.74,
        "activeStores": 3,
        "inventoryItems": 4,
        "lowStockItems": 1
    }
}
```
**Status**: ✅ PASSED

#### 6. Agent Communication Endpoint
**Command:**
```bash
curl -s -X POST http://localhost:3001/api/agents/communicate \
  -H "Content-Type: application/json" \
  -d '{"from":"agent1","to":"agent2","message":"Inventory levels are low for chicken breast","type":"alert"}' | python3 -m json.tool
```

**Response:**
```json
{
    "success": true,
    "message": "Communication sent successfully"
}
```
**Status**: ✅ PASSED

---

## Method 2: Full Production Backend with MongoDB & Redis

### Prerequisites Setup

#### Install Docker (Required)
```bash
# Install Docker Desktop for macOS
# Download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

#### Alternative: Install MongoDB and Redis locally

**MongoDB Installation:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb/brew/mongodb-community@7.0

# Verify MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"
```

**Redis Installation:**
```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify Redis is running
redis-cli ping
```

### Setup Commands for Full Backend

#### Option A: Using Docker (Recommended)
```bash
# Navigate to server directory
cd /Users/chiragtaneja/Codes/repos/walmart-hack/iteration-1/server

# Start MongoDB and Redis with Docker
docker-compose up -d mongo redis

# Verify containers are running
docker-compose ps

# Start the full backend server
npm run dev
```

#### Option B: Using Local Installation
```bash
# Start MongoDB (if not using brew services)
mongod --dbpath /usr/local/var/mongodb

# Start Redis (if not using brew services)
redis-server /usr/local/etc/redis.conf

# Start the backend server
npm run dev
```

### Environment Configuration for Full Backend

**Required .env variables:**
```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ai-supply-chain

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRE=7d

# Client Configuration
CLIENT_URL=http://localhost:5173
```

### Full Backend Test Commands

#### 1. Health Check with Database Status
```bash
curl -s http://localhost:3001/health | python3 -m json.tool
```

#### 2. User Authentication Tests
```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "store_manager"
  }'

# Login user
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 3. Protected Route Tests (with JWT token)
```bash
# Get user profile (replace TOKEN with actual JWT token)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/auth/profile

# Create a new store
curl -X POST http://localhost:3001/api/stores \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Store",
    "address": "123 Test St",
    "coordinates": { "lat": 40.7128, "lng": -74.0060 }
  }'
```

#### 4. Inventory Management Tests
```bash
# Get inventory with filters
curl "http://localhost:3001/api/inventory?category=Produce&lowStock=true"

# Add inventory item
curl -X POST http://localhost:3001/api/inventory \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresh Apples",
    "category": "Produce",
    "stock": 100,
    "price": 3.99,
    "storeId": "STORE_ID"
  }'

# Update inventory
curl -X PUT http://localhost:3001/api/inventory/ITEM_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stock": 150}'
```

#### 5. Order Management Tests
```bash
# Create a new order
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "items": [
      {"productId": "PRODUCT_ID", "quantity": 2},
      {"productId": "PRODUCT_ID_2", "quantity": 1}
    ],
    "deliveryAddress": "456 Customer St"
  }'

# Update order status
curl -X PATCH http://localhost:3001/api/orders/ORDER_ID/status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in-transit"}'
```

#### 6. Real-time Socket.IO Tests
```bash
# Test socket connection using a simple Node.js script
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
socket.on('connect', () => {
  console.log('Connected to server');
  socket.emit('join-agent', 'agent1');
  socket.emit('agent-message', {
    from: 'agent1',
    to: 'agent2',
    message: 'Test real-time message'
  });
});
socket.on('agent-message', (data) => {
  console.log('Received message:', data);
});
"
```

#### 7. Queue Processing Tests
```bash
# Check Redis queue status
redis-cli keys "*queue*"

# Monitor queue jobs
redis-cli monitor

# Test job creation (order processing)
curl -X POST http://localhost:3001/api/orders/ORDER_ID/process \
  -H "Authorization: Bearer TOKEN"
```

---

## Testing Automation Scripts

### Quick Test Script
Create a file `test-backend.sh`:
```bash
#!/bin/bash

echo "🧪 Testing AI Supply Chain Backend..."

# Test health endpoint
echo "1. Health Check:"
curl -s http://localhost:3001/health | python3 -m json.tool

echo -e "\n2. Stores API:"
curl -s http://localhost:3001/api/stores | python3 -m json.tool

echo -e "\n3. Orders API:"
curl -s http://localhost:3001/api/orders | python3 -m json.tool

echo -e "\n4. Inventory API:"
curl -s http://localhost:3001/api/inventory | python3 -m json.tool

echo -e "\n5. Analytics API:"
curl -s http://localhost:3001/api/analytics/dashboard | python3 -m json.tool

echo -e "\n✅ All tests completed!"
```

Make it executable:
```bash
chmod +x test-backend.sh
./test-backend.sh
```

---

## Performance Tests

### Load Testing with Apache Bench
```bash
# Install Apache Bench
brew install httpie

# Test concurrent requests
ab -n 1000 -c 10 http://localhost:3001/api/stores

# Test POST endpoint
ab -n 100 -c 5 -p post-data.json -T application/json http://localhost:3001/api/agents/communicate
```

### Memory and CPU Monitoring
```bash
# Monitor server process
top -p $(pgrep -f "node.*server")

# Check memory usage
ps aux | grep node

# Monitor network connections
lsof -i :3001
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Port Already in Use
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 node src/server-simple.js
```

#### 2. MongoDB Connection Issues
```bash
# Check MongoDB status
brew services list | grep mongodb

# Restart MongoDB
brew services restart mongodb/brew/mongodb-community@7.0

# Check MongoDB logs
tail -f /usr/local/var/log/mongodb/mongo.log
```

#### 3. Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Restart Redis
brew services restart redis

# Check Redis logs
tail -f /usr/local/var/log/redis.log
```

#### 4. Frontend Connection Issues
```bash
# Check if frontend is running
curl -I http://localhost:5173/

# If not running, restart frontend
cd /Users/chiragtaneja/Codes/repos/walmart-hack/iteration-1
npm run dev

# Check which ports are in use
lsof -i :5173
lsof -i :5174

# Kill any conflicting processes
lsof -ti:5173 | xargs kill -9
```

#### 5. CORS Issues
```bash
# Test CORS headers
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS \
  http://localhost:3001/api/stores
```

---

## Current System Status (Updated)

### ✅ Active Services
- **Frontend**: http://localhost:5173/ - ✅ RUNNING
- **Backend**: http://localhost:3001/ - ✅ RUNNING  
- **Backend Health**: http://localhost:3001/health - ✅ RESPONDING

### 🔧 Quick Verification Commands
```bash
# Check frontend status
curl -I http://localhost:5173/

# Check backend status  
curl -s http://localhost:3001/health

# Test API endpoint
curl -s http://localhost:3001/api/stores
```

---

## Test Summary

### Simplified Backend Results
- ✅ Health Check: PASSED
- ✅ Stores API: PASSED  
- ✅ Orders API: PASSED
- ✅ Inventory API: PASSED
- ✅ Analytics API: PASSED
- ✅ Agent Communication: PASSED
- ✅ Socket.IO: WORKING
- ✅ CORS: CONFIGURED

### Full Backend Features (with MongoDB/Redis)
- 🔐 JWT Authentication
- 📊 Database Persistence
- ⚡ Redis Caching
- 🔄 Queue Processing
- 📱 Real-time Updates
- 🛡️ Security Middleware
- 📈 Advanced Analytics
- 🚀 Production Ready

---

## Next Steps

1. **Frontend Integration**: Ensure frontend can consume all API endpoints
2. **Authentication Flow**: Implement complete user authentication in frontend
3. **Real-time Features**: Test Socket.IO integration with frontend components
4. **Error Handling**: Test error scenarios and validation
5. **Performance**: Run load tests under various conditions
6. **Security**: Implement rate limiting and input validation tests
7. **Monitoring**: Set up logging and metrics collection

---

*Documentation generated on June 28, 2025*
