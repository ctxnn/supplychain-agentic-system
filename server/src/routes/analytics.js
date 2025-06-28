import express from 'express';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private (Admin, Store Manager)
router.get('/dashboard',
  authenticate,
  authorize('admin', 'store_manager'),
  async (req, res) => {
    try {
      const { storeId, period = '7d' } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      let filter = {
        createdAt: { $gte: startDate, $lte: endDate }
      };

      // Filter by store for store managers
      if (req.user.role === 'store_manager') {
        filter.storeId = req.user.storeId;
      } else if (storeId) {
        filter.storeId = storeId;
      }

      // Order analytics
      const orderStats = await Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            confirmedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            shippedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]);

      // Daily trends
      const dailyTrends = await Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Top products
      const topProducts = await Order.aggregate([
        { $match: filter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.sku',
            name: { $first: '$items.name' },
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]);

      // Store performance (admin only)
      let storePerformance = [];
      if (req.user.role === 'admin') {
        storePerformance = await Order.aggregate([
          { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
          {
            $group: {
              _id: '$storeId',
              orders: { $sum: 1 },
              revenue: { $sum: '$totalAmount' }
            }
          },
          {
            $lookup: {
              from: 'stores',
              localField: '_id',
              foreignField: '_id',
              as: 'store'
            }
          },
          { $unwind: '$store' },
          {
            $project: {
              storeId: '$_id',
              storeName: '$store.name',
              orders: 1,
              revenue: 1
            }
          },
          { $sort: { revenue: -1 } }
        ]);
      }

      res.json({
        success: true,
        data: {
          period,
          dateRange: { startDate, endDate },
          orders: orderStats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            pendingOrders: 0,
            confirmedOrders: 0,
            shippedOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0
          },
          dailyTrends,
          topProducts,
          storePerformance
        }
      });

    } catch (error) {
      logger.error('Dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching dashboard analytics'
      });
    }
  }
);

