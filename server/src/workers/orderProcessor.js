import Order from '../models/Order.js';
import User from '../models/User.js';
import Store from '../models/Store.js';
import { logger } from '../utils/logger.js';
import { io } from '../server.ts';

const processOrderQueue = async (job) => {
  const { orderId, type } = job.data;

  try {
    const order = await Order.findById(orderId)
      .populate('customerId', 'firstName lastName email')
      .populate('storeId', 'name address');

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    switch (type) {
      case 'new_order':
        await handleNewOrder(order);
        break;
      case 'status_update':
        await handleStatusUpdate(order, job.data);
        break;
      case 'payment_confirmation':
        await handlePaymentConfirmation(order);
        break;
      case 'route_optimization':
        await handleRouteOptimization(order);
        break;
      default:
        logger.warn(`Unknown order processing type: ${type}`);
    }

    logger.info(`Order processing completed: ${order.orderId} - ${type}`);

  } catch (error) {
    logger.error(`Order processing failed: ${orderId} - ${type}`, error);
    throw error;
  }
};

const handleNewOrder = async (order) => {
  try {
    // Send confirmation email to customer
    await sendOrderConfirmation(order);

    // Notify store manager
    await notifyStoreManager(order);

    // Broadcast real-time update
    io.broadcastToStore(order.storeId._id, 'new_order', {
      order: {
        id: order._id,
        orderId: order.orderId,
        customer: order.customerId.fullName,
        items: order.items.length,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt
      }
    });

    // Update store metrics
    const store = await Store.findById(order.storeId._id);
    if (store) {
      await store.updateMetrics({
        amount: order.totalAmount
      });
    }

    logger.info(`New order processed: ${order.orderId}`);

  } catch (error) {
    logger.error(`Failed to handle new order: ${order.orderId}`, error);
    throw error;
  }
};

const handleStatusUpdate = async (order, data) => {
  try {
    const { status, updatedBy } = data;

    // Send status update notification to customer
    await sendStatusUpdateNotification(order, status);

    // Broadcast real-time update to order subscribers
    io.broadcastToOrder(order._id, 'order_status_update', {
      orderId: order.orderId,
      status,
      timestamp: new Date(),
      updatedBy
    });

    // Handle specific status updates
    switch (status) {
      case 'confirmed':
        await handleOrderConfirmation(order);
        break;
      case 'shipped':
        await handleOrderShipped(order);
        break;
      case 'delivered':
        await handleOrderDelivered(order);
        break;
      case 'cancelled':
        await handleOrderCancelled(order);
        break;
    }

    logger.info(`Order status update processed: ${order.orderId} -> ${status}`);

  } catch (error) {
    logger.error(`Failed to handle status update: ${order.orderId}`, error);
    throw error;
  }
};

const handleOrderConfirmation = async (order) => {
  // Calculate estimated delivery time
  const estimatedDelivery = new Date();
  estimatedDelivery.setHours(estimatedDelivery.getHours() + 2); // 2 hours default

  order.estimatedDelivery = estimatedDelivery;
  await order.save();

  // Trigger route optimization
  const { orderQueue } = require('../config/queues.js').getQueues();
  await orderQueue.add('route_optimization', {
    orderId: order._id,
    type: 'route_optimization'
  });
};

const handleOrderShipped = async (order) => {
  // Start real-time tracking
  io.broadcastToOrder(order._id, 'tracking_started', {
    orderId: order.orderId,
    estimatedDelivery: order.estimatedDelivery,
    trackingUrl: `${process.env.CLIENT_URL}/track/${order.orderId}`
  });

  // Notify delivery agent
  if (order.deliveryAgentId) {
    const deliveryAgent = await User.findById(order.deliveryAgentId);
    if (deliveryAgent) {
      // Send notification to delivery agent
      logger.info(`Notifying delivery agent ${deliveryAgent.email} for order ${order.orderId}`);
    }
  }
};

const handleOrderDelivered = async (order) => {
  // Record actual delivery time
  order.actualDelivery = new Date();
  await order.save();

  // Send delivery confirmation
  await sendDeliveryConfirmation(order);

  // Update delivery metrics
  const deliveryTime = order.actualDelivery - order.createdAt;
  logger.info(`Order ${order.orderId} delivered in ${Math.round(deliveryTime / (1000 * 60))} minutes`);
};

const handleOrderCancelled = async (order) => {
  // Send cancellation notification
  await sendCancellationNotification(order);

  // Process refund if payment was completed
  if (order.payment.status === 'completed') {
    // Trigger refund process
    logger.info(`Processing refund for cancelled order: ${order.orderId}`);
  }
};

const handlePaymentConfirmation = async (order) => {
  order.payment.status = 'completed';
  order.status = 'confirmed';
  await order.save();

  // Trigger order confirmation process
  await handleOrderConfirmation(order);
};

const handleRouteOptimization = async (order) => {
  try {
    // Calculate optimal route (simplified implementation)
    const route = await calculateOptimalRoute(order);
    
    order.route = route;
    await order.save();

    // Broadcast route update
    io.broadcastToOrder(order._id, 'route_optimized', {
      orderId: order.orderId,
      route,
      estimatedDelivery: order.estimatedDelivery
    });

    logger.info(`Route optimized for order: ${order.orderId}`);

  } catch (error) {
    logger.error(`Route optimization failed for order: ${order.orderId}`, error);
    throw error;
  }
};

const calculateOptimalRoute = async (order) => {
  // Simplified route calculation
  // In production, integrate with Google Maps API or similar service
  
  const store = await Store.findById(order.storeId);
  const storeCoords = store.location.coordinates;
  const deliveryCoords = order.deliveryAddress.coordinates || [
    storeCoords[0] + (Math.random() - 0.5) * 0.1,
    storeCoords[1] + (Math.random() - 0.5) * 0.1
  ];

  const distance = calculateDistance(
    storeCoords[1], storeCoords[0],
    deliveryCoords[1], deliveryCoords[0]
  );

  return {
    waypoints: [
      {
        lat: storeCoords[1],
        lng: storeCoords[0],
        address: store.fullAddress
      },
      {
        lat: deliveryCoords[1],
        lng: deliveryCoords[0],
        address: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`
      }
    ],
    distance: Math.round(distance * 100) / 100,
    estimatedTime: Math.round(distance * 3), // 3 minutes per km
    optimizationMode: 'time'
  };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Notification functions (simplified - in production, integrate with email/SMS services)
const sendOrderConfirmation = async (order) => {
  logger.info(`Sending order confirmation to ${order.customerId.email} for order ${order.orderId}`);
  // Implement email sending logic
};

const sendStatusUpdateNotification = async (order, status) => {
  logger.info(`Sending status update (${status}) to ${order.customerId.email} for order ${order.orderId}`);
  // Implement notification logic
};

const sendDeliveryConfirmation = async (order) => {
  logger.info(`Sending delivery confirmation to ${order.customerId.email} for order ${order.orderId}`);
  // Implement email sending logic
};

const sendCancellationNotification = async (order) => {
  logger.info(`Sending cancellation notification to ${order.customerId.email} for order ${order.orderId}`);
  // Implement email sending logic
};

const notifyStoreManager = async (order) => {
  const storeManager = await User.findById(order.storeId.managerId);
  if (storeManager) {
    logger.info(`Notifying store manager ${storeManager.email} of new order ${order.orderId}`);
    // Implement notification logic
  }
};

export { processOrderQueue };