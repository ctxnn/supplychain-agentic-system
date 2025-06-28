# AI Supply Chain Backend

A production-ready backend system for the AI Supply Chain Command Center, built with Node.js, Express, Socket.IO, and MongoDB.

## Features

### Core Functionality
- **RESTful API** with comprehensive CRUD operations
- **Real-time WebSocket communication** for live updates
- **Multi-agent system** with message queuing
- **User authentication & authorization** with JWT
- **Role-based access control** (Admin, Store Manager, Delivery Agent, Customer)

### Security
- **JWT token authentication** with refresh tokens
- **Password hashing** with bcrypt
- **Input validation** and sanitization
- **Rate limiting** and request throttling
- **CORS protection**
- **XSS and CSRF protection**
- **SSL/TLS encryption** ready

### Performance & Scalability
- **Redis caching** for session management
- **Message queues** with Bull for async processing
- **Database indexing** for optimized queries
- **Connection pooling**
- **Horizontal scaling** support
- **Load balancing** configuration

### Monitoring & Logging
- **Comprehensive logging** with Winston
- **Health check endpoints**
- **Performance monitoring**
- **Error tracking**
- **Real-time analytics**

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **WebSockets**: Socket.IO
- **Message Queue**: Bull (Redis-based)
- **Authentication**: JWT
- **Validation**: Joi + express-validator
- **Logging**: Winston
- **Testing**: Jest + Supertest

## Quick Start

### Prerequisites
- Node.js 18 or higher
- MongoDB 6.0+
- Redis 7+

### Installation

1. **Clone and setup**
   ```bash
   cd server
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Services**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

### Docker Deployment

1. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Individual Container**
   ```bash
   docker build -t ai-supply-chain-backend .
   docker run -p 3001:3001 ai-supply-chain-backend
   ```

## API Documentation

### Authentication Endpoints
```
POST /api/auth/register     # Register new user
POST /api/auth/login        # User login
POST /api/auth/refresh      # Refresh access token
POST /api/auth/logout       # User logout
GET  /api/auth/me          # Get current user
PUT  /api/auth/profile     # Update user profile
PUT  /api/auth/password    # Change password
```

### Order Management
```
GET    /api/orders              # Get orders (filtered by role)
GET    /api/orders/:id          # Get single order
POST   /api/orders              # Create new order
PUT    /api/orders/:id/status   # Update order status
PUT    /api/orders/:id/assign-driver  # Assign delivery agent
GET    /api/orders/analytics/summary   # Order analytics
```

### Inventory Management
```
GET    /api/inventory           # Get inventory items
GET    /api/inventory/:id       # Get single item
POST   /api/inventory           # Create inventory item
PUT    /api/inventory/:id       # Update inventory item
PUT    /api/inventory/:id/stock # Update stock quantity
POST   /api/inventory/:id/reserve    # Reserve stock
POST   /api/inventory/:id/release    # Release reserved stock
GET    /api/inventory/analytics/summary  # Inventory analytics
POST   /api/inventory/bulk-update    # Bulk inventory update
```

### Store Management
```
GET    /api/stores              # Get all stores
GET    /api/stores/:id          # Get single store
POST   /api/stores              # Create new store
PUT    /api/stores/:id          # Update store
GET    /api/stores/:id/analytics # Store analytics
GET    /api/stores/nearby       # Find nearby stores
PUT    /api/stores/:id/status   # Update store status
```

### Agent Communication
```
GET    /api/agents/health       # Get agent health status
POST   /api/agents/message      # Send message to agent
POST   /api/agents/customer/chat    # Customer chat
POST   /api/agents/inventory/check  # Check inventory
POST   /api/agents/route/optimize   # Request route optimization
GET    /api/agents/analytics    # Agent performance analytics
```

### Analytics
```
GET    /api/analytics/dashboard     # Dashboard analytics
GET    /api/analytics/inventory     # Inventory analytics
GET    /api/analytics/delivery      # Delivery analytics
GET    /api/analytics/real-time     # Real-time metrics
```

## WebSocket Events

### Client to Server
```javascript
// Authentication
socket.emit('authenticate', { token: 'jwt-token' });

// Order tracking
socket.emit('subscribe_order_tracking', orderId);
socket.emit('unsubscribe_order_tracking', orderId);

// Location updates (delivery agents)
socket.emit('location_update', { orderId, location: { lat, lng } });

// Agent communication
socket.emit('agent_message', { to: 'agent-type', message: 'content', type: 'order' });

// Inventory alerts
socket.emit('subscribe_inventory_alerts', storeId);

// Analytics subscription
socket.emit('subscribe_analytics', storeId);
```

### Server to Client
```javascript
// Connection confirmation
socket.on('connected', (data) => { /* user info */ });

// Notifications
socket.on('notification', (notification) => { /* handle notification */ });

// Order updates
socket.on('order_status_update', (update) => { /* handle order update */ });
socket.on('new_order', (order) => { /* handle new order */ });

