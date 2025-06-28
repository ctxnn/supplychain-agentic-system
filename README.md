# AI Supply Chain Command Center

## Overview
A comprehensive multi-agent AI system for supply chain management featuring real-time inventory tracking, route optimization, and intelligent order processing. The system uses LangGraph for agent orchestration and provides both frontend interfaces and backend APIs for complete supply chain visibility.

```mermaid
graph TD
    A[Frontend React App] --> B[Agent Orchestrator]
    B --> C[Customer Agent]
    B --> D[Inventory Agent]
    B --> E[Route Agent]
    B --> F[Store Manager Agent]
    B --> G[Delivery Agent]
    B --> H[Notification Agent]
    
    I[Backend API Server] --> J[MongoDB Database]
    I --> K[Redis Cache]
    I --> L[Message Queues]
    
    A --> I
    B --> I
    
    M[WebSocket Server] --> A
    M --> I
    
    N[Docker Services] --> J
    N --> K
    N --> O[Nginx Load Balancer]
```

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Development Setup](#development-setup)
4. [Running Locally](#running-locally)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [API Documentation](#api-documentation)
8. [Agent System](#agent-system)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **Docker**: v20.10.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **Git**: Latest version
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 10GB free space

### Required Accounts
- MongoDB Atlas (optional for cloud deployment)
- Redis Cloud (optional for cloud deployment)
- Netlify account (for frontend deployment)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-supply-chain-command-center
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd server
npm install
cd ..
```

## Development Setup

### 1. Environment Configuration

#### Backend Environment (.env)
```bash
cd server
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ai-supply-chain

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRE=7d

# Client Configuration
CLIENT_URL=http://localhost:5173
```

### 2. Database Setup

#### Using Docker (Recommended)
```bash
cd server
docker-compose up -d mongo redis
```

#### Manual Setup (Alternative)
- Install MongoDB locally
- Install Redis locally
- Ensure both services are running

### 3. Initialize Database
```bash
cd server
npm run dev
```
The server will automatically create necessary collections and indexes.

## Running Locally

### 1. Start Backend Services
```bash
cd server
docker-compose up -d
npm run dev
```

### 2. Start Frontend Development Server
```bash
# In the root directory
npm run dev
```

### 3. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Available Interfaces
- **Main Dashboard**: http://localhost:5173/
- **Customer Portal**: http://localhost:5173/customer
- **Store Manager**: http://localhost:5173/store-manager
- **Delivery Agent**: http://localhost:5173/delivery
- **Inventory Management**: http://localhost:5173/inventory
- **Route Optimization**: http://localhost:5173/routing
- **Agent Communications**: http://localhost:5173/communications

## Testing

### Backend Testing
```bash
cd server
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
```

### Frontend Testing
```bash
npm run test               # Run frontend tests
npm run test:e2e          # Run end-to-end tests
```

### Integration Testing
```bash
cd server
npm run test:integration  # Test API endpoints
```

## Deployment

### Production Build

#### Frontend
```bash
npm run build
```

#### Backend
```bash
cd server
npm run build
```

### Docker Deployment
```bash
cd server
docker-compose up -d
```

### Cloud Deployment

#### Frontend (Netlify)
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy

#### Backend (AWS/DigitalOcean)
```bash
# Build Docker image
docker build -t ai-supply-chain-backend .

# Deploy to your cloud provider
docker run -p 3001:3001 ai-supply-chain-backend
```

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-supply-chain
REDIS_URL=redis://your-redis-instance:6379
JWT_SECRET=your-production-jwt-secret
CLIENT_URL=https://your-frontend-domain.com
```

## API Documentation

### Authentication Endpoints
```
POST /api/auth/register     # Register new user
POST /api/auth/login        # User login
POST /api/auth/refresh      # Refresh access token
POST /api/auth/logout       # User logout
GET  /api/auth/me          # Get current user
```

### Order Management
```
GET    /api/orders              # Get orders
GET    /api/orders/:id          # Get single order
POST   /api/orders              # Create new order
PUT    /api/orders/:id/status   # Update order status
```

### Inventory Management
```
GET    /api/inventory           # Get inventory items
POST   /api/inventory           # Create inventory item
PUT    /api/inventory/:id       # Update inventory item
PUT    /api/inventory/:id/stock # Update stock quantity
```

### Store Management
```
GET    /api/stores              # Get all stores
GET    /api/stores/:id          # Get single store
POST   /api/stores              # Create new store
PUT    /api/stores/:id          # Update store
```

### Agent Communication
```
GET    /api/agents/health       # Get agent health status
POST   /api/agents/message      # Send message to agent
POST   /api/agents/customer/chat    # Customer chat
```

### Analytics
```
GET    /api/analytics/dashboard     # Dashboard analytics
GET    /api/analytics/inventory     # Inventory analytics
GET    /api/analytics/delivery      # Delivery analytics
```

## Agent System

### Agent Architecture
The system uses a multi-agent architecture with the following agents:

1. **Customer Agent**: Handles natural language order processing
2. **Inventory Agent**: Manages stock levels and automated restocking
3. **Route Agent**: Optimizes delivery routes using AI algorithms
4. **Store Manager Agent**: Coordinates store operations
5. **Delivery Agent**: Manages delivery tracking and updates
6. **Notification Agent**: Handles all system notifications

### Agent Communication
Agents communicate through:
- **Message Queues**: Asynchronous processing with Bull/Redis
- **WebSocket Events**: Real-time updates
- **REST API**: Standard CRUD operations

### LangGraph Integration
The system uses LangGraph for:
- Agent workflow orchestration
- State management between agents
- Complex decision-making processes
- Natural language processing

## Monitoring

### Health Checks
```bash
curl http://localhost:3001/health
```

### Performance Metrics
- **Response Time**: Average API response time
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Agent Performance**: Message processing rates

### Logging
Logs are stored in:
- `server/logs/combined.log`: All application logs
- `server/logs/error.log`: Error logs only

### Real-time Monitoring
- WebSocket connection status
- Agent health status
- Queue processing metrics
- Database connection status

## Troubleshooting

### Common Issues

#### MongoDB Connection Error
```bash
# Error: connect ECONNREFUSED 127.0.0.1:27017
cd server
docker-compose up -d mongo
```

#### Redis Connection Error
```bash
# Error: Redis connection failed
cd server
docker-compose up -d redis
```

#### Port Already in Use
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Kill process using port 5173
lsof -ti:5173 | xargs kill -9
```

#### Agent Not Responding
1. Check agent health status: `GET /api/agents/health`
2. Restart message queues: `docker-compose restart redis`
3. Check logs for errors

### Debug Procedures

#### Enable Debug Logging
```env
LOG_LEVEL=debug
NODE_ENV=development
```

#### Database Debug
```bash
# Connect to MongoDB
docker exec -it server_mongo_1 mongosh ai-supply-chain

# Check collections
show collections
db.orders.find().limit(5)
```

#### Redis Debug
```bash
# Connect to Redis
docker exec -it server_redis_1 redis-cli

# Check keys
KEYS *
```

### Performance Optimization

#### Database Indexing
```javascript
// Ensure proper indexes are created
db.orders.createIndex({ "customerId": 1, "createdAt": -1 })
db.inventory.createIndex({ "storeId": 1, "sku": 1 })
```

#### Caching Strategy
- Session data: Redis with 15-minute TTL
- Inventory data: Redis with 5-minute TTL
- Route calculations: Redis with 30-minute TTL

## Contributing

### Coding Standards
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Use Prettier for code formatting
- **TypeScript**: Use TypeScript for type safety
- **Testing**: Write tests for all new features

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Review Guidelines
- Code must pass all tests
- Must include appropriate documentation
- Follow established patterns and conventions
- Security considerations must be addressed

## Security

### Authentication
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Role-based access control (RBAC)

### Data Protection
- Input validation and sanitization
- XSS protection
- CSRF protection
- Rate limiting
- Secure password hashing with bcrypt

### API Security
- HTTPS enforcement in production
- CORS configuration
- Request size limits
- Security headers

## License
MIT License - see LICENSE file for details

## Support
For technical support or questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Last Updated**: December 2024
**Version**: 1.0.0