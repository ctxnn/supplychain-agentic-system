import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { getQueues } from '../config/queues.js';

const router = express.Router();

// Agent health status
const agentHealth = {
  'customer-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'inventory-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'route-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'store-manager-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'delivery-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'notification-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 }
};

// @route   GET /api/agents/health
// @desc    Get agent health status
// @access  Private (Admin, Store Manager)
router.get('/health',
  authenticate,
  authorize('admin', 'store_manager'),
  async (req, res) => {
    try {
      // Update health status with queue information
      const queues = getQueues();
      const queueStats = {};

      for (const [queueName, queue] of Object.entries(queues)) {
        if (queue) {
          const waiting = await queue.getWaiting();
          const active = await queue.getActive();
          const completed = await queue.getCompleted();
          const failed = await queue.getFailed();

          queueStats[queueName] = {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length
          };
        }
      }

      res.json({
        success: true,
        data: {
          agents: agentHealth,
          queues: queueStats,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('Agent health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while checking agent health'
      });
    }
  }
);

// @route   POST /api/agents/message
// @desc    Send message to agent
// @access  Private
router.post('/message',
  authenticate,
  async (req, res) => {
    try {
      const { to, type, content, data } = req.body;

      if (!to || !type || !content) {
        return res.status(400).json({
          success: false,
          message: 'Agent ID, message type, and content are required'
        });
      }

      const message = {
        id: `msg_${Date.now()}`,
        from: req.user.role,
        to,
        type,
        content,
        data,
        timestamp: new Date(),
        status: 'sent',
        userId: req.user._id
      };

      // Route message to appropriate queue based on agent type
      const { orderQueue, inventoryQueue, notificationQueue } = getQueues();

      switch (to) {
        case 'inventory-agent':
          await inventoryQueue.add('agent_message', {
            type: 'agent_message',
            data: message
          });
          break;
        case 'notification-agent':
          await notificationQueue.add('agent_message', {
            type: 'agent_message',
            data: message
          });
          break;
        default:
          await orderQueue.add('agent_message', {
            type: 'agent_message',
            data: message
          });
      }

      // Update agent health
      if (agentHealth[to]) {
        agentHealth[to].messagesProcessed++;
        agentHealth[to].lastCheck = new Date();
      }

      logger.info(`Message sent to ${to} from ${req.user.email}: ${content}`);

      res.json({
        success: true,
        message: 'Message sent to agent successfully',
        data: { messageId: message.id }
      });

    } catch (error) {
      logger.error('Send agent message error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while sending message to agent'
      });
    }
  }
);

// @route   POST /api/agents/customer/chat
// @desc    Send chat message to customer agent
// @access  Private
router.post('/customer/chat',
  authenticate,
  async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      // Process customer chat message
      const response = await processCustomerChat(message, req.user);

      res.json({
        success: true,
        data: { response }
      });

    } catch (error) {
      logger.error('Customer chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while processing chat message'
      });
    }
  }
);

// @route   POST /api/agents/inventory/check
// @desc    Check inventory availability
// @access  Private
router.post('/inventory/check',
  authenticate,
  async (req, res) => {
    try {
      const { storeId, items } = req.body;

      if (!storeId || !items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: 'Store ID and items array are required'
        });
      }

      // Add to inventory queue for processing
      const { inventoryQueue } = getQueues();
      await inventoryQueue.add('inventory_check', {
        type: 'inventory_check',
        data: { storeId, items, userId: req.user._id }
      });

      res.json({
        success: true,
        message: 'Inventory check queued successfully'
      });

    } catch (error) {
      logger.error('Inventory check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while checking inventory'
      });
    }
  }
);

// @route   POST /api/agents/route/optimize
// @desc    Request route optimization
// @access  Private (Delivery Agent, Store Manager, Admin)
router.post('/route/optimize',
  authenticate,
  authorize('delivery_agent', 'store_manager', 'admin'),
  async (req, res) => {
    try {
      const { orderId, optimizationMode = 'time' } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      // Add to order queue for route optimization
      const { orderQueue } = getQueues();
      await orderQueue.add('route_optimization', {
        orderId,
        type: 'route_optimization',
        optimizationMode,
        requestedBy: req.user._id
      });

      logger.info(`Route optimization requested for order ${orderId} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Route optimization queued successfully'
      });

    } catch (error) {
      logger.error('Route optimization error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while requesting route optimization'
      });
    }
  }
);

// @route   GET /api/agents/analytics
// @desc    Get agent performance analytics
// @access  Private (Admin)
router.get('/analytics',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Calculate agent performance metrics
      const analytics = {
        messageVolume: {},
        responseTime: {},
        successRate: {},
        uptime: {}
      };

      // Get queue statistics
      const queues = getQueues();
      for (const [queueName, queue] of Object.entries(queues)) {
        if (queue) {
          const completed = await queue.getCompleted();
          const failed = await queue.getFailed();
          
          analytics.messageVolume[queueName] = completed.length + failed.length;
          analytics.successRate[queueName] = completed.length / (completed.length + failed.length) || 0;
        }
      }

      // Calculate uptime based on health checks
      for (const [agentId, health] of Object.entries(agentHealth)) {
        const uptimeHours = (Date.now() - health.lastCheck.getTime()) / (1000 * 60 * 60);
        analytics.uptime[agentId] = Math.max(0, 24 - uptimeHours) / 24; // 24-hour uptime percentage
      }

      res.json({
        success: true,
        data: {
          analytics,
          agentHealth,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('Agent analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching agent analytics'
      });
    }
  }
);

// Helper function to process customer chat
const processCustomerChat = async (message, user) => {
  try {
    // Simple NLP processing for demo
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('order') || lowerMessage.includes('buy')) {
      return "I can help you place an order! What items would you like to purchase?";
    } else if (lowerMessage.includes('track') || lowerMessage.includes('delivery')) {
      return "I can help you track your order. Please provide your order ID or I can look up your recent orders.";
    } else if (lowerMessage.includes('cancel')) {
      return "I can help you cancel an order. Please provide the order ID you'd like to cancel.";
    } else if (lowerMessage.includes('store') || lowerMessage.includes('location')) {
      return "I can help you find nearby stores. What's your location or zip code?";
    } else if (lowerMessage.includes('help')) {
      return "I'm here to help! I can assist with placing orders, tracking deliveries, finding stores, and answering questions about our services.";
    } else {
      return "Thank you for your message. I'm processing your request and will provide assistance shortly. How else can I help you today?";
    }
  } catch (error) {
    logger.error('Customer chat processing error:', error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
  }
};

export default router;