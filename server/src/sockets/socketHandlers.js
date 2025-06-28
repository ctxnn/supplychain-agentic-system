import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

const connectedUsers = new Map();

const setupSocketHandlers = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.email} (${socket.id})`);
    
    // Store user connection
    connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date()
    });

    // Join user to their role-based room
    socket.join(socket.user.role);
    
    // Join store-specific room if applicable
    if (socket.user.storeId) {
      socket.join(`store_${socket.user.storeId}`);
    }

    // Handle order tracking subscription
    socket.on('subscribe_order_tracking', (orderId) => {
      socket.join(`order_${orderId}`);
      logger.info(`User ${socket.user.email} subscribed to order tracking: ${orderId}`);
    });

    // Handle unsubscribe from order tracking
    socket.on('unsubscribe_order_tracking', (orderId) => {
      socket.leave(`order_${orderId}`);
      logger.info(`User ${socket.user.email} unsubscribed from order tracking: ${orderId}`);
    });

    // Handle location updates from delivery agents
    socket.on('location_update', (data) => {
      if (socket.user.role === 'delivery_agent') {
        const { orderId, location } = data;
        
        // Broadcast location update to order subscribers
        socket.to(`order_${orderId}`).emit('delivery_location_update', {
          orderId,
          location,
          timestamp: new Date(),
          deliveryAgent: {
            id: socket.user._id,
            name: socket.user.fullName
          }
        });

        logger.info(`Location update for order ${orderId} from ${socket.user.email}`);
      }
    });

    // Handle inventory alerts subscription
    socket.on('subscribe_inventory_alerts', (storeId) => {
      if (socket.user.role === 'store_manager' || socket.user.role === 'admin') {
        socket.join(`inventory_alerts_${storeId}`);
        logger.info(`User ${socket.user.email} subscribed to inventory alerts for store: ${storeId}`);
      }
    });

    // Handle agent communication
    socket.on('agent_message', (data) => {
      const { to, message, type } = data;
      
      // Broadcast to specific agent type or all agents
      if (to === 'all') {
        socket.broadcast.emit('agent_message_received', {
          from: socket.user.role,
          message,
          type,
          timestamp: new Date(),
          sender: {
            id: socket.user._id,
            name: socket.user.fullName,
            role: socket.user.role
          }
        });
      } else {
        socket.to(to).emit('agent_message_received', {
          from: socket.user.role,
          message,
          type,
          timestamp: new Date(),
          sender: {
            id: socket.user._id,
            name: socket.user.fullName,
            role: socket.user.role
          }
        });
      }

      logger.info(`Agent message from ${socket.user.email} to ${to}: ${message}`);
    });

    // Handle real-time analytics subscription
    socket.on('subscribe_analytics', (storeId) => {
      if (socket.user.role === 'store_manager' || socket.user.role === 'admin') {
        socket.join(`analytics_${storeId || 'global'}`);
        logger.info(`User ${socket.user.email} subscribed to analytics: ${storeId || 'global'}`);
      }
    });

    // Handle typing indicators for customer support
    socket.on('typing_start', (data) => {
      socket.to(`support_${data.conversationId}`).emit('user_typing', {
        userId: socket.user._id,
        userName: socket.user.fullName
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`support_${data.conversationId}`).emit('user_stopped_typing', {
        userId: socket.user._id
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.email} (${socket.id})`);
      connectedUsers.delete(socket.user._id.toString());
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to AI Supply Chain Command Center',
      user: {
        id: socket.user._id,
        name: socket.user.fullName,
        role: socket.user.role
      },
      timestamp: new Date()
    });
  });

  // Utility functions for broadcasting
  const broadcastToRole = (role, event, data) => {
    io.to(role).emit(event, data);
  };

  const broadcastToStore = (storeId, event, data) => {
    io.to(`store_${storeId}`).emit(event, data);
  };

  const broadcastToOrder = (orderId, event, data) => {
    io.to(`order_${orderId}`).emit(event, data);
  };

  const broadcastInventoryAlert = (storeId, alert) => {
    io.to(`inventory_alerts_${storeId}`).emit('inventory_alert', alert);
  };

  const broadcastAnalyticsUpdate = (storeId, data) => {
    io.to(`analytics_${storeId || 'global'}`).emit('analytics_update', data);
  };

  // Expose utility functions
  io.broadcastToRole = broadcastToRole;
  io.broadcastToStore = broadcastToStore;
  io.broadcastToOrder = broadcastToOrder;
  io.broadcastInventoryAlert = broadcastInventoryAlert;
  io.broadcastAnalyticsUpdate = broadcastAnalyticsUpdate;
  io.getConnectedUsers = () => connectedUsers;

  logger.info('Socket.IO handlers initialized');
};

export { setupSocketHandlers };