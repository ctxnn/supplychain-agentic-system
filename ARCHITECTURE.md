# System Architecture

## Overview
The AI Supply Chain Command Center is built using a modern, scalable architecture that combines React frontend, Node.js backend, and AI agent orchestration using LangGraph.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React SPA]
        B[Agent Context]
        C[Supply Chain Context]
        D[Component Library]
    end
    
    subgraph "API Gateway"
        E[Express.js Server]
        F[WebSocket Server]
        G[Authentication Middleware]
        H[Rate Limiting]
    end
    
    subgraph "Agent Orchestration"
        I[Agent Orchestrator]
        J[Customer Agent]
        K[Inventory Agent]
        L[Route Agent]
        M[Store Manager Agent]
        N[Delivery Agent]
        O[Notification Agent]
    end
    
    subgraph "Business Logic"
        P[Order Service]
        Q[Inventory Service]
        R[Store Service]
        S[Analytics Service]
        T[Notification Service]
    end
    
    subgraph "Message Queue"
        U[Bull Queue]
        V[Order Processor]
        W[Inventory Processor]
        X[Notification Processor]
    end
    
    subgraph "Data Layer"
        Y[MongoDB]
        Z[Redis Cache]
        AA[File Storage]
    end
    
    subgraph "External Services"
        BB[Email Service]
        CC[SMS Service]
        DD[Maps API]
        EE[Payment Gateway]
    end
    
    A --> E
    A --> F
    B --> I
    E --> G
    E --> H
    F --> I
    I --> J
    I --> K
    I --> L
    I --> M
    I --> N
    I --> O
    E --> P
    E --> Q
    E --> R
    E --> S
    P --> U
    Q --> U
    S --> U
    U --> V
    U --> W
    U --> X
    V --> Y
    W --> Y
    X --> Y
    E --> Z
    T --> BB
    T --> CC
    L --> DD
    P --> EE
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: Context API with useReducer
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSockets**: Socket.IO
- **Authentication**: JWT with refresh tokens
- **Validation**: Joi + express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Winston

### Database
- **Primary Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Message Queue**: Bull (Redis-based)

### AI/ML
- **Agent Framework**: LangGraph
- **Natural Language Processing**: Custom NLP with pattern matching
- **State Management**: Zod schemas for type safety

### DevOps
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Process Management**: PM2
- **Monitoring**: Custom health checks

## Component Architecture

### Frontend Components

```
src/
├── components/
│   ├── Dashboard.tsx              # Main dashboard
│   ├── CustomerPortal.tsx         # Customer interface
│   ├── StoreManagerDashboard.tsx  # Store management
│   ├── DeliveryAgentApp.tsx       # Delivery interface
│   ├── InventoryAgent.tsx         # Inventory management
│   ├── RouteOptimization.tsx      # Route planning
│   └── AgentCommunication.tsx     # Agent messaging
├── context/
│   ├── SupplyChainContext.tsx     # Global state management
│   └── AgentContext.tsx           # Agent orchestration
├── agents/
│   ├── AgentOrchestrator.ts       # Main orchestrator
│   ├── BaseAgent.ts               # Abstract base class
│   ├── CustomerAgent.ts           # Customer service agent
│   ├── InventoryAgent.ts          # Inventory management
│   ├── RouteAgent.ts              # Route optimization
│   └── types.ts                   # Type definitions
└── App.tsx                        # Main application
```

### Backend Services

```
server/src/
├── routes/
│   ├── auth.js                    # Authentication endpoints
│   ├── orders.js                  # Order management
│   ├── inventory.js               # Inventory operations
│   ├── stores.js                  # Store management
│   ├── agents.js                  # Agent communication
│   └── analytics.js               # Analytics endpoints
├── models/
│   ├── User.js                    # User schema
│   ├── Order.js                   # Order schema
│   ├── Inventory.js               # Inventory schema
│   └── Store.js                   # Store schema
├── middleware/
│   ├── auth.js                    # Authentication middleware
│   ├── validation.js              # Input validation
│   └── errorHandler.js            # Error handling
├── workers/
│   ├── orderProcessor.js          # Order processing
│   ├── inventoryProcessor.js      # Inventory updates
│   └── notificationProcessor.js   # Notifications
├── config/
│   ├── database.js                # MongoDB configuration
│   ├── redis.js                   # Redis configuration
│   └── queues.js                  # Message queue setup
├── sockets/
│   └── socketHandlers.js          # WebSocket event handlers
└── server.js                      # Main server file
```

## Data Flow

### Order Processing Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant CA as Customer Agent
    participant IA as Inventory Agent
    participant OQ as Order Queue
    participant DB as Database
    participant NA as Notification Agent
    
    C->>CA: "I need 2 bananas"
    CA->>CA: Parse natural language
    CA->>IA: Check inventory availability
    IA->>DB: Query stock levels
    DB->>IA: Return availability
    IA->>CA: Confirm stock available
    CA->>OQ: Create order job
    OQ->>DB: Save order
    OQ->>NA: Send confirmation
    NA->>C: Order confirmation
