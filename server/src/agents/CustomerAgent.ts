import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './BaseAgent.js';
import { 
  AgentMessage, 
  CustomerAgentState, 
  CustomerAgentStateSchema,
  MessageType,
  NLPAnalysis,
  Entity,
  Order
} from './types.js';
import { NLPService } from '../services/NLPService.js';

export class CustomerAgent extends BaseAgent {
  private state: CustomerAgentState = {
    conversationHistory: [],
    currentOrder: null,
    conversationState: 'idle',
    pendingAction: null,
    customerPreferences: {},
  };

  constructor() {
    super('customer-agent');
    this.state = CustomerAgentStateSchema.parse({
      conversationHistory: [],
      currentOrder: null,
      conversationState: 'idle',
      pendingAction: null,
      customerPreferences: {},
    });
  }

  // Implement abstract methods from BaseAgent
  // processMessage implementation is already defined in the BaseAgent class

  getState(): CustomerAgentState {
    return this.state;
  }

  updateState(newState: Partial<CustomerAgentState>): void {
    this.state = {
      ...this.state,
      ...newState,
      conversationHistory: [
        ...this.state.conversationHistory,
        ...(newState.conversationHistory || [])
      ]
    };
  }

  private createErrorResponse(to: string, message: string): AgentMessage {
    return {
      id: uuidv4(),
      from: this.name,
      to,
      type: 'error',
      content: message,
      timestamp: new Date(),
      status: 'sent',
      data: {}
    };
  }

  protected createResponse(
    to: string, 
    type: MessageType, 
    content: string, 
    data: Record<string, unknown> = {}
  ): AgentMessage {
    return {
      id: uuidv4(),
      from: this.name,
      to,
      type,
      content,
      timestamp: new Date(),
      status: 'sent',
      data
    };
  }

  protected createAgentMessage(
    to: string, 
    type: MessageType, 
    content: string, 
    data: Record<string, unknown> = {}
  ): AgentMessage {
    return {
      id: uuidv4(),
      from: this.name,
      to,
      type,
      content,
      timestamp: new Date(),
      status: 'sent',
      data
    };
  }

  private async handleInventoryQuery(
    message: AgentMessage, 
    _analysis: NLPAnalysis
  ): Promise<AgentMessage[]> {
    void _analysis;
    const responses: AgentMessage[] = [];
    
    // Forward to inventory agent
    responses.push(this.createAgentMessage(
      'inventory-agent',
      'inventory-query',
      message.content,
    ));
    
    return responses;
  }

  private async parseOrderIntent(
    _content: string, 
    analysis: NLPAnalysis
  ): Promise<{
    items: Array<{ 
      name: string; 
      quantity: number; 
      metadata?: Record<string, unknown> 
    }>;
    storeId: string;
  }> {
    const items: Array<{ name: string; quantity: number; metadata?: Record<string, unknown> }> = [];

    const productEntities = analysis.entities.filter((e: Entity) => e.type === 'product');
    const quantityEntities = analysis.entities.filter((e: Entity) => e.type === 'quantity');

    productEntities.forEach((product: Entity, index: number) => {
      const quantityValue = quantityEntities[index]?.value;
      const quantity = quantityValue ? parseInt(quantityValue, 10) : 0; // Default to 0 to trigger clarification
      items.push({
        name: product.value.charAt(0).toUpperCase() + product.value.slice(1),
        quantity: quantity,
        metadata: { source: 'nlp', ...product.metadata }
      });
    });

    return {
      items,
      storeId: 'STORE-001' // Default store for demo
    };
  }

  private async handleGeneralQuery(
    message: AgentMessage, 
    _analysis: any // Prefix with _ to indicate intentionally unused
  ): Promise<AgentMessage[]> {
    void _analysis;
    // For now, just echo back with a generic response
    return [this.createResponse(
      message.from,
      'response',
      `I understand you're asking about: ${message.content}. How can I assist you further?`
    )];
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    
    try {
      // Analyze the message with NLP
      const analysis = NLPService.analyzeText(message.content);
      
      // Log the analysis for debugging
      console.log(`[CustomerAgent] NLP Analysis:`, analysis);
      
      // Route based on detected intent
      switch (analysis.intent) {
        case 'ORDER':
        case 'CANCEL_ORDER':
        case 'MODIFY_ORDER':
          responses.push(...await this.handleOrderRequest(message, analysis));
          break;
        case 'QUERY_INVENTORY':
        responses.push(...await this.handleInventoryQuery(message, analysis));
        break;
      case 'PROVIDE_DETAILS':
        responses.push(...await this.handleProvideDetails(message, analysis));
        break;
        case 'TRACK_ORDER':
          responses.push(...await this.handleOrderTracking(message, analysis));
          break;
        default:
          responses.push(...await this.handleGeneralQuery(message, analysis));
      }
      
      // Update conversation history
      this.state.conversationHistory.push({
        role: 'user',
        content: message.content,
        timestamp: new Date(),
        metadata: { analysis }
      });
      
    } catch (error: any) {
      console.error('[CustomerAgent] Error processing message:', error);
      responses.push(this.createErrorResponse(
        message.from,
        'I encountered an error processing your request. Please try again.'
      ));
    }
    
    return responses;
  }

