import { BaseAgent } from './BaseAgent';
import { AgentMessage, CustomerAgentState, CustomerAgentStateSchema, Order } from './types';

export class CustomerAgent extends BaseAgent {
  private state: CustomerAgentState;

  constructor() {
    super('customer-agent', 'customer');
    this.state = CustomerAgentStateSchema.parse({});
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];

    switch (message.type) {
      case 'order':
        responses.push(...await this.handleOrderRequest(message));
        break;
      case 'notification':
        responses.push(...await this.handleNotification(message));
        break;
      default:
        console.log(`[CustomerAgent] Unhandled message type: ${message.type}`);
    }

    return responses;
  }

  private async handleOrderRequest(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    
    try {
      // Parse natural language order request
      const orderIntent = await this.parseOrderIntent(message.content);
      
      if (orderIntent.items.length > 0) {
        // Check inventory availability
        responses.push(this.createResponse(
          'inventory-agent',
          'inventory',
          'Check stock availability for order',
          { items: orderIntent.items, storeId: orderIntent.storeId }
        ));
        
        // Update conversation history
        this.state.conversationHistory.push({
          role: 'user',
          content: message.content,
          timestamp: new Date()
        });
        
        this.state.conversationHistory.push({
          role: 'assistant',
          content: `I found ${orderIntent.items.length} items for your order. Checking availability...`,
          timestamp: new Date()
        });
      } else {
        responses.push(this.createResponse(
          message.from,
          'notification',
          "I couldn't understand your order. Could you please specify what items you'd like?",
          { requiresClarification: true }
        ));
      }
    } catch (error) {
      responses.push(this.createResponse(
        message.from,
        'notification',
        'Sorry, I encountered an error processing your order. Please try again.',
        { error: true }
      ));
    }

    return responses;
  }

  private async handleNotification(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    
    // Add to conversation history
    this.state.conversationHistory.push({
      role: 'assistant',
      content: message.content,
      timestamp: new Date()
    });

    // If this is an inventory response, create order
    if (message.from === 'inventory-agent' && message.data?.stockAvailable) {
      const order = await this.createOrder(message.data);
      
      responses.push(this.createResponse(
        'store-manager-agent',
        'order',
        `New order created: ${order.id}`,
        { order }
      ));
    }

    return responses;
  }

  private async parseOrderIntent(content: string): Promise<{
    items: Array<{ name: string; quantity: number }>;
    storeId: string;
  }> {
    // Simplified NLP parsing - in production, use a proper NLP service
    const items: Array<{ name: string; quantity: number }> = [];
    const lowercaseContent = content.toLowerCase();
    
    // Basic pattern matching for common items
    const patterns = [
      { pattern: /(\d+)?\s*(banana|bananas)/i, name: 'Organic Bananas', defaultQty: 3 },
      { pattern: /(\d+)?\s*(yogurt|greek yogurt)/i, name: 'Greek Yogurt', defaultQty: 2 },
      { pattern: /(\d+)?\s*(headphones|wireless headphones)/i, name: 'Wireless Headphones', defaultQty: 1 },
      { pattern: /(\d+)?\s*(milk)/i, name: 'Organic Milk', defaultQty: 1 },
      { pattern: /(\d+)?\s*(bread)/i, name: 'Whole Grain Bread', defaultQty: 1 }
    ];

    for (const { pattern, name, defaultQty } of patterns) {
      const match = lowercaseContent.match(pattern);
      if (match) {
        const quantity = match[1] ? parseInt(match[1]) : defaultQty;
        items.push({ name, quantity });
      }
    }

    return {
      items,
      storeId: 'STORE-001' // Default store for demo
    };
  }

  private async createOrder(data: any): Promise<Order> {
    const order: Order = {
      id: `ORD-${Date.now()}`,
      customerId: 'CUST-001',
      items: data.availableItems || [],
      status: 'pending',
      storeId: data.storeId || 'STORE-001',
      createdAt: new Date(),
      estimatedDelivery: new Date(Date.now() + 3600000) // 1 hour from now
    };

    this.state.currentOrder = order;
    return order;
  }

  getState(): CustomerAgentState {
    return this.state;
  }

  updateState(newState: CustomerAgentState): void {
    this.state = CustomerAgentStateSchema.parse(newState);
  }

  // Public method for handling chat input
  async handleChatInput(input: string): Promise<string> {
    const message: AgentMessage = {
      id: `msg-${Date.now()}`,
      from: 'user',
      to: this.agentId,
      type: 'order',
      content: input,
      timestamp: new Date(),
      status: 'sent'
    };

    const responses = await this.processMessage(message);
    
    // Return the first response content or a default message
    return responses.length > 0 
      ? responses[0].content 
      : "I'm processing your request. Please wait a moment...";
  }
}