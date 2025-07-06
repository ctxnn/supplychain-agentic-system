import { BaseAgent } from './BaseAgent.js';

export class NotificationAgent extends BaseAgent {
  constructor(llm = null) {
    super('notification_agent', llm);
    this.notificationHistory = [];
  }

  async process(state) {
    this.logAction('Sending order confirmation');
    state.setCurrentAgent(this.name);

    try {
      const orderData = state.get().order;
      const assignedDriver = state.get().assignedDriver;
      const optimizedRoute = state.get().optimizedRoute;

      if (!orderData) {
        return this.createErrorState(state, 'No order data for notification');
      }

      // Generate and send order confirmation
      const notificationResult = await this.sendOrderConfirmation(orderData, assignedDriver, optimizedRoute);
      
      if (notificationResult.success) {
        state.update({
          order: {
            ...orderData,
            status: 'confirmed'
          },
          workflowComplete: true
        });

        this.createSuccessState(state, 'order_confirmed', notificationResult);
        this.logAction('Order confirmation sent successfully', notificationResult);
      } else {
        return this.createErrorState(state, `Notification failed: ${notificationResult.reason}`);
      }

    } catch (error) {
      return this.createErrorState(state, `Notification agent error: ${error.message}`);
    }

    return state;
  }

  async sendOrderConfirmation(orderData, assignedDriver, optimizedRoute) {
    const prompt = {
      system: `You are a customer communication specialist for a delivery platform. Your job is to send order confirmation notifications.

Create a professional, friendly, and informative order confirmation message that includes:
1. Order confirmation and order ID
2. Delivery details and estimated time
3. Driver information and contact details
4. Order items and total
5. Delivery instructions and special notes

Tone: Professional, friendly, and reassuring
Length: 2-3 paragraphs maximum

Return a JSON response with this format:
{
  "success": true/false,
  "message": "full notification message",
  "subject": "email subject line",
  "priority": "high/medium/low",
  "channels": ["email", "sms", "push"],
  "estimatedDelivery": "2024-01-01T12:30:00Z"
}`,
      human: `Create order confirmation for:
Order: ${JSON.stringify(orderData, null, 2)}
Driver: ${JSON.stringify(assignedDriver, null, 2)}
Route: ${JSON.stringify(optimizedRoute, null, 2)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      
      if (result.error || !result.success) {
        return this.fallbackOrderConfirmation(orderData, assignedDriver, optimizedRoute);
      }

      // Store notification in history
      this.notificationHistory.push({
        orderId: orderData.id,
        type: 'order_confirmation',
        message: result.message,
        timestamp: new Date(),
        channels: result.channels
      });

      return result;
    } catch (error) {
      return this.fallbackOrderConfirmation(orderData, assignedDriver, optimizedRoute);
    }
  }

  fallbackOrderConfirmation(orderData, assignedDriver, optimizedRoute) {
    const estimatedDelivery = new Date(Date.now() + (optimizedRoute?.estimatedTime || 30) * 60 * 1000);
    
    const message = `Thank you for your order! 

Your order #${orderData.id} has been confirmed and is being prepared for delivery. ${assignedDriver ? `Your driver ${assignedDriver.name} will be picking up your order shortly.` : 'A driver will be assigned shortly.'}

Estimated delivery time: ${estimatedDelivery.toLocaleTimeString()}
Order total: $${this.calculateOrderTotal(orderData.items)}

We'll send you updates as your order progresses. Thank you for choosing our service!`;

    const result = {
      success: true,
      message,
      subject: `Order Confirmation - #${orderData.id}`,
      priority: 'high',
      channels: ['email', 'sms'],
      estimatedDelivery: estimatedDelivery.toISOString()
    };

    // Store notification in history
    this.notificationHistory.push({
      orderId: orderData.id,
      type: 'order_confirmation',
      message: result.message,
      timestamp: new Date(),
      channels: result.channels
    });

    return result;
  }

  async handleErrorNotification(state) {
    this.logAction('Handling error notification');
    
    try {
      const errorMessage = state.get().errorMessage;
      const orderData = state.get().order;

      const prompt = {
        system: `You are a customer service specialist handling order errors. Your job is to communicate errors professionally and provide solutions.

Create a helpful error notification that:
1. Acknowledges the issue professionally
2. Explains what went wrong (without technical jargon)
3. Provides next steps or alternatives
4. Offers customer support contact
5. Maintains a positive, helpful tone

Return a JSON response with this format:
{
  "success": true/false,
  "message": "error notification message",
  "subject": "email subject line",
  "priority": "high",
  "channels": ["email", "sms"],
  "nextSteps": ["step1", "step2"],
  "supportContact": "support information"
}`,
        human: `Create error notification for:
Error: ${errorMessage}
Order: ${JSON.stringify(orderData, null, 2)}`
      };

      try {
        const result = await this.invokeLLMWithJSON(prompt);
        
        if (result.error || !result.success) {
          return this.fallbackErrorNotification(errorMessage, orderData);
        }

        // Store notification in history
        this.notificationHistory.push({
          orderId: orderData?.id,
          type: 'error_notification',
          message: result.message,
          timestamp: new Date(),
          channels: result.channels
        });

        return result;
      } catch (error) {
        return this.fallbackErrorNotification(errorMessage, orderData);
      }
    } catch (error) {
      return {
        success: false,
        reason: `Error notification failed: ${error.message}`
      };
    }
  }

  fallbackErrorNotification(errorMessage, orderData) {
    const message = `We apologize, but we encountered an issue while processing your order.

Unfortunately, we were unable to complete your order at this time due to: ${errorMessage}

What you can do:
• Try placing your order again
• Contact our customer support at 1-800-DELIVERY
• Check our website for alternative items

We're working to resolve this issue and appreciate your patience. Thank you for your understanding.`;

    const result = {
      success: true,
      message,
      subject: `Order Issue - #${orderData?.id || 'Unknown'}`,
      priority: 'high',
      channels: ['email', 'sms'],
      nextSteps: [
        'Try placing your order again',
        'Contact customer support',
        'Check for alternative items'
      ],
      supportContact: '1-800-DELIVERY or support@delivery.com'
    };

    // Store notification in history
    this.notificationHistory.push({
      orderId: orderData?.id,
      type: 'error_notification',
      message: result.message,
      timestamp: new Date(),
      channels: result.channels
    });

    return result;
  }

  async sendStatusUpdate(orderId, status, additionalInfo = {}) {
    this.logAction('Sending status update', { orderId, status });

    const prompt = {
      system: `You are a delivery notification specialist. Create a status update message for customers.

The message should be:
1. Clear and informative
2. Professional but friendly
3. Include relevant details
4. Provide next steps if applicable

Return a JSON response with this format:
{
  "success": true/false,
  "message": "status update message",
  "subject": "email subject line",
  "priority": "medium",
  "channels": ["email", "sms", "push"]
}`,
      human: `Create status update for:
Order ID: ${orderId}
Status: ${status}
Additional Info: ${JSON.stringify(additionalInfo, null, 2)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      
      if (result.error || !result.success) {
        return this.fallbackStatusUpdate(orderId, status, additionalInfo);
      }

      // Store notification in history
      this.notificationHistory.push({
        orderId,
        type: 'status_update',
        message: result.message,
        timestamp: new Date(),
        channels: result.channels,
        status
      });

      return result;
    } catch (error) {
      return this.fallbackStatusUpdate(orderId, status, additionalInfo);
    }
  }

  fallbackStatusUpdate(orderId, status, additionalInfo) {
    const statusMessages = {
      'preparing': 'Your order is being prepared for pickup.',
      'picked_up': 'Your order has been picked up and is on its way!',
      'in_transit': 'Your order is in transit and will arrive soon.',
      'delivered': 'Your order has been delivered successfully!',
      'delayed': 'Your order has been delayed. We apologize for the inconvenience.'
    };

    const message = `Order #${orderId} Update: ${statusMessages[status] || 'Your order status has been updated.'}

${additionalInfo.message || ''}

Thank you for your patience!`;

    const result = {
      success: true,
      message,
      subject: `Order Update - #${orderId}`,
      priority: 'medium',
      channels: ['email', 'sms']
    };

    // Store notification in history
    this.notificationHistory.push({
      orderId,
      type: 'status_update',
      message: result.message,
      timestamp: new Date(),
      channels: result.channels,
      status
    });

    return result;
  }

  calculateOrderTotal(items) {
    if (!items || !Array.isArray(items)) return '0.00';
    return items.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  }

  getNotificationHistory(orderId = null) {
    if (orderId) {
      return this.notificationHistory.filter(n => n.orderId === orderId);
    }
    return this.notificationHistory;
  }

  async sendCustomNotification(recipient, message, channels = ['email']) {
    this.logAction('Sending custom notification', { recipient, channels });

    const notification = {
      recipient,
      message,
      channels,
      timestamp: new Date(),
      type: 'custom'
    };

    this.notificationHistory.push(notification);

    return {
      success: true,
      notification,
      message: 'Custom notification sent successfully'
    };
  }
} 