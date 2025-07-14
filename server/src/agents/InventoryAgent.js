import { BaseAgent } from './BaseAgent.js';

export class InventoryAgent extends BaseAgent {
  constructor(llm = null) {
    super('inventory_agent', llm);
    this.inventory = this.initializeInventory();
  }

  async process(state) {
    this.logAction('Checking inventory availability');
    state.setCurrentAgent(this.name);

    try {
      const orderData = state.get().order;
      if (!orderData || !orderData.items) {
        return this.createErrorState(state, 'No order items to check');
      }

      // Check inventory for each item
      const inventoryResult = await this.checkInventoryAvailability(orderData.items);
      
      if (inventoryResult.available) {
        state.update({
          inventoryAvailable: true,
          inventoryItems: inventoryResult.items,
          nextAgent: 'store_manager_agent'
        });

        this.createSuccessState(state, 'inventory_checked', inventoryResult);
        this.logAction('Inventory check completed', inventoryResult);
      } else {
        state.update({
          inventoryAvailable: false,
          inventoryItems: inventoryResult.items,
          nextAgent: 'error_handler'
        });

        this.createSuccessState(state, 'inventory_unavailable', inventoryResult);
        this.logAction('Inventory unavailable', inventoryResult);
      }

    } catch (error) {
      return this.createErrorState(state, `Inventory agent error: ${error.message}`);
    }

    return state;
  }

  async checkInventoryAvailability(requestedItems) {
    const availableItems = [];
    const unavailableItems = [];
    let allAvailable = true;

    for (const requestedItem of requestedItems) {
      const inventoryItem = this.findInventoryItem(requestedItem.sku);
      
      if (inventoryItem && inventoryItem.quantity >= requestedItem.quantity) {
        availableItems.push({
          sku: inventoryItem.sku,
          name: inventoryItem.name,
          availableQuantity: inventoryItem.quantity,
          requestedQuantity: requestedItem.quantity,
          storeId: inventoryItem.storeId,
          price: inventoryItem.price
        });
      } else {
        allAvailable = false;
        unavailableItems.push({
          sku: requestedItem.sku,
          name: requestedItem.name,
          requestedQuantity: requestedItem.quantity,
          availableQuantity: inventoryItem ? inventoryItem.quantity : 0,
          reason: inventoryItem ? 'Insufficient stock' : 'Item not found'
        });
      }
    }

    // Use LLM to analyze inventory patterns and suggest alternatives
    const analysis = await this.analyzeInventoryPatterns(requestedItems, availableItems, unavailableItems);

    return {
      available: allAvailable,
      items: availableItems,
      unavailableItems,
      analysis,
      totalItems: requestedItems.length,
      availableCount: availableItems.length
    };
  }

  async analyzeInventoryPatterns(requestedItems, availableItems, unavailableItems) {
    const prompt = {
      system: `You are an inventory management expert. Analyze the inventory check results and provide insights.

Consider:
1. Stock levels and availability
2. Potential alternatives for unavailable items
3. Restocking recommendations
4. Seasonal demand patterns

Return a JSON response with this format:
{
  "insights": ["insight1", "insight2"],
  "alternatives": [{"original": "item1", "suggestions": ["alt1", "alt2"]}],
  "restockRecommendations": ["rec1", "rec2"],
  "demandAnalysis": "analysis text"
}`,
      human: `Analyze this inventory check:
Requested: ${JSON.stringify(requestedItems)}
Available: ${JSON.stringify(availableItems)}
Unavailable: ${JSON.stringify(unavailableItems)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      return result.error ? this.fallbackAnalysis(requestedItems, availableItems, unavailableItems) : result;
    } catch (error) {
      return this.fallbackAnalysis(requestedItems, availableItems, unavailableItems);
    }
  }

  fallbackAnalysis(requestedItems, availableItems, unavailableItems) {
    return {
      insights: [
        `${availableItems.length} out of ${requestedItems.length} items are available`,
        unavailableItems.length > 0 ? 'Some items need restocking' : 'All items in stock'
      ],
      alternatives: unavailableItems.map(item => ({
        original: item.name,
        suggestions: ['Check similar products', 'Contact supplier for availability']
      })),
      restockRecommendations: unavailableItems.map(item => `Restock ${item.name} (SKU: ${item.sku})`),
      demandAnalysis: 'Standard inventory analysis completed'
    };
  }

  findInventoryItem(sku) {
    return this.inventory.find(item => item.sku === sku);
  }

  initializeInventory() {
    // Mock inventory data - in production, this would come from database
    return [
      { sku: 'SKU-001', name: 'Organic Bananas', quantity: 45, storeId: 'STORE-001', price: 2.99 },
      { sku: 'SKU-002', name: 'Greek Yogurt', quantity: 23, storeId: 'STORE-001', price: 5.99 },
      { sku: 'SKU-003', name: 'Wireless Headphones', quantity: 8, storeId: 'STORE-001', price: 129.99 },
      { sku: 'SKU-001', name: 'Organic Bananas', quantity: 32, storeId: 'STORE-002', price: 2.99 },
      { sku: 'SKU-003', name: 'Wireless Headphones', quantity: 12, storeId: 'STORE-002', price: 129.99 },
      { sku: 'SKU-004', name: 'Organic Milk', quantity: 15, storeId: 'STORE-001', price: 4.99 },
      { sku: 'SKU-005', name: 'Whole Grain Bread', quantity: 20, storeId: 'STORE-001', price: 3.99 }
    ];
  }

  updateInventory(sku, storeId, quantity) {
    const item = this.inventory.find(item => item.sku === sku && item.storeId === storeId);
    if (item) {
      item.quantity = quantity;
      this.logAction('Inventory updated', { sku, storeId, quantity });
    }
  }

  getInventoryForStore(storeId) {
    return this.inventory.filter(item => item.storeId === storeId);
  }

  getAllInventory() {
    return this.inventory;
  }
} 