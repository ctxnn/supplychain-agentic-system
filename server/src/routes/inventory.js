import express from 'express';
import Inventory from '../models/Inventory.js';
import Store from '../models/Store.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateSchema, schemas } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { getQueues } from '../config/queues.js';

const router = express.Router();

// @route   GET /api/inventory
// @desc    Get inventory items
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, storeId, category, search, lowStock } = req.query;
    const skip = (page - 1) * limit;

    let filter = { isActive: true };

    // Filter based on user role
    if (req.user.role === 'store_manager') {
      filter.storeId = req.user.storeId;
    } else if (storeId && ['admin'].includes(req.user.role)) {
      filter.storeId = storeId;
    }

    // Additional filters
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$quantity', '$reorderPoint'] };
    }

    const inventory = await Inventory.find(filter)
      .populate('storeId', 'name address')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Inventory.countDocuments(filter);

    res.json({
      success: true,
      data: {
        inventory,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    logger.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory'
    });
  }
});

// @route   GET /api/inventory/:id
// @desc    Get single inventory item
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('storeId', 'name address')
      .populate('stockHistory.userId', 'firstName lastName');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check permissions
    if (req.user.role === 'store_manager' && item.storeId._id.toString() !== req.user.storeId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { item }
    });

  } catch (error) {
    logger.error('Get inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory item'
    });
  }
});

// @route   POST /api/inventory
// @desc    Create new inventory item
// @access  Private (Store Manager, Admin)
router.post('/',
  authenticate,
  authorize('store_manager', 'admin'),
  validateSchema(schemas.inventory.create),
  async (req, res) => {
    try {
      const itemData = req.body;

      // Set store ID based on user role
      if (req.user.role === 'store_manager') {
        itemData.storeId = req.user.storeId;
      }

      // Check if SKU already exists in store
      const existingItem = await Inventory.findOne({
        storeId: itemData.storeId,
        sku: itemData.sku
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists in this store'
        });
      }

      const item = new Inventory(itemData);
      await item.save();

      logger.info(`New inventory item created: ${item.sku} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: { item }
      });

    } catch (error) {
      logger.error('Create inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating inventory item'
      });
    }
  }
);

// @route   PUT /api/inventory/:id
// @desc    Update inventory item
// @access  Private (Store Manager, Admin)
router.put('/:id',
  authenticate,
  authorize('store_manager', 'admin'),
  async (req, res) => {
    try {
      const item = await Inventory.findById(req.params.id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      // Check permissions
      if (req.user.role === 'store_manager' && item.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updates = req.body;
      Object.assign(item, updates);
      await item.save();

      logger.info(`Inventory item updated: ${item.sku} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Inventory item updated successfully',
        data: { item }
      });

    } catch (error) {
      logger.error('Update inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating inventory item'
      });
    }
  }
);

// @route   PUT /api/inventory/:id/stock
// @desc    Update stock quantity
// @access  Private (Store Manager, Admin)
router.put('/:id/stock',
  authenticate,
  authorize('store_manager', 'admin'),
  validateSchema(schemas.inventory.updateStock),
  async (req, res) => {
    try {
      const { action, quantity, reason } = req.body;

      const item = await Inventory.findById(req.params.id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      // Check permissions
      if (req.user.role === 'store_manager' && item.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update stock through queue for proper tracking
      const { inventoryQueue } = getQueues();
      await inventoryQueue.add('stock_update', {
        type: 'stock_update',
        data: {
          inventoryId: item._id,
          action,
          quantity,
          reason,
          userId: req.user._id
        }
      });

      logger.info(`Stock update queued: ${item.sku} ${action} ${quantity} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Stock update queued successfully'
      });

    } catch (error) {
      logger.error('Update stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating stock'
      });
    }
  }
);

// @route   POST /api/inventory/:id/reserve
// @desc    Reserve stock for order
// @access  Private
router.post('/:id/reserve',
  authenticate,
  async (req, res) => {
    try {
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity is required'
        });
      }

      const item = await Inventory.findById(req.params.id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      if (item.availableQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock available'
        });
      }

      await item.reserveStock(quantity);

      logger.info(`Stock reserved: ${item.sku} (${quantity}) by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Stock reserved successfully',
        data: {
          sku: item.sku,
          reserved: quantity,
          availableQuantity: item.availableQuantity
        }
      });

    } catch (error) {
      logger.error('Reserve stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while reserving stock'
      });
    }
  }
);

// @route   POST /api/inventory/:id/release
// @desc    Release reserved stock
// @access  Private
router.post('/:id/release',
  authenticate,
  async (req, res) => {
    try {
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity is required'
        });
      }

      const item = await Inventory.findById(req.params.id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      await item.releaseReservedStock(quantity);

      logger.info(`Reserved stock released: ${item.sku} (${quantity}) by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Reserved stock released successfully',
        data: {
          sku: item.sku,
          released: quantity,
          availableQuantity: item.availableQuantity
        }
      });

    } catch (error) {
      logger.error('Release stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while releasing stock'
      });
    }
  }
);

// @route   GET /api/inventory/analytics/summary
// @desc    Get inventory analytics
// @access  Private (Store Manager, Admin)
router.get('/analytics/summary',
  authenticate,
  authorize('store_manager', 'admin'),
  async (req, res) => {
    try {
      const { storeId } = req.query;

      let filter = { isActive: true };
      
      if (req.user.role === 'store_manager') {
        filter.storeId = req.user.storeId;
      } else if (storeId) {
        filter.storeId = storeId;
      }

      const summary = await Inventory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
            totalQuantity: { $sum: '$quantity' },
            totalReserved: { $sum: '$reserved' },
            lowStockItems: {
              $sum: {
                $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0]
              }
            },
            outOfStockItems: {
              $sum: {
                $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
              }
            },
            categories: { $addToSet: '$category' }
          }
        }
      ]);

      const categoryBreakdown = await Inventory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            items: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$price'] } }
          }
        },
        { $sort: { totalValue: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          summary: summary[0] || {
            totalItems: 0,
            totalValue: 0,
            totalQuantity: 0,
            totalReserved: 0,
            lowStockItems: 0,
            outOfStockItems: 0,
            categories: []
          },
          categoryBreakdown
        }
      });

    } catch (error) {
      logger.error('Inventory analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching analytics'
      });
    }
  }
);

// @route   POST /api/inventory/bulk-update
// @desc    Bulk update inventory
// @access  Private (Admin)
router.post('/bulk-update',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { storeId, items } = req.body;

      if (!storeId || !items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: 'Store ID and items array are required'
        });
      }

      // Add to inventory sync queue
      const { inventoryQueue } = getQueues();
      await inventoryQueue.add('inventory_sync', {
        type: 'inventory_sync',
        data: { storeId, items }
      });

      logger.info(`Bulk inventory update queued for store ${storeId}: ${items.length} items by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Bulk inventory update queued successfully'
      });

    } catch (error) {
      logger.error('Bulk inventory update error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while processing bulk update'
      });
    }
  }
);

export default router;