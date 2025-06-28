import express from 'express';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import Store from '../models/Store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateSchema, schemas } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { getQueues } from '../config/queues.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// @route   GET /api/orders
// @desc    Get orders (filtered by user role)
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, storeId } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    // Filter based on user role
    if (req.user.role === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.user.role === 'store_manager') {
      filter.storeId = req.user.storeId;
    } else if (req.user.role === 'delivery_agent') {
      filter.deliveryAgentId = req.user._id;
    }

    // Additional filters
    if (status) filter.status = status;
    if (storeId && ['admin', 'store_manager'].includes(req.user.role)) {
      filter.storeId = storeId;
    }

    const orders = await Order.find(filter)
      .populate('customerId', 'firstName lastName email')
      .populate('storeId', 'name address')
      .populate('deliveryAgentId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'firstName lastName email')
      .populate('storeId', 'name address')
      .populate('deliveryAgentId', 'firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'store_manager' && order.storeId._id.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/',
  authenticate,
  validateSchema(schemas.order.create),
  async (req, res) => {
    try {
      const { storeId, items, deliveryAddress, paymentMethod, notes } = req.body;

      // Verify store exists and is active
      const store = await Store.findById(storeId);
      if (!store || store.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Store not available'
        });
      }

      // Check inventory and calculate total
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const inventoryItem = await Inventory.findOne({
          storeId,
          sku: item.sku,
          isActive: true
        });

        if (!inventoryItem) {
          return res.status(400).json({
            success: false,
            message: `Item ${item.sku} not found in store inventory`
          });
        }

        if (inventoryItem.availableQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.availableQuantity}`
          });
        }

        // Reserve inventory
        await inventoryItem.reserveStock(item.quantity);

        orderItems.push({
          sku: inventoryItem.sku,
          name: inventoryItem.name,
          quantity: item.quantity,
          price: inventoryItem.price,
          category: inventoryItem.category
        });

        totalAmount += inventoryItem.price * item.quantity;
      }

      // Create order
      const order = new Order({
        orderId: `ORD-${uuidv4().slice(0, 8).toUpperCase()}`,
        customerId: req.user._id,
        storeId,
        items: orderItems,
        totalAmount,
        deliveryAddress,
        payment: {
          method: paymentMethod,
          amount: totalAmount
        },
        notes: {
          customer: notes
        }
      });

      await order.save();

      // Add to processing queue
      const { orderQueue } = getQueues();
      await orderQueue.add('process-order', {
        orderId: order._id,
        type: 'new_order'
      });

      logger.info(`New order created: ${order.orderId} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order }
      });

    } catch (error) {
      logger.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating order'
      });
    }
  }
);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Store Manager, Delivery Agent, Admin)
router.put('/:id/status',
  authenticate,
  authorize('store_manager', 'delivery_agent', 'admin'),
  validateSchema(schemas.order.updateStatus),
  async (req, res) => {
    try {
      const { status, notes, location } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check permissions
      if (req.user.role === 'store_manager' && order.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (req.user.role === 'delivery_agent' && order.deliveryAgentId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update order status
      await order.addStatusUpdate(status, location, notes);

      // Handle inventory updates based on status
      if (status === 'cancelled') {
        // Release reserved inventory
        for (const item of order.items) {
          const inventoryItem = await Inventory.findOne({
            storeId: order.storeId,
            sku: item.sku
          });
          if (inventoryItem) {
            await inventoryItem.releaseReservedStock(item.quantity);
          }
        }
      } else if (status === 'confirmed') {
        // Process inventory sale
        for (const item of order.items) {
          const inventoryItem = await Inventory.findOne({
            storeId: order.storeId,
            sku: item.sku
          });
          if (inventoryItem) {
            await inventoryItem.updateStock('sale', item.quantity, `Order ${order.orderId}`, req.user._id);
          }
        }
      }

      // Add to processing queue for notifications
      const { orderQueue } = getQueues();
      await orderQueue.add('status-update', {
        orderId: order._id,
        status,
        updatedBy: req.user._id
      });

      logger.info(`Order ${order.orderId} status updated to ${status} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: { order }
      });

    } catch (error) {
      logger.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating order status'
      });
    }
  }
);

// @route   PUT /api/orders/:id/assign-driver
// @desc    Assign delivery agent to order
// @access  Private (Store Manager, Admin)
router.put('/:id/assign-driver',
  authenticate,
  authorize('store_manager', 'admin'),
  async (req, res) => {
    try {
      const { deliveryAgentId } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Verify delivery agent
      const deliveryAgent = await User.findOne({
        _id: deliveryAgentId,
        role: 'delivery_agent',
        isActive: true
      });

      if (!deliveryAgent) {
        return res.status(400).json({
          success: false,
          message: 'Invalid delivery agent'
        });
      }

      order.deliveryAgentId = deliveryAgentId;
      await order.save();

      logger.info(`Delivery agent ${deliveryAgent.email} assigned to order ${order.orderId}`);

      res.json({
        success: true,
        message: 'Delivery agent assigned successfully',
        data: { order }
      });

    } catch (error) {
      logger.error('Assign driver error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while assigning delivery agent'
      });
    }
  }
);

// @route   GET /api/orders/analytics/summary
// @desc    Get order analytics summary
// @access  Private (Store Manager, Admin)
router.get('/analytics/summary',
  authenticate,
  authorize('store_manager', 'admin'),
  async (req, res) => {
    try {
      const { storeId, startDate, endDate } = req.query;

      let filter = {};
      
      if (req.user.role === 'store_manager') {
        filter.storeId = req.user.storeId;
      } else if (storeId) {
        filter.storeId = storeId;
      }

      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const summary = await Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            statusBreakdown: {
              $push: '$status'
            }
          }
        },
        {
          $project: {
            totalOrders: 1,
            totalRevenue: 1,
            averageOrderValue: { $round: ['$averageOrderValue', 2] },
            statusBreakdown: 1
          }
        }
      ]);

      res.json({
        success: true,
        data: summary[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          statusBreakdown: []
        }
      });

    } catch (error) {
      logger.error('Order analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching analytics'
      });
    }
  }
);

export default router;