  private async handleOrderTracking(
    message: AgentMessage,
    analysis: NLPAnalysis
  ): Promise<AgentMessage[]> {
    const orderId = analysis.entities.find((e: any) => e.type === 'order_id')?.value;

    if (!orderId) {
      return [this.createErrorResponse(message.from, 'No order ID was specified.')];
    }

    try {
      const orderStatus = await this.getOrderStatus(orderId);
      const responseContent = `The status of order #${orderId} is: ${orderStatus}.`;
      
      return [this.createResponse(message.from, 'order-status' as MessageType, responseContent, { orderId, orderStatus })];
    } catch (error: any) {
      console.error(`[CustomerAgent] Error fetching order status for orderId: ${orderId}`, error);
      return [this.createErrorResponse(message.from, `Could not retrieve status for order #${orderId}.`)];
    }
  }

  private async getOrderStatus(orderId: string): Promise<string> {
    // In a real application, this would involve a database lookup or an API call to an order management system.
    // For this example, we'll simulate a few possible statuses based on the orderId.
    const mockStatuses = ['Shipped', 'Processing', 'Delivered', 'Cancelled'];
    
    // Simple hash function to get a deterministic index from the orderId
    let hash = 0;
    for (let i = 0; i < orderId.length; i++) {
      const char = orderId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    
    const index = Math.abs(hash) % mockStatuses.length;
    const status = mockStatuses[index];
    
    return Promise.resolve(status);
  }

  private async handleProvideDetails(
    message: AgentMessage,
    analysis: NLPAnalysis
  ): Promise<AgentMessage[]> {
    if (this.state.conversationState === 'awaiting_quantity' && this.state.pendingAction) {
      const quantityValue = analysis.entities.find((e: any) => e.type === 'quantity')?.value ?? '1';
      const quantity = parseInt(quantityValue, 10);
      const items = this.state.pendingAction.items.map((item: any) => ({ ...item, quantity }));

      this.state.conversationState = 'processing';
      this.state.pendingAction = null;

      const inventoryMessage = this.createResponse(
        'inventory-agent',
        'inventory-query',
        'Check stock availability for order',
        { items, storeId: 'STORE-001', originalMessage: message.content, sender: message.from }
      );
      const userMessage = this.createResponse(
        message.from,
        'response',
        `Got it. Checking availability for ${quantity} of ${items[0].name}...`,
        { action: 'order_processing' }
      );
      return [inventoryMessage, userMessage];
    }
    return [this.createResponse(message.from, 'response', "I'm not sure what details you're providing. Can you clarify?")];
  }

  private async handleOrderRequest(
    message: AgentMessage,
    analysis: NLPAnalysis
  ): Promise<AgentMessage[]> {
  const responses: AgentMessage[] = [];
  try {
    // Handle order modification
    if (analysis.intent === 'MODIFY_ORDER') {
      return this.handleOrderModification(message, analysis);
    }
    // Parse natural language order request
    const orderIntent = await this.parseOrderIntent(message.content, analysis);
    if (orderIntent.items && orderIntent.items.length > 0) {
        // Validate items before proceeding
        const validItems = orderIntent.items.filter(item => 
          item && 
          typeof item.name === 'string' && 
          item.name.trim() !== '' &&
          typeof item.quantity === 'number' && 
          item.quantity > 0
        );

        if (validItems.length === 0) {
          throw new Error('No valid items found in the order');
        }

        // Update order intent with validated items
        orderIntent.items = validItems;
        
        // If quantity is missing for any item, ask for it.
        const itemsWithoutQuantity = validItems.filter(item => !item.quantity || item.quantity === 0);

        if (itemsWithoutQuantity.length > 0) {
          this.state.conversationState = 'awaiting_quantity';
          this.state.pendingAction = { type: 'complete_order', items: itemsWithoutQuantity };
          return [this.createResponse(
            message.from,
            'response',
            `How many ${itemsWithoutQuantity.map(i => i.name).join(', ')} would you like to order?`,
            { requiresClarification: true }
          )];
        }

        // Check inventory availability
        responses.push(this.createResponse(
          'inventory-agent',
          'inventory-query',
          'Check stock availability for order',
          { 
            items: orderIntent.items, 
            storeId: orderIntent.storeId,
            originalMessage: message.content,
            sender: message.from
          }
        ));
        
        // Update conversation history
        this.state.conversationHistory.push({
          role: 'user',
          content: message.content,
          timestamp: new Date(),
          metadata: { intent: 'ORDER', items: orderIntent.items }
        });
        
        const itemList = orderIntent.items.map(item => 
          `${item.quantity}x ${item.name}`
        ).join(', ');
        
        responses.push(this.createResponse(
          message.from,
          'response',
          `I've found ${orderIntent.items.length} item(s) in your order: ${itemList}. Checking availability...`,
          { 
            action: 'order_processing',
            items: orderIntent.items,
            requiresConfirmation: true
          }
        ));
      } else {
        // If we couldn't identify items, ask for clarification
        responses.push(this.createResponse(
          message.from,
          'response',  // Changed from 'notification' to 'response' to match MessageType
          "I couldn't understand what you'd like to order. Could you please specify the items and quantities? For example: 'I'd like to order 2 bananas and a yogurt'",
          { 
            requiresClarification: true,
            suggestions: [
              'Order 2 bananas',
              'I want a yogurt',
              'Get me some milk and eggs'
            ]
          }
        ));
      }
    } catch (error: any) {
      console.error('Error processing order request:', error);
      responses.push(this.createResponse(
        message.from,
        'notification',
        'Sorry, I encountered an error processing your order. Please try again or contact support if the issue persists.',
        { 
          error: true,
          errorDetails: error instanceof Error ? error.message : 'Unknown error'
        }
      ));
    }

    return responses;
  }
  
  private async handleOrderCancellation(
    message: AgentMessage,
    analysis: NLPAnalysis
  ): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    const orderIdEntity = analysis.entities.find((e: any) => e.type === 'order_id');
    
    if (orderIdEntity) {
      // Forward cancellation to order agent
      responses.push(this.createResponse(
        'order-agent',
        'cancel_order',
        `Cancel order ${orderIdEntity.value}`,
        { 
          orderId: orderIdEntity.value,
          reason: 'Customer requested cancellation',
          requester: message.from
        }
      ));
      
      // Add to conversation history
      this.state.conversationHistory.push({
        role: 'user',
        content: message.content,
        timestamp: new Date(),
        metadata: { intent: 'CANCEL_ORDER', orderId: orderIdEntity.value }
      });
      
      responses.push(this.createResponse(
        message.from,
        'notification',
        `I've requested to cancel order ${orderIdEntity.value}. You'll receive a confirmation once it's processed.`,
        { action: 'order_cancellation_requested' }
      ));
    } else if (this.state.currentOrder) {
      // If no order ID specified but we have a current order in context
      responses.push(this.createResponse(
        'order-agent',
        'cancel_order',
        `Cancel order ${this.state.currentOrder.id}`,
        { 
          orderId: this.state.currentOrder.id,
          reason: 'Customer requested cancellation',
          requester: message.from
        }
      ));
      
      responses.push(this.createResponse(
        message.from,
        'notification',
        `I've requested to cancel your current order (${this.state.currentOrder.id}).`,
        { action: 'order_cancellation_requested' }
      ));
    } else {
      // No order ID in message and no current order in context
      responses.push(this.createResponse(
        message.from,
        'notification',
        'I need to know which order you want to cancel. Please provide the order number or say "cancel my last order".',
        { requiresClarification: true }
      ));
    }
    
    return responses;
  }
  