// @route   GET /api/analytics/inventory
// @desc    Get inventory analytics
// @access  Private (Admin, Store Manager)
router.get('/inventory',
  authenticate,
  authorize('admin', 'store_manager'),
  async (req, res) => {
    try {
      const { storeId } = req.query;

      let filter = { isActive: true };

      if (req.user.role === 'store_manager') {
        filter.storeId = req.user.storeId;
      } else if (storeId) {
        filter.storeId = storeId;
      }

      // Inventory summary
      const inventorySummary = await Inventory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
            totalQuantity: { $sum: '$quantity' },
            totalReserved: { $sum: '$reserved' },
            lowStockItems: {
              $sum: { $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0] }
            },
            outOfStockItems: {
              $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
            }
          }
        }
      ]);

      // Category breakdown
      const categoryBreakdown = await Inventory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            items: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
            lowStockItems: {
              $sum: { $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0] }
            }
          }
        },
        { $sort: { totalValue: -1 } }
      ]);

      // Stock movement trends
      const stockMovements = await Inventory.aggregate([
        { $match: filter },
        { $unwind: '$stockHistory' },
        {
          $match: {
            'stockHistory.timestamp': {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: '%Y-%m-%d', date: '$stockHistory.timestamp' }
              },
              action: '$stockHistory.action'
            },
            count: { $sum: 1 },
            quantity: { $sum: '$stockHistory.quantity' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Top moving items
      const topMovingItems = await Inventory.aggregate([
        { $match: filter },
        { $unwind: '$stockHistory' },
        {
          $match: {
            'stockHistory.timestamp': {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            },
            'stockHistory.action': 'sale'
          }
        },
        {
          $group: {
            _id: '$sku',
            name: { $first: '$name' },
            category: { $first: '$category' },
            totalSold: { $sum: '$stockHistory.quantity' },
            currentStock: { $first: '$quantity' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]);

      res.json({
        success: true,
        data: {
          summary: inventorySummary[0] || {
            totalItems: 0,
            totalValue: 0,
            totalQuantity: 0,
            totalReserved: 0,
            lowStockItems: 0,
            outOfStockItems: 0
          },
          categoryBreakdown,
          stockMovements,
          topMovingItems
        }
      });

    } catch (error) {
      logger.error('Inventory analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching inventory analytics'
      });
    }
  }
);

// @route   GET /api/analytics/delivery
// @desc    Get delivery analytics
// @access  Private (Admin, Store Manager, Delivery Agent)
router.get('/delivery',
  authenticate,
  authorize('admin', 'store_manager', 'delivery_agent'),
  async (req, res) => {
    try {
      const { storeId, period = '7d' } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      let filter = {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['shipped', 'delivered'] }
      };

      if (req.user.role === 'store_manager') {
        filter.storeId = req.user.storeId;
      } else if (req.user.role === 'delivery_agent') {
        filter.deliveryAgentId = req.user._id;
      } else if (storeId) {
        filter.storeId = storeId;
      }

      // Delivery performance
      const deliveryStats = await Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalDeliveries: { $sum: 1 },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            averageDeliveryTime: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ['$actualDelivery', null] }, { $ne: ['$createdAt', null] }] },
                  { $subtract: ['$actualDelivery', '$createdAt'] },
                  null
                ]
              }
            }
          }
        }
      ]);

      // Delivery time trends
      const deliveryTrends = await Order.aggregate([
        { 
          $match: { 
            ...filter,
            actualDelivery: { $ne: null }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$actualDelivery' }
            },
            deliveries: { $sum: 1 },
            averageTime: {
              $avg: { $subtract: ['$actualDelivery', '$createdAt'] }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Delivery agent performance (admin/store manager only)
      let agentPerformance = [];
      if (['admin', 'store_manager'].includes(req.user.role)) {
        agentPerformance = await Order.aggregate([
          { 
            $match: { 
              ...filter,
              deliveryAgentId: { $ne: null }
            }
          },
          {
            $group: {
              _id: '$deliveryAgentId',
              deliveries: { $sum: 1 },
              delivered: {
                $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
              },
              averageTime: {
                $avg: {
                  $cond: [
                    { $ne: ['$actualDelivery', null] },
                    { $subtract: ['$actualDelivery', '$createdAt'] },
                    null
                  ]
                }
              }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'agent'
            }
          },
          { $unwind: '$agent' },
          {
            $project: {
              agentId: '$_id',
              agentName: { $concat: ['$agent.firstName', ' ', '$agent.lastName'] },
              deliveries: 1,
              delivered: 1,
              successRate: { $divide: ['$delivered', '$deliveries'] },
              averageTime: 1
            }
          },
          { $sort: { deliveries: -1 } }
        ]);
      }

      res.json({
        success: true,
        data: {
          period,
          stats: deliveryStats[0] || {
            totalDeliveries: 0,
            deliveredOrders: 0,
            averageDeliveryTime: 0
          },
          trends: deliveryTrends,
          agentPerformance
        }
      });

    } catch (error) {
      logger.error('Delivery analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching delivery analytics'
      });
    }
  }
);

// @route   GET /api/analytics/real-time
// @desc    Get real-time analytics
// @access  Private (Admin, Store Manager)
router.get('/real-time',
  authenticate,
  authorize('admin', 'store_manager'),
  async (req, res) => {
    try {
      const { storeId } = req.query;

      let filter = {};
      if (req.user.role === 'store_manager') {
        filter.storeId = req.user.storeId;
      } else if (storeId) {
        filter.storeId = storeId;
      }

      // Current active orders
      const activeOrders = await Order.countDocuments({
        ...filter,
        status: { $in: ['pending', 'confirmed', 'shipped'] }
      });

      // Orders in last hour
      const recentOrders = await Order.countDocuments({
        ...filter,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });

      // Revenue today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayRevenue = await Order.aggregate([
        {
          $match: {
            ...filter,
            createdAt: { $gte: todayStart },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]);

      // Low stock alerts
      const lowStockCount = await Inventory.countDocuments({
        ...filter,
        isActive: true,
        $expr: { $lte: ['$quantity', '$reorderPoint'] }
      });

      // Active delivery agents
      const activeAgents = await User.countDocuments({
        role: 'delivery_agent',
        isActive: true,
        ...(req.user.role === 'store_manager' ? { storeId: req.user.storeId } : {})
      });

      res.json({
        success: true,
        data: {
          activeOrders,
          recentOrders,
          todayRevenue: todayRevenue[0]?.total || 0,
          lowStockAlerts: lowStockCount,
          activeAgents,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('Real-time analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching real-time analytics'
      });
    }
  }
);

export default router;