import { BaseAgent } from './BaseAgent.js';

export class CustomerAgent extends BaseAgent {
  constructor(llm = null) {
    super('customer_agent', llm);
  }

  async process(state) {
    this.logAction('Processing order request');
    state.setCurrentAgent(this.name);

    try {
      const orderData = state.get().order;
      if (!orderData) {
        return this.createErrorState(state, 'No order data provided');
      }

      // Validate order using LLM
      const validationResult = await this.validateOrder(orderData);
      
      if (validationResult.valid) {
        state.update({
          order: {
            ...orderData,
            status: 'validated',
            id: orderData.id || `ORD-${Date.now()}`
          },
          nextAgent: 'inventory_agent'
        });

        this.createSuccessState(state, 'order_validated', validationResult);
        this.logAction('Order validated successfully', validationResult);
      } else {
        return this.createErrorState(state, `Order validation failed: ${validationResult.reasons.join(', ')}`);
      }

    } catch (error) {
      return this.createErrorState(state, `Customer agent error: ${error.message}`);
    }

    return state;
  }

  async validateOrder(orderData) {
    const prompt = {
      system: `You are a customer service agent for a delivery platform.
Your job is to validate customer orders and ensure they meet requirements.

Validate the order for:
1. Required fields (items, delivery address, customer info)
2. Reasonable quantities (not more than 100 of any item)
3. Valid address format
4. Complete customer information

Return a JSON response with this exact format:
{
  "valid": true/false,
  "reasons": ["reason1", "reason2"] (only if valid is false),
  "suggestions": ["suggestion1", "suggestion2"] (optional improvements)
}`,
      human: `Validate this order: ${JSON.stringify(orderData, null, 2)}`
    };

    const result = await this.invokeLLMWithJSON(prompt);
    
    if (result.error) {
      // Fallback validation
      return this.fallbackValidation(orderData);
    }

    return result;
  }

  fallbackValidation(orderData) {
    const reasons = [];
    
    if (!orderData.items || orderData.items.length === 0) {
      reasons.push('No items specified');
    }
    
    if (!orderData.deliveryAddress) {
      reasons.push('Missing delivery address');
    }
    
    if (!orderData.customerId) {
      reasons.push('Missing customer ID');
    }

    // Check quantities
    if (orderData.items) {
      for (const item of orderData.items) {
        if (item.quantity > 100) {
          reasons.push(`Quantity too high for ${item.name}: ${item.quantity}`);
        }
      }
    }

    return {
      valid: reasons.length === 0,
      reasons,
      suggestions: []
    };
  }

  async handleCustomerQuery(query) {
    this.logAction('Handling customer query', { query });

    const prompt = {
      system: `You are a helpful customer service agent for a delivery platform.
Provide helpful, accurate responses to customer queries about orders, delivery, and general questions.
Keep responses concise and professional.`,
      human: `Customer query: ${query}`
    };

    try {
      const response = await this.invokeLLM(prompt);
      return {
        success: true,
        response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
} 