```

### Real-time Updates Flow

```mermaid
sequenceDiagram
    participant DA as Delivery Agent
    participant WS as WebSocket Server
    participant C as Customer
    participant DB as Database
    
    DA->>WS: Location update
    WS->>DB: Store location
    WS->>C: Broadcast location
    C->>C: Update map display
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as Auth Service
    participant DB as Database
    participant R as Redis
    
    U->>A: Login credentials
    A->>DB: Validate user
    DB->>A: User data
    A->>A: Generate JWT tokens
    A->>R: Store refresh token
    A->>U: Access + Refresh tokens
    
    Note over U,R: Subsequent requests
    U->>A: API request + Access token
    A->>A: Validate JWT
    A->>U: API response
```

### Security Layers

1. **Network Security**
   - HTTPS/TLS encryption
   - CORS configuration
   - Rate limiting
   - Request size limits

2. **Authentication & Authorization**
   - JWT access tokens (15 min expiry)
   - Refresh tokens (7 day expiry)
   - Role-based access control
   - Session management

3. **Data Security**
   - Input validation & sanitization
   - XSS protection
   - CSRF protection
   - SQL injection prevention
   - Password hashing (bcrypt)

4. **API Security**
   - Request throttling
   - Security headers
   - API versioning
   - Error message sanitization

## Scalability Considerations

### Horizontal Scaling

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx Load Balancer]
    end
    
    subgraph "Application Tier"
        A1[App Instance 1]
        A2[App Instance 2]
        A3[App Instance 3]
    end
    
    subgraph "Database Tier"
        M1[MongoDB Primary]
        M2[MongoDB Secondary]
        M3[MongoDB Secondary]
    end
    
    subgraph "Cache Tier"
        R1[Redis Master]
        R2[Redis Slave]
    end
    
    LB --> A1
    LB --> A2
    LB --> A3
    
    A1 --> M1
    A2 --> M1
    A3 --> M1
    
    M1 --> M2
    M1 --> M3
    
    A1 --> R1
    A2 --> R1
    A3 --> R1
    
    R1 --> R2
```

### Performance Optimization

1. **Database Optimization**
   - Proper indexing strategy
   - Connection pooling
   - Query optimization
   - Data aggregation pipelines

2. **Caching Strategy**
   - Redis for session storage
   - Query result caching
   - Static asset caching
   - CDN integration

3. **Application Optimization**
   - Lazy loading
   - Code splitting
   - Bundle optimization
   - Image optimization

## Monitoring & Observability

### Health Monitoring

```mermaid
graph TB
    subgraph "Application Monitoring"
        A[Health Check Endpoints]
        B[Performance Metrics]
        C[Error Tracking]
    end
    
    subgraph "Infrastructure Monitoring"
        D[Server Metrics]
        E[Database Metrics]
        F[Cache Metrics]
    end
    
    subgraph "Business Monitoring"
        G[Order Metrics]
        H[Agent Performance]
        I[User Analytics]
    end
    
    A --> J[Monitoring Dashboard]
    B --> J
    C --> J
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
```

### Logging Strategy

1. **Application Logs**
   - Request/response logging
   - Error logging with stack traces
   - Performance metrics
   - Security events

2. **Business Logs**
   - Order lifecycle events
   - Inventory changes
   - Agent communications
   - User actions

3. **System Logs**
   - Database operations
   - Cache operations
   - Queue processing
   - WebSocket connections

## Deployment Architecture

### Development Environment

```mermaid
graph TB
    subgraph "Developer Machine"
        A[React Dev Server :5173]
        B[Node.js Server :3001]
        C[Docker Compose]
    end
    
    subgraph "Docker Services"
        D[MongoDB :27017]
        E[Redis :6379]
    end
    
    A --> B
    B --> D
    B --> E
    C --> D
    C --> E
```

### Production Environment

```mermaid
graph TB
    subgraph "CDN"
        A[Static Assets]
    end
    
    subgraph "Load Balancer"
        B[Nginx]
    end
    
    subgraph "Application Servers"
        C[App Server 1]
        D[App Server 2]
        E[App Server 3]
    end
    
    subgraph "Database Cluster"
        F[MongoDB Primary]
        G[MongoDB Secondary]
        H[MongoDB Arbiter]
    end
    
    subgraph "Cache Cluster"
        I[Redis Master]
        J[Redis Slave]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    
    C --> F
    D --> F
    E --> F
    
    F --> G
    F --> H
    
    C --> I
    D --> I
    E --> I
    
    I --> J
```

## Agent System Architecture

### Agent Communication Pattern

```mermaid
graph TB
    subgraph "Agent Orchestrator"
        AO[Message Router]
        MH[Message History]
        HS[Health Status]
    end
    
    subgraph "Agents"
        CA[Customer Agent]
        IA[Inventory Agent]
        RA[Route Agent]
        SMA[Store Manager Agent]
        DA[Delivery Agent]
        NA[Notification Agent]
    end
    
    subgraph "Message Queue"
        OQ[Order Queue]
        IQ[Inventory Queue]
        NQ[Notification Queue]
    end
    
    AO --> CA
    AO --> IA
    AO --> RA
    AO --> SMA
    AO --> DA
    AO --> NA
    
    CA --> OQ
    IA --> IQ
    NA --> NQ
    
    OQ --> AO
    IQ --> AO
    NQ --> AO
```

### State Management

Each agent maintains its own state using Zod schemas for type safety:

```typescript
// Agent State Schema Example
const CustomerAgentStateSchema = z.object({
  currentOrder: OrderSchema.optional(),
  customerPreferences: z.record(z.any()).default({}),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.date()
  })).default([])
});
```

This architecture ensures scalability, maintainability, and robust performance for the AI Supply Chain Command Center.