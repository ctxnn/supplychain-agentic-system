import express from 'express';
import { WorkflowOrchestrator } from '../agents/WorkflowOrchestrator.js';
import { authenticate as auth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { getQueues } from '../config/queues.js';

const router = express.Router();

// Initialize the workflow orchestrator
const orchestrator = new WorkflowOrchestrator();

// Agent health status
const agentHealth = {
  'customer-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'inventory-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'route-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'store-manager-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'delivery-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 },
  'notification-agent': { status: 'healthy', lastCheck: new Date(), messagesProcessed: 0 }
};

// TEST ENDPOINT - No authentication required (for easy testing)
router.post('/test/customer-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    logger.info('Testing customer query', { query });
    
    const response = await orchestrator.handleCustomerQuery(query);
    
    res.json({
      success: true,
      data: response,
      message: 'AI Agent Test Successful!'
    });
  } catch (error) {
    logger.error('Customer query test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process customer query',
      error: error.message
    });
  }
});

// TEST ENDPOINT - No authentication required (for easy testing)
router.post('/test/workflow', async (req, res) => {
  try {
    const { order } = req.body;
    
    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Order data is required'
      });
    }

    logger.info('Testing workflow', { orderId: order.id });
    
    const result = await orchestrator.runWorkflow({ order });
    
    res.json({
      success: true,
      data: result,
      message: 'AI Workflow Test Successful!'
    });
  } catch (error) {
    logger.error('Workflow test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute workflow',
      error: error.message
    });
  }
});

// @route   GET /api/agents/health
// @desc    Get agent health status
// @access  Private (Admin, Store Manager)
router.get('/health',
  auth,
  async (req, res) => {
    try {
      const health = await orchestrator.getAgentHealth();
      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Agent health check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get agent health status',
        error: error.message
      });
    }
  }
);

// @route   GET /api/agents/status
// @desc    Get system status
// @access  Private (Admin, Store Manager)
router.get('/status',
  auth,
  async (req, res) => {
    try {
      const status = await orchestrator.getSystemStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('System status check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system status',
        error: error.message
      });
    }
  }
);

// @route   POST /api/agents/workflow
// @desc    Run complete workflow
// @access  Private (Admin, Store Manager)
router.post('/workflow',
  auth,
  async (req, res) => {
    try {
      const { order } = req.body;
      
      if (!order) {
        return res.status(400).json({
          success: false,
          message: 'Order data is required'
        });
      }

      logger.info('Starting new workflow', { orderId: order.id });
      
      const result = await orchestrator.runWorkflow({ order });
      
      res.json({
        success: true,
        data: result,
        message: 'Workflow completed successfully'
      });
    } catch (error) {
      logger.error('Workflow execution failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute workflow',
        error: error.message
      });
    }
  }
);

// @route   GET /api/agents/workflow/:workflowId
// @desc    Get workflow status
// @access  Private (Admin, Store Manager)
router.get('/workflow/:workflowId',
  auth,
  async (req, res) => {
    try {
      const { workflowId } = req.params;
      const status = await orchestrator.getWorkflowStatus(workflowId);
      
      if (status.error) {
        return res.status(404).json({
          success: false,
          message: status.error
        });
      }
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Workflow status check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow status',
        error: error.message
      });
    }
  }
);

// @route   GET /api/agents/workflow/history
// @desc    Get workflow history
// @access  Private (Admin, Store Manager)
router.get('/workflow/history',
  auth,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const history = await orchestrator.getWorkflowHistory(limit);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Workflow history retrieval failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow history',
        error: error.message
      });
    }
  }
);

