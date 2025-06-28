# API Documentation

## Base URL
- **Development**: `http://localhost:3001`
- **Production**: `https://your-api-domain.com`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Token Management
- **Access Token**: Valid for 15 minutes
- **Refresh Token**: Valid for 7 days
- **Token Refresh**: Use `/api/auth/refresh` endpoint

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer",
  "storeId": "store-id" // Optional, required for store_manager/delivery_agent
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Refresh Token
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

### Logout User
```http
POST /api/auth/logout
```
*Requires Authentication*

### Get Current User
```http
GET /api/auth/me
```
*Requires Authentication*

## Order Management

### Get Orders
```http
GET /api/orders?page=1&limit=10&status=pending&storeId=store-id
```
*Requires Authentication*

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by order status
- `storeId` (optional): Filter by store ID

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-id",
        "orderId": "ORD-12345",
        "customerId": "customer-id",
        "storeId": "store-id",
        "items": [
          {
            "sku": "SKU-001",
            "name": "Product Name",
            "quantity": 2,
            "price": 19.99
          }
        ],
        "status": "pending",
        "totalAmount": 39.98,
        "createdAt": "2024-01-01T00:00:00Z",
        "estimatedDelivery": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50
    }
  }
}
```

### Get Single Order
```http
GET /api/orders/:id
```
*Requires Authentication*

### Create Order
```http
POST /api/orders
```
*Requires Authentication*

**Request Body:**
```json
{
  "storeId": "store-id",
  "items": [
    {
      "sku": "SKU-001",
      "quantity": 2
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Nashville",
    "state": "TN",
    "zipCode": "37201",
    "country": "US"
  },
  "paymentMethod": "credit_card",
  "notes": "Leave at door"
}
```

### Update Order Status
```http
PUT /api/orders/:id/status
```
*Requires Authentication (Store Manager, Delivery Agent, Admin)*

**Request Body:**
```json
{
  "status": "shipped",
  "notes": "Package dispatched",
  "location": {
    "lat": 36.1627,
    "lng": -86.7816
  }
}
```

### Assign Delivery Agent
```http
PUT /api/orders/:id/assign-driver
```
*Requires Authentication (Store Manager, Admin)*

**Request Body:**
```json
{
  "deliveryAgentId": "agent-id"
}
```

## Inventory Management

### Get Inventory
```http
GET /api/inventory?page=1&limit=20&storeId=store-id&category=electronics&search=headphones&lowStock=true
```
*Requires Authentication*

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `storeId` (optional): Filter by store
- `category` (optional): Filter by category
- `search` (optional): Search by name or SKU
- `lowStock` (optional): Show only low stock items

### Get Single Inventory Item
```http
GET /api/inventory/:id
```
*Requires Authentication*

### Create Inventory Item
```http
POST /api/inventory
```
*Requires Authentication (Store Manager, Admin)*

**Request Body:**
```json
{
  "sku": "SKU-001",
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones",
  "category": "Electronics",
  "storeId": "store-id",
  "quantity": 50,
  "price": 129.99,
  "cost": 80.00,
  "reorderPoint": 10,
  "maxStock": 100
}
```

### Update Stock Quantity
```http
PUT /api/inventory/:id/stock
```
*Requires Authentication (Store Manager, Admin)*

**Request Body:**
```json
{
  "action": "restock",
  "quantity": 25,
  "reason": "Weekly restock"
}
```

**Actions:**
- `restock`: Add inventory
- `sale`: Remove inventory (sale)
- `adjustment`: Set exact quantity
- `return`: Add returned items
- `damage`: Remove damaged items

### Reserve Stock
```http
POST /api/inventory/:id/reserve
```
*Requires Authentication*

**Request Body:**
```json
{
  "quantity": 2
}
```

### Release Reserved Stock
```http
POST /api/inventory/:id/release
```
*Requires Authentication*

**Request Body:**
```json
{
  "quantity": 2
}
```

## Store Management

### Get Stores
```http
GET /api/stores?page=1&limit=10&status=active&search=nashville
```
*Requires Authentication*

### Get Single Store
```http
GET /api/stores/:id
```
*Requires Authentication*

### Create Store
```http
POST /api/stores
```
*Requires Authentication (Admin)*

**Request Body:**
```json
{
  "storeId": "STORE-001",
  "name": "Walmart Supercenter - Nashville",
  "address": {
    "street": "100 Oaks Blvd",
    "city": "Nashville",
    "state": "TN",
    "zipCode": "37201",
    "country": "US"
  },
  "location": {
    "type": "Point",
    "coordinates": [-86.7816, 36.1627]
  },
  "managerId": "manager-id",
  "operatingHours": {
    "monday": { "open": "06:00", "close": "23:00" },
    "tuesday": { "open": "06:00", "close": "23:00" }
  },
  "contactInfo": {
    "phone": "+1-615-555-0123",
    "email": "store@example.com"
  }
}
```

### Find Nearby Stores
```http
GET /api/stores/nearby?lat=36.1627&lng=-86.7816&radius=25
```

**Query Parameters:**
- `lat`: Latitude
- `lng`: Longitude
- `radius`: Search radius in kilometers (default: 25)

## Agent Communication

### Get Agent Health
```http
GET /api/agents/health
```
*Requires Authentication (Admin, Store Manager)*

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": {
      "customer-agent": {
        "status": "healthy",
        "lastCheck": "2024-01-01T00:00:00Z",
        "messagesProcessed": 150
      }
    },
    "queues": {
      "orderQueue": {
        "waiting": 5,
        "active": 2,
        "completed": 100,
        "failed": 1
      }
    }
  }
}
```

### Send Message to Agent
```http
POST /api/agents/message
```
*Requires Authentication*

**Request Body:**
```json
{
  "to": "inventory-agent",
  "type": "inventory",
  "content": "Check stock levels for SKU-001",
  "data": {
    "sku": "SKU-001",
    "storeId": "store-id"
  }
}
```

### Customer Chat
```http
POST /api/agents/customer/chat
```
*Requires Authentication*

**Request Body:**
```json
{
  "message": "I need 2 bananas and some yogurt"
}
```

### Check Inventory Availability
```http
POST /api/agents/inventory/check
```
*Requires Authentication*

**Request Body:**
```json
{
  "storeId": "store-id",
  "items": [
    {
      "sku": "SKU-001",
      "quantity": 2
    }
  ]
}
```

### Request Route Optimization
```http
POST /api/agents/route/optimize
```
*Requires Authentication (Delivery Agent, Store Manager, Admin)*

**Request Body:**
```json
{
  "orderId": "order-id",
  "optimizationMode": "time"
}
```

**Optimization Modes:**
- `time`: Fastest route
- `fuel`: Most fuel-efficient
- `distance`: Shortest distance

## Analytics

### Dashboard Analytics
```http
GET /api/analytics/dashboard?storeId=store-id&period=7d
```
*Requires Authentication (Admin, Store Manager)*

**Query Parameters:**
- `storeId` (optional): Filter by store
- `period`: Time period (24h, 7d, 30d, 90d)

### Inventory Analytics
```http
GET /api/analytics/inventory?storeId=store-id
```
*Requires Authentication (Admin, Store Manager)*

### Delivery Analytics
```http
GET /api/analytics/delivery?storeId=store-id&period=7d
```
*Requires Authentication (Admin, Store Manager, Delivery Agent)*

### Real-time Analytics
```http
GET /api/analytics/real-time?storeId=store-id
```
*Requires Authentication (Admin, Store Manager)*

## WebSocket Events

### Connection
```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'jwt-access-token'
  }
});
```

### Client Events
```javascript
// Subscribe to order tracking
socket.emit('subscribe_order_tracking', orderId);

// Location update (delivery agents)
socket.emit('location_update', {
  orderId: 'order-id',
  location: { lat: 36.1627, lng: -86.7816 }
});

// Agent message
socket.emit('agent_message', {
  to: 'inventory-agent',
  message: 'Check stock levels',
  type: 'inventory'
});
```

### Server Events
```javascript
// Connection confirmation
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// Order updates
socket.on('order_status_update', (update) => {
  console.log('Order updated:', update);
});

// Delivery tracking
socket.on('delivery_location_update', (location) => {
  console.log('Delivery location:', location);
});

// Inventory alerts
socket.on('inventory_alert', (alert) => {
  console.log('Inventory alert:', alert);
});
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **WebSocket**: No rate limiting

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response Format:**
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "current": 1,
      "pages": 10,
      "total": 100
    }
  }
}
```

## Data Validation

### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character

### Email Format
- Valid email format required
- Case-insensitive
- Unique across the system

### SKU Format
- Alphanumeric characters only
- Maximum 20 characters
- Unique within each store