// Delivery tracking
socket.on('delivery_location_update', (location) => { /* update map */ });
socket.on('tracking_started', (data) => { /* start tracking */ });

// Inventory alerts
socket.on('inventory_alert', (alert) => { /* handle low stock */ });
socket.on('inventory_updated', (update) => { /* update inventory */ });

// Agent communication
socket.on('agent_message_received', (message) => { /* handle agent message */ });

// Analytics updates
socket.on('analytics_update', (data) => { /* update dashboard */ });
```

## Database Schema

### User Model
```javascript
{
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: ['admin', 'store_manager', 'delivery_agent', 'customer', 'agent'],
  storeId: ObjectId (ref: Store),
  isActive: Boolean,
  lastLogin: Date,
  refreshTokens: [{ token: String, createdAt: Date }],
  preferences: {
    notifications: { email: Boolean, push: Boolean, sms: Boolean },
    theme: ['light', 'dark', 'auto']
  }
}
```

### Order Model
```javascript
{
  orderId: String (unique),
  customerId: ObjectId (ref: User),
  storeId: ObjectId (ref: Store),
  items: [{ sku: String, name: String, quantity: Number, price: Number, category: String }],
  status: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
  totalAmount: Number,
  deliveryAddress: { street, city, state, zipCode, country, coordinates },
  estimatedDelivery: Date,
  actualDelivery: Date,
  deliveryAgentId: ObjectId (ref: User),
  route: { waypoints, distance, estimatedTime, optimizationMode },
  tracking: { currentLocation, statusHistory },
  payment: { method, status, transactionId, amount },
  notes: { customer: String, internal: String }
}
```

### Inventory Model
```javascript
{
  sku: String,
  name: String,
  description: String,
  category: String,
  storeId: ObjectId (ref: Store),
  quantity: Number,
  reserved: Number,
  price: Number,
  cost: Number,
  reorderPoint: Number,
  maxStock: Number,
  supplier: { name, contactInfo, leadTime },
  dimensions: { length, width, height, weight, unit },
  location: { aisle, shelf, bin },
  barcodes: [String],
  images: [String],
  isActive: Boolean,
  lastRestocked: Date,
  expirationDate: Date,
  stockHistory: [{ action, quantity, previousQuantity, reason, userId, timestamp }]
}
```

### Store Model
```javascript
{
  storeId: String (unique),
  name: String,
  address: { street, city, state, zipCode, country },
  location: { type: 'Point', coordinates: [longitude, latitude] },
  managerId: ObjectId (ref: User),
  status: ['active', 'maintenance', 'closed', 'temporarily_closed'],
  operatingHours: { monday: { open, close }, ... },
  contactInfo: { phone, email, fax },
  capacity: { maxOrders, maxDeliveryRadius, staffCount },
  services: ['pickup', 'delivery', 'curbside', 'express'],
  deliveryZones: [{ name, zipCodes, deliveryFee, minimumOrder }],
  metrics: { totalOrders, totalRevenue, averageOrderValue, customerSatisfaction, deliveryTime },
  isActive: Boolean
}
```

## Message Queue Jobs

### Order Processing
- `new_order` - Process new order creation
- `status_update` - Handle order status changes
- `payment_confirmation` - Process payment confirmations
- `route_optimization` - Calculate optimal delivery routes

### Inventory Processing
- `low_stock_check` - Monitor inventory levels
- `auto_restock` - Trigger automatic restocking
- `stock_update` - Process stock quantity changes
- `inventory_sync` - Bulk inventory synchronization

### Notification Processing
- `order_notification` - Send order-related notifications
- `inventory_alert` - Send inventory alerts
- `delivery_update` - Send delivery status updates
- `system_alert` - Send system-wide alerts
- `bulk_notification` - Send bulk notifications

## Security Best Practices

### Authentication & Authorization
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Role-based access control (RBAC)
- Password complexity requirements
- Account lockout after failed attempts

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Data encryption at rest and in transit

### API Security
- Rate limiting (100 requests per 15 minutes)
- Request size limits
- CORS configuration
- Security headers (HSTS, CSP, etc.)
- API versioning

## Performance Optimization

### Database
- Proper indexing on frequently queried fields
- Connection pooling
- Query optimization
- Data aggregation pipelines

### Caching
- Redis for session storage
- Query result caching
- Static asset caching
- CDN integration ready

### Monitoring
- Application performance monitoring
- Database query monitoring
- Error tracking and alerting
- Resource usage monitoring

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## Deployment

### Environment Variables
See `.env.example` for all required environment variables.

### Production Checklist
- [ ] Set strong JWT secrets
- [ ] Configure SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up CI/CD pipeline
- [ ] Configure load balancer
- [ ] Set up database replication
- [ ] Configure Redis clustering

### Scaling Considerations
- Horizontal scaling with multiple instances
- Database sharding strategies
- Redis clustering for high availability
- CDN for static assets
- Load balancing configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.