// @route   POST /api/agents/customer/query
// @desc    Handle customer query
// @access  Private (Admin, Store Manager)
router.post('/customer/query',
  auth,
  async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query is required'
        });
      }

      logger.info('Processing customer query', { query });
      
      const response = await orchestrator.handleCustomerQuery(query);
      
      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error('Customer query processing failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process customer query',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/agents/inventory
// @desc    Update inventory
// @access  Private (Admin, Store Manager)
router.put('/inventory',
  auth,
  async (req, res) => {
    try {
      const { storeId, sku, quantity } = req.body;
      
      if (!storeId || !sku || quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'storeId, sku, and quantity are required'
        });
      }

      logger.info('Updating inventory', { storeId, sku, quantity });
      
      const result = await orchestrator.updateInventory(storeId, sku, quantity);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Inventory update failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/agents/route/optimization
// @desc    Set route optimization mode
// @access  Private (Admin, Store Manager)
router.put('/route/optimization',
  auth,
  async (req, res) => {
    try {
      const { mode } = req.body;
      
      if (!mode || !['time', 'fuel', 'distance'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'Valid mode (time, fuel, distance) is required'
        });
      }

      logger.info('Setting route optimization mode', { mode });
      
      const result = await orchestrator.setRouteOptimization(mode);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Route optimization setting failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set route optimization mode',
        error: error.message
      });
    }
  }
);

// @route   GET /api/agents/data/:agentName
// @desc    Get agent-specific data
// @access  Private (Admin, Store Manager)
router.get('/data/:agentName',
  auth,
  async (req, res) => {
    try {
      const { agentName } = req.params;
      const data = await orchestrator.getAgentData(agentName);
      
      if (data.error) {
        return res.status(404).json({
          success: false,
          message: data.error
        });
      }
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('Agent data retrieval failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get agent data',
        error: error.message
      });
    }
  }
);

// @route   POST /api/agents/notification/status
// @desc    Send status update notification
// @access  Private (Admin, Store Manager)
router.post('/notification/status',
  auth,
  async (req, res) => {
    try {
      const { orderId, status, additionalInfo } = req.body;
      
      if (!orderId || !status) {
        return res.status(400).json({
          success: false,
          message: 'orderId and status are required'
        });
      }

      logger.info('Sending status update notification', { orderId, status });
      
      const result = await orchestrator.notificationAgent.sendStatusUpdate(orderId, status, additionalInfo);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Status notification failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send status notification',
        error: error.message
      });
    }
  }
);

// @route   GET /api/agents/notification/history
// @desc    Get notification history
// @access  Private (Admin, Store Manager)
router.get('/notification/history',
  auth,
  async (req, res) => {
    try {
      const { orderId } = req.query;
      const history = orchestrator.notificationAgent.getNotificationHistory(orderId);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Notification history retrieval failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification history',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/agents/delivery/status
// @desc    Update delivery status
// @access  Private (Admin, Store Manager)
router.put('/delivery/status',
  auth,
  async (req, res) => {
    try {
      const { orderId, status, location } = req.body;
      
      if (!orderId || !status) {
        return res.status(400).json({
          success: false,
          message: 'orderId and status are required'
        });
      }

      logger.info('Updating delivery status', { orderId, status });
      
      const result = await orchestrator.deliveryAgent.updateDeliveryStatus(orderId, status, location);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Delivery status update failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update delivery status',
        error: error.message
      });
    }
  }
);

// @route   GET /api/agents/delivery/driver/:driverId
// @desc    Get driver status
// @access  Private (Admin, Store Manager)
router.get('/delivery/driver/:driverId',
  auth,
  async (req, res) => {
    try {
      const { driverId } = req.params;
      const status = await orchestrator.deliveryAgent.getDriverStatus(driverId);
      
      if (status.error) {
        return res.status(404).json({
          success: false,
          message: status.error
        });
      }
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Driver status check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get driver status',
        error: error.message
      });
    }
  }
);

// @route   GET /api/agents/store/:storeId
// @desc    Get store status
// @access  Private (Admin, Store Manager)
router.get('/store/:storeId',
  auth,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const status = await orchestrator.storeManagerAgent.getStoreStatus(storeId);
      
      if (status.error) {
        return res.status(404).json({
          success: false,
          message: status.error
        });
      }
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Store status check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get store status',
        error: error.message
      });
    }
  }
);

export default router;