import User from '../models/User.js';
import Order from '../models/Order.js';
import { logger } from '../utils/logger.js';
import { io } from '../server.js';

const processNotificationQueue = async (job) => {
  const { type, data } = job.data;

  try {
    switch (type) {
      case 'order_notification':
        await handleOrderNotification(data);
        break;
      case 'inventory_alert':
        await handleInventoryAlert(data);
        break;
      case 'delivery_update':
        await handleDeliveryUpdate(data);
        break;
      case 'system_alert':
        await handleSystemAlert(data);
        break;
      case 'bulk_notification':
        await handleBulkNotification(data);
        break;
      default:
        logger.warn(`Unknown notification type: ${type}`);
    }

    logger.info(`Notification processed: ${type}`);

  } catch (error) {
    logger.error(`Notification processing failed: ${type}`, error);
    throw error;
  }
};

const handleOrderNotification = async (data) => {
  try {
    const { orderId, userId, message, notificationType } = data;

    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const notification = {
      id: `notif_${Date.now()}`,
      type: notificationType,
      title: getNotificationTitle(notificationType),
      message,
      orderId,
      timestamp: new Date(),
      read: false
    };

    // Send real-time notification via Socket.IO
    const userConnection = io.getConnectedUsers().get(userId);
    if (userConnection) {
      io.to(userConnection.socketId).emit('notification', notification);
    }

    // Send email notification if user preferences allow
    if (user.preferences.notifications.email) {
      await sendEmailNotification(user, notification);
    }

    // Send push notification if user preferences allow
    if (user.preferences.notifications.push) {
      await sendPushNotification(user, notification);
    }

    logger.info(`Order notification sent to ${user.email}: ${notificationType}`);

  } catch (error) {
    logger.error('Order notification failed:', error);
    throw error;
  }
};

const handleInventoryAlert = async (data) => {
  try {
    const { storeId, items, alertType } = data;

    // Find store managers for the store
    const storeManagers = await User.find({
      role: 'store_manager',
      storeId,
      isActive: true
    });

    const notification = {
      id: `inv_alert_${Date.now()}`,
      type: 'inventory_alert',
      title: `Inventory Alert - ${alertType}`,
      message: `${items.length} items require attention`,
      storeId,
      items,
      timestamp: new Date(),
      read: false
    };

    // Send to all store managers
    for (const manager of storeManagers) {
      const userConnection = io.getConnectedUsers().get(manager._id.toString());
      if (userConnection) {
        io.to(userConnection.socketId).emit('notification', notification);
      }

      // Send email if critical
      if (alertType === 'critical' && manager.preferences.notifications.email) {
        await sendEmailNotification(manager, notification);
      }
    }

    // Broadcast to store-specific room
    io.broadcastToStore(storeId, 'inventory_alert', notification);

    logger.info(`Inventory alert sent for store ${storeId}: ${alertType} - ${items.length} items`);

  } catch (error) {
    logger.error('Inventory alert failed:', error);
    throw error;
  }
};

const handleDeliveryUpdate = async (data) => {
  try {
    const { orderId, customerId, deliveryAgentId, status, location } = data;

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const notification = {
      id: `delivery_${Date.now()}`,
      type: 'delivery_update',
      title: 'Delivery Update',
      message: getDeliveryMessage(status),
      orderId,
      status,
      location,
      timestamp: new Date(),
      read: false
    };

    // Notify customer
    if (customerId) {
      const customerConnection = io.getConnectedUsers().get(customerId);
      if (customerConnection) {
        io.to(customerConnection.socketId).emit('notification', notification);
      }
    }

    // Broadcast to order tracking room
    io.broadcastToOrder(orderId, 'delivery_update', notification);

    logger.info(`Delivery update sent for order ${order.orderId}: ${status}`);

  } catch (error) {
    logger.error('Delivery update failed:', error);
    throw error;
  }
};

