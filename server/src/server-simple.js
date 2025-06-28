import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Mock data for testing
const mockData = {
  stores: [
    { id: '1', name: 'Walmart Supercenter - Downtown', address: '123 Main St', inventory: 150 },
    { id: '2', name: 'Walmart Neighborhood Market', address: '456 Oak Ave', inventory: 89 },
    { id: '3', name: 'Walmart Supercenter - North', address: '789 Pine Rd', inventory: 203 }
  ],
  orders: [
    { id: '1', customerId: 'c1', items: ['item1', 'item2'], status: 'pending', total: 45.99 },
    { id: '2', customerId: 'c2', items: ['item3'], status: 'delivered', total: 12.50 },
    { id: '3', customerId: 'c3', items: ['item1', 'item4'], status: 'in-transit', total: 78.25 }
  ],
  inventory: [
    { id: 'item1', name: 'Organic Bananas', stock: 45, price: 2.99, category: 'Produce' },
    { id: 'item2', name: 'Whole Milk', stock: 23, price: 3.49, category: 'Dairy' },
    { id: 'item3', name: 'Bread Loaf', stock: 67, price: 2.49, category: 'Bakery' },
    { id: 'item4', name: 'Chicken Breast', stock: 12, price: 8.99, category: 'Meat' }
  ],
  agents: [
    { id: 'agent1', name: 'Customer Service Agent', status: 'active', type: 'customer' },
    { id: 'agent2', name: 'Inventory Manager', status: 'active', type: 'inventory' },
    { id: 'agent3', name: 'Route Optimizer', status: 'active', type: 'routing' }
  ]
};

// API Routes
app.get('/api/stores', (req, res) => {
  res.json({ success: true, data: mockData.stores });
});

app.get('/api/orders', (req, res) => {
  res.json({ success: true, data: mockData.orders });
});

app.get('/api/inventory', (req, res) => {
  res.json({ success: true, data: mockData.inventory });
});

app.get('/api/agents', (req, res) => {
  res.json({ success: true, data: mockData.agents });
});

app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalOrders: mockData.orders.length,
      totalRevenue: mockData.orders.reduce((sum, order) => sum + order.total, 0),
      activeStores: mockData.stores.length,
      inventoryItems: mockData.inventory.length,
      lowStockItems: mockData.inventory.filter(item => item.stock < 20).length
    }
  });
});

// Agent communication endpoints
app.post('/api/agents/communicate', (req, res) => {
  const { from, to, message, type } = req.body;
  
  // Emit real-time communication to connected clients
  io.emit('agent-communication', {
    id: Date.now().toString(),
    from,
    to,
    message,
    type,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true, message: 'Communication sent successfully' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join agent rooms for targeted communication
  socket.on('join-agent', (agentId) => {
    socket.join(`agent-${agentId}`);
    console.log(`Agent ${agentId} joined`);
  });
  
  // Handle agent messages
  socket.on('agent-message', (data) => {
    socket.to(`agent-${data.to}`).emit('agent-message', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle inventory updates
  socket.on('inventory-update', (data) => {
    io.emit('inventory-update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
