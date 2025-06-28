import express from 'express';
import Store from '../models/Store.js';
import User from '../models/User.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/stores
// @desc    Get all stores
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    // Filter based on user role
    if (req.user.role === 'store_manager') {
      filter._id = req.user.storeId;
    }

    // Additional filters
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { storeId: { $regex: search, $options: 'i' } }
      ];
    }

    const stores = await Store.find(filter)
      .populate('managerId', 'firstName lastName email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Store.countDocuments(filter);

    res.json({
      success: true,
      data: {
        stores,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    logger.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stores'
    });
  }
});

// @route   GET /api/stores/:id
// @desc    Get single store
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('managerId', 'firstName lastName email phone');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Check permissions
    if (req.user.role === 'store_manager' && store._id.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { store }
    });

  } catch (error) {
    logger.error('Get store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching store'
    });
  }
});

// @route   POST /api/stores
// @desc    Create new store
// @access  Private (Admin)
router.post('/',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const storeData = req.body;

      // Validate manager exists
      if (storeData.managerId) {
        const manager = await User.findOne({
          _id: storeData.managerId,
          role: 'store_manager',
          isActive: true
        });

        if (!manager) {
          return res.status(400).json({
            success: false,
            message: 'Invalid store manager'
          });
        }
      }

      const store = new Store(storeData);
      await store.save();

      // Update manager's store assignment
      if (storeData.managerId) {
        await User.findByIdAndUpdate(storeData.managerId, {
          storeId: store._id
        });
      }

      logger.info(`New store created: ${store.name} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Store created successfully',
        data: { store }
      });

    } catch (error) {
      logger.error('Create store error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating store'
      });
    }
  }
);

// @route   PUT /api/stores/:id
// @desc    Update store
// @access  Private (Admin, Store Manager)
router.put('/:id',
  authenticate,
  authorize('admin', 'store_manager'),
  async (req, res) => {
    try {
      const store = await Store.findById(req.params.id);
      
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      // Check permissions
      if (req.user.role === 'store_manager' && store._id.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updates = req.body;

      // Validate manager change (admin only)
      if (updates.managerId && req.user.role !== 'admin') {
        delete updates.managerId;
      }

      if (updates.managerId) {
        const manager = await User.findOne({
          _id: updates.managerId,
          role: 'store_manager',
          isActive: true
        });

        if (!manager) {
          return res.status(400).json({
            success: false,
            message: 'Invalid store manager'
          });
        }
      }

      Object.assign(store, updates);
      await store.save();

      logger.info(`Store updated: ${store.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Store updated successfully',
        data: { store }
      });

    } catch (error) {
      logger.error('Update store error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating store'
      });
    }
  }
);

// @route   GET /api/stores/:id/analytics
// @desc    Get store analytics
// @access  Private (Admin, Store Manager)
router.get('/:id/analytics',
  authenticate,
  authorize('admin', 'store_manager'),
  async (req, res) => {
    try {
      const storeId = req.params.id;

      // Check permissions
      if (req.user.role === 'store_manager' && storeId !== req.user.storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const { startDate, endDate } = req.query;
      let dateFilter = {};

      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        };
      }

      // Order analytics
      const orderAnalytics = await Order.aggregate([
        { 
          $match: { 
            storeId: mongoose.Types.ObjectId(storeId),
            ...dateFilter
          }
        },
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
        }
      ]);

      // Inventory analytics
      const inventoryAnalytics = await Inventory.aggregate([
        { $match: { storeId: mongoose.Types.ObjectId(storeId), isActive: true } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
            lowStockItems: {
              $sum: {
                $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0]
              }
            }
          }
        }
      ]);

      // Daily order trends
      const dailyTrends = await Order.aggregate([
        { 
          $match: { 
            storeId: mongoose.Types.ObjectId(storeId),
            ...dateFilter
          }
        },
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

      res.json({
        success: true,
        data: {
          orders: orderAnalytics[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            statusBreakdown: []
          },
          inventory: inventoryAnalytics[0] || {
            totalItems: 0,
            totalValue: 0,
            lowStockItems: 0
          },
          dailyTrends
        }
      });

    } catch (error) {
      logger.error('Store analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching analytics'
      });
    }
  }
);

// @route   GET /api/stores/nearby
// @desc    Find nearby stores
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 25 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const stores = await Store.find({
      status: 'active',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    }).populate('managerId', 'firstName lastName');

    res.json({
      success: true,
      data: { stores }
    });

  } catch (error) {
    logger.error('Find nearby stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while finding nearby stores'
    });
  }
});

// @route   PUT /api/stores/:id/status
// @desc    Update store status
// @access  Private (Admin)
router.put('/:id/status',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!['active', 'maintenance', 'closed', 'temporarily_closed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const store = await Store.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      logger.info(`Store status updated: ${store.name} -> ${status} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Store status updated successfully',
        data: { store }
      });

    } catch (error) {
      logger.error('Update store status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating store status'
      });
    }
  }
);

export default router;