const handleSystemAlert = async (data) => {
  try {
    const { message, severity, targetRoles, storeId } = data;

    const notification = {
      id: `system_${Date.now()}`,
      type: 'system_alert',
      title: `System Alert - ${severity.toUpperCase()}`,
      message,
      severity,
      timestamp: new Date(),
      read: false
    };

    // Send to specific roles
    if (targetRoles && targetRoles.length > 0) {
      for (const role of targetRoles) {
        io.broadcastToRole(role, 'system_alert', notification);
      }
    }

    // Send to specific store if provided
    if (storeId) {
      io.broadcastToStore(storeId, 'system_alert', notification);
    }

    // Send email for critical alerts
    if (severity === 'critical') {
      const adminUsers = await User.find({ role: 'admin', isActive: true });
      for (const admin of adminUsers) {
        if (admin.preferences.notifications.email) {
          await sendEmailNotification(admin, notification);
        }
      }
    }

    logger.info(`System alert sent: ${severity} - ${message}`);

  } catch (error) {
    logger.error('System alert failed:', error);
    throw error;
  }
};

const handleBulkNotification = async (data) => {
  try {
    const { userIds, message, title, type } = data;

    const notification = {
      id: `bulk_${Date.now()}`,
      type: type || 'general',
      title: title || 'Notification',
      message,
      timestamp: new Date(),
      read: false
    };

    let sentCount = 0;

    for (const userId of userIds) {
      try {
        const userConnection = io.getConnectedUsers().get(userId);
        if (userConnection) {
          io.to(userConnection.socketId).emit('notification', notification);
          sentCount++;
        }
      } catch (error) {
        logger.error(`Failed to send notification to user ${userId}:`, error);
      }
    }

    logger.info(`Bulk notification sent to ${sentCount}/${userIds.length} users`);

  } catch (error) {
    logger.error('Bulk notification failed:', error);
    throw error;
  }
};

// Helper functions
const getNotificationTitle = (type) => {
  const titles = {
    order_created: 'Order Confirmed',
    order_shipped: 'Order Shipped',
    order_delivered: 'Order Delivered',
    order_cancelled: 'Order Cancelled',
    payment_confirmed: 'Payment Confirmed',
    payment_failed: 'Payment Failed'
  };
  return titles[type] || 'Order Update';
};

const getDeliveryMessage = (status) => {
  const messages = {
    picked_up: 'Your order has been picked up and is on the way',
    in_transit: 'Your order is in transit',
    out_for_delivery: 'Your order is out for delivery',
    delivered: 'Your order has been delivered',
    delivery_attempted: 'Delivery was attempted but unsuccessful',
    returned_to_depot: 'Order returned to depot'
  };
  return messages[status] || 'Delivery status updated';
};

// Email notification (simplified - integrate with SendGrid, AWS SES, etc.)
const sendEmailNotification = async (user, notification) => {
  try {
    // This is a placeholder - implement with your email service
    logger.info(`Email notification would be sent to ${user.email}: ${notification.title}`);
    
    // Example integration with email service:
    // await emailService.send({
    //   to: user.email,
    //   subject: notification.title,
    //   template: 'notification',
    //   data: {
    //     user: user.firstName,
    //     message: notification.message,
    //     timestamp: notification.timestamp
    //   }
    // });

  } catch (error) {
    logger.error(`Email notification failed for ${user.email}:`, error);
  }
};

// Push notification (simplified - integrate with FCM, APNS, etc.)
const sendPushNotification = async (user, notification) => {
  try {
    // This is a placeholder - implement with your push service
    logger.info(`Push notification would be sent to ${user.email}: ${notification.title}`);
    
    // Example integration with push service:
    // await pushService.send({
    //   userId: user._id,
    //   title: notification.title,
    //   body: notification.message,
    //   data: {
    //     type: notification.type,
    //     orderId: notification.orderId
    //   }
    // });

  } catch (error) {
    logger.error(`Push notification failed for ${user.email}:`, error);
  }
};

export { processNotificationQueue };