  private async handleOrderModification(
    message: AgentMessage,
    analysis: NLPAnalysis
  ): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    const modification = analysis.entities.find(e => e.type === 'modification');
    const orderIdEntity = analysis.entities.find(e => e.type === 'order_id');
    const orderId = orderIdEntity?.value || this.state.currentOrder?.id;
    
    if (!orderId) {
      responses.push(this.createResponse(
        message.from,
        'notification',
        'I need to know which order you want to modify. Please provide the order number or specify the items you want to change.',
        { requiresClarification: true }
      ));
      return responses;
    }
    
    // Parse the items to be modified
    const orderIntent = await this.parseOrderIntent(message.content, analysis);
    
    if (orderIntent.items.length === 0) {
      responses.push(this.createResponse(
        message.from,
        'notification',
        'I need to know what changes you want to make to your order. For example: "Add 2 more bananas" or "Remove the yogurt from my order".',
        { requiresClarification: true }
      ));
      return responses;
    }
    
    // Forward modification to order agent
    responses.push(this.createResponse(
      'order-agent',
      'modify_order',
      `Modify order ${orderId}`,
      {
        orderId,
        modificationType: modification?.value || 'update',
        items: orderIntent.items,
        requester: message.from,
        originalMessage: message.content
      }
    ));
    
