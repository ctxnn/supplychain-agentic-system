import Inventory from '../models/Inventory.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import { io } from '../server.ts';

const processInventoryQueue = async (job) => {
  const { type, data } = job.data;

  try {
    switch (type) {
      case 'low_stock_check':
        await handleLowStockCheck(data);
        break;
      case 'auto_restock':
        await handleAutoRestock(data);
        break;
      case 'stock_update':
        await handleStockUpdate(data);
        break;
      case 'inventory_sync':
        await handleInventorySync(data);
        break;
      default:
        logger.warn(`Unknown inventory processing type: ${type}`);
    }

    logger.info(`Inventory processing completed: ${type}`);

  } catch (error) {
    logger.error(`Inventory processing failed: ${type}`, error);
    throw error;
  }
};

const handleLowStockCheck = async (data) => {
  try {
    const { storeId } = data;

    // Find all low stock items
    const lowStockItems = await Inventory.find({
      storeId,
      isActive: true,
      $expr: { $lte: ['$quantity', '$reorderPoint'] }
    }).populate('storeId', 'name managerId');

    if (lowStockItems.length === 0) {
      return;
    }

    // Group by urgency
    const criticalItems = lowStockItems.filter(item => item.quantity === 0);
    const lowItems = lowStockItems.filter(item => item.quantity > 0 && item.quantity <= item.reorderPoint);

    // Send alerts
    const alert = {
      storeId,
      timestamp: new Date(),
      critical: criticalItems.length,
      low: lowItems.length,
      items: lowStockItems.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        reorderPoint: item.reorderPoint,
        status: item.quantity === 0 ? 'critical' : 'low'
      }))
    };

    // Broadcast to store managers
    io.broadcastInventoryAlert(storeId, alert);

    // Send email notification to store manager
    const store = await Store.findById(storeId).populate('managerId');
    if (store && store.managerId) {
      await sendLowStockNotification(store.managerId, alert);
    }

    // Auto-trigger restock for critical items
    for (const item of criticalItems) {
      await triggerAutoRestock(item);
    }

    logger.info(`Low stock check completed for store ${storeId}: ${criticalItems.length} critical, ${lowItems.length} low`);

  } catch (error) {
    logger.error('Low stock check failed:', error);
    throw error;
  }
};

const handleAutoRestock = async (data) => {
  try {
    const { inventoryId, quantity, reason } = data;

    const item = await Inventory.findById(inventoryId);
    if (!item) {
      throw new Error(`Inventory item not found: ${inventoryId}`);
    }

    // Update stock
    await item.updateStock('restock', quantity, reason || 'Auto-restock triggered', null);

    // Broadcast update
    io.broadcastToStore(item.storeId, 'inventory_updated', {
      sku: item.sku,
      name: item.name,
      previousQuantity: item.quantity - quantity,
      newQuantity: item.quantity,
      action: 'restock',
      timestamp: new Date()
    });

    // Log restock order
    logger.info(`Auto-restock completed: ${item.sku} (+${quantity}) at store ${item.storeId}`);

    // Send confirmation to store manager
    const store = await Store.findById(item.storeId).populate('managerId');
    if (store && store.managerId) {
      await sendRestockConfirmation(store.managerId, item, quantity);
    }

  } catch (error) {
    logger.error('Auto-restock failed:', error);
    throw error;
  }
};

const handleStockUpdate = async (data) => {
  try {
    const { inventoryId, action, quantity, reason, userId } = data;

    const item = await Inventory.findById(inventoryId);
    if (!item) {
      throw new Error(`Inventory item not found: ${inventoryId}`);
    }

    const previousQuantity = item.quantity;
    await item.updateStock(action, quantity, reason, userId);

    // Broadcast real-time update
    io.broadcastToStore(item.storeId, 'inventory_updated', {
      sku: item.sku,
      name: item.name,
      previousQuantity,
      newQuantity: item.quantity,
      action,
      reason,
      timestamp: new Date(),
      updatedBy: userId
    });

    // Check if this update triggers low stock alert
    if (item.quantity <= item.reorderPoint) {
      const { inventoryQueue } = require('../config/queues.js').getQueues();
      await inventoryQueue.add('low_stock_check', {
        type: 'low_stock_check',
        data: { storeId: item.storeId }
      });
    }

    logger.info(`Stock update processed: ${item.sku} ${action} ${quantity} at store ${item.storeId}`);

  } catch (error) {
    logger.error('Stock update failed:', error);
    throw error;
  }
};

const handleInventorySync = async (data) => {
  try {
    const { storeId, items } = data;

    let syncResults = {
      updated: 0,
      created: 0,
      errors: []
    };

    for (const itemData of items) {
      try {
        const existingItem = await Inventory.findOne({
          storeId,
          sku: itemData.sku
        });

        if (existingItem) {
          // Update existing item
          Object.assign(existingItem, itemData);
          await existingItem.save();
          syncResults.updated++;
        } else {
          // Create new item
          const newItem = new Inventory({
            ...itemData,
            storeId
          });
          await newItem.save();
          syncResults.created++;
        }
      } catch (error) {
        syncResults.errors.push({
          sku: itemData.sku,
          error: error.message
        });
      }
    }

    // Broadcast sync completion
    io.broadcastToStore(storeId, 'inventory_sync_completed', {
      storeId,
      results: syncResults,
      timestamp: new Date()
    });

    logger.info(`Inventory sync completed for store ${storeId}: ${syncResults.updated} updated, ${syncResults.created} created, ${syncResults.errors.length} errors`);

  } catch (error) {
    logger.error('Inventory sync failed:', error);
    throw error;
  }
};

const triggerAutoRestock = async (item) => {
  try {
    const restockQuantity = item.maxStock - item.quantity;
    
    // Add to restock queue
    const { inventoryQueue } = require('../config/queues.js').getQueues();
    await inventoryQueue.add('auto_restock', {
      type: 'auto_restock',
      data: {
        inventoryId: item._id,
        quantity: restockQuantity,
        reason: `Auto-restock triggered - critical stock level (${item.quantity})`
      }
    }, {
      delay: 5000 // 5 second delay to allow for manual intervention
    });

    logger.info(`Auto-restock triggered for ${item.sku}: ${restockQuantity} units`);

  } catch (error) {
    logger.error(`Failed to trigger auto-restock for ${item.sku}:`, error);
  }
};

// Notification functions
const sendLowStockNotification = async (manager, alert) => {
  logger.info(`Sending low stock notification to ${manager.email}: ${alert.critical} critical, ${alert.low} low stock items`);
  // Implement email/SMS notification logic
};

const sendRestockConfirmation = async (manager, item, quantity) => {
  logger.info(`Sending restock confirmation to ${manager.email}: ${item.name} (+${quantity})`);
  // Implement email notification logic
};

export { processInventoryQueue };