    // Add to conversation history
    this.state.conversationHistory.push({
      role: 'user',
      content: message.content,
      timestamp: new Date(),
      metadata: { 
        intent: 'MODIFY_ORDER', 
        orderId,
        modification: modification?.value,
        items: orderIntent.items 
      }
    });
    
    responses.push(this.createResponse(
      message.from,
      'notification',
      `I've requested to modify order ${orderId}. You'll receive a confirmation once the changes are processed.`,
      { action: 'order_modification_requested' }
    ));
    
    return responses;
  }

  private async createOrder(orderData: {
    customerId?: string;
    items?: Array<{ name: string; quantity: number; price?: number; sku?: string }>;
    availableItems?: Array<{ name: string; quantity: number; price?: number; sku?: string }>;
    storeId?: string;
    estimatedDelivery?: Date;
  } = {}): Promise<{order: Order; message: AgentMessage}> {
    try {
      // Validate input data
      if (!orderData.items?.length && !orderData.availableItems?.length) {
        throw new Error('No items provided for order');
      }

      // Use availableItems if present (from inventory check), otherwise use items
      const orderItems = orderData.availableItems || orderData.items || [];
      
      // Validate each item
      const validatedItems = orderItems.map((item, index) => {
        if (!item || typeof item !== 'object') {
          throw new Error(`Invalid item at index ${index}: must be an object`);
        }
        if (typeof item.name !== 'string' || item.name.trim() === '') {
          throw new Error(`Invalid item name at index ${index}: must be a non-empty string`);
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          throw new Error(`Invalid quantity for item '${item.name}': must be a positive number`);
        }
        return {
          sku: item.sku || `ITEM-${item.name.toUpperCase().replace(/\s+/g, '-')}`,
          name: item.name.trim(),
          quantity: item.quantity,
          price: typeof item.price === 'number' ? item.price : 0
        };
      });

      const order: Order = {
        id: `ORD-${Date.now()}`,
        customerId: orderData.customerId || 'CUST-001',
        items: validatedItems,
        status: 'pending',
        storeId: orderData.storeId || 'STORE-001',
        createdAt: new Date(),
        estimatedDelivery: orderData.estimatedDelivery || new Date(Date.now() + 3600000) // 1 hour from now
      };

      // Update state
      this.state.currentOrder = order;

      // Create order message for the order agent
      const orderMessage = this.createResponse(
        'order-agent',
        'order',
        `New order created: ${order.id}`,
        { order }
      );

      return { order, message: orderMessage };
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleNotification(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    
    try {
      // Validate message data
      if (!message || typeof message !== 'object') {
        throw new Error('Invalid notification message');
      }

      // Add to conversation history with proper typing
      const historyEntry = {
        role: 'assistant' as const,
        content: message.content || '',
        timestamp: new Date(),
        metadata: { 
          source: 'notification', 
          from: message.from,
          ...(message.data && { data: message.data })
        }
      };
      
      this.state.conversationHistory.push(historyEntry);
      
      // Handle different types of notifications with proper type guards
      if (message.from === 'inventory-agent' && message.data) {
        const { data } = message;
        
        // Handle stock availability notification
        if (data.stockAvailable) {
          try {
            // Validate required fields with proper type checking
            const items = data.availableItems || data.items || [];
            if (!Array.isArray(items) || items.length === 0) {
              throw new Error('No valid items provided in stock availability notification');
            }
            
            // Create the order with validated data
            const { order, message: orderMessage } = await this.createOrder({
              ...data,
              customerId: typeof data.customerId === 'string' ? data.customerId : 'CUST-001',
              storeId: typeof data.storeId === 'string' ? data.storeId : 'STORE-001',
              items: items.map(item => ({
                name: String(item?.name || ''),
                quantity: Number(item?.quantity || 1),
                price: typeof item?.price === 'number' ? item.price : undefined,
                sku: typeof item?.sku === 'string' ? item.sku : undefined
              }))
            });
            
            responses.push(orderMessage);
            
            // Get the original sender with type safety
            const originalSender = typeof data.originalSender === 'string' 
              ? data.originalSender 
              : 'user';
              
            responses.push(this.createResponse(
              originalSender,
              'response',
              `Your order has been placed successfully! Order ID: ${order.id}`,
              { 
                orderId: order.id,
                status: 'success',
                timestamp: new Date().toISOString(),
                notificationType: 'order_confirmation'
              }
            ));
          } catch (error) {
            console.error('Error processing inventory notification:', error);
            responses.push(this.createErrorResponse(
              'user',
              'Sorry, there was an error processing your order. Please try again.'
            ));
          }
        } 
        // Handle out of stock notification
        else if (data.outOfStock) {
          const sender = typeof data.originalSender === 'string' ? data.originalSender : 'user';
          responses.push(this.createResponse(
            sender,
            'response',  // Using 'response' as it's a valid MessageType
            'Some items in your order are out of stock. Please modify your order and try again.',
            { 
              requiresAction: true,
              notificationType: 'out_of_stock',
              outOfStockItems: Array.isArray(data.items) ? data.items : []
            }
          ));
        }
      } 
      // Handle order status updates
      else if (message.from === 'order-agent' && message.data?.orderStatus) {
        const { data } = message;
        responses.push(this.createResponse(
          'user',
          'response',  // Using 'response' as it's a valid MessageType
          `Order status updated: ${data.orderStatus}`,
          { 
            orderId: typeof data.orderId === 'string' ? data.orderId : 'unknown',
            status: data.orderStatus,
            notificationType: 'order_status_update',
            timestamp: new Date().toISOString()
          }
        ));
      }
      
      return responses;
    } catch (error) {
      console.error('Error in handleNotification:', error);
      return [
        this.createErrorResponse(
          'user',
          'An unexpected error occurred while processing your notification.'
        )
      ];
    }
  }

  /**
   * Handles incoming chat input from users and processes it through the agent system
   * @param input The user's input message
   * @returns A promise that resolves to the response message
   * @throws {Error} If input validation fails or processing encounters an error
   */
  async handleChatInput(input: unknown): Promise<string> {
    // Input validation with type narrowing
    if (typeof input !== 'string' || input.trim() === '') {
      throw new Error('Invalid input: Input must be a non-empty string');
    }
    
    const trimmedInput = input.trim();
    
    try {
      // Create a properly typed and validated message object
      const message: AgentMessage = {
        id: `msg-${Date.now()}`,
        from: 'user',
        to: this.agentId,
        type: 'order',
        content: trimmedInput,
        timestamp: new Date(),
        status: 'sent',
        data: {}
      };

      // Add user message to conversation history
      this.state.conversationHistory.push({
        role: 'user',
        content: trimmedInput,
        timestamp: new Date(),
        metadata: { source: 'user-input' }
      });

      // Process the message through the agent system
      let responses: AgentMessage[] = [];
      try {
        const result = await this.processMessage(message);
        responses = Array.isArray(result) ? result : [];
      } catch (processError) {
        console.error('Error in processMessage:', processError);
        throw new Error('Failed to process message');
      }
      
      // Validate and extract response content
      if (!Array.isArray(responses) || responses.length === 0) {
        return "I'm processing your request. Please wait a moment...";
      }
      
      // Get the first valid response
      const firstResponse = responses[0];
      if (!firstResponse || typeof firstResponse.content !== 'string') {
        throw new Error('Invalid response format from processMessage');
      }
      
      const responseContent = firstResponse.content.trim();
      if (!responseContent) {
        throw new Error('Empty response content');
      }
      
      // Add assistant response to conversation history
      this.state.conversationHistory.push({
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        metadata: { 
          source: 'response',
          ...(firstResponse.data && { data: firstResponse.data })
        }
      });
      
      return responseContent;
    } catch (error) {
      console.error('Error processing chat input:', error);
      return "I'm sorry, I encountered an error while processing your request. Please try again.";
    }
  }
}