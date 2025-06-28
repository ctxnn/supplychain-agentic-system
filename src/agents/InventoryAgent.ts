import { BaseAgent } from './BaseAgent';
import { AgentMessage, InventoryAgentState, InventoryAgentStateSchema, InventoryItem } from './types';

export class InventoryAgent extends BaseAgent {
  private state: InventoryAgentState;
  private inventory: InventoryItem[] = [];

  constructor(initialInventory: InventoryItem[] = []) {
    super('inventory-agent', 'inventory');
    this.state = InventoryAgentStateSchema.parse({});
    this.inventory = initialInventory;
    
    // Start periodic inventory monitoring
    this.startInventoryMonitoring();
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];

    switch (message.type) {
      case 'inventory':
        responses.push(...await this.handleInventoryCheck(message));
        break;
      case 'order':
        responses.push(...await this.handleOrderInventoryUpdate(message));
        break;
      default:
        console.log(`[InventoryAgent] Unhandled message type: ${message.type}`);
    }

    return responses;
  }

  private async handleInventoryCheck(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    const { items, storeId } = message.data || {};

    if (!items || !storeId) {
      responses.push(this.createResponse(
        message.from,
        'notification',
        'Invalid inventory check request - missing items or store ID',
        { error: true }
      ));
      return responses;
    }

    const availableItems: any[] = [];
    const unavailableItems: any[] = [];

    for (const requestedItem of items) {
      const inventoryItem = this.inventory.find(
        item => item.storeId === storeId && 
                item.name.toLowerCase().includes(requestedItem.name.toLowerCase())
      );

      if (inventoryItem && inventoryItem.quantity >= requestedItem.quantity) {
        // Reserve the items
        inventoryItem.reserved += requestedItem.quantity;
        availableItems.push({
          sku: inventoryItem.sku,
          name: inventoryItem.name,
          quantity: requestedItem.quantity,
          price: inventoryItem.price
        });
      } else {
        unavailableItems.push(requestedItem);
      }
    }

    // Send response back to requesting agent
    responses.push(this.createResponse(
      message.from,
      'notification',
      availableItems.length > 0 
        ? `Found ${availableItems.length} available items`
        : 'No items available for this order',
      {
        stockAvailable: availableItems.length > 0,
        availableItems,
        unavailableItems,
        storeId
      }
    ));

    // Check for low stock and send alerts
    const lowStockAlerts = await this.checkLowStock(storeId);
    if (lowStockAlerts.length > 0) {
      responses.push(this.createResponse(
        'store-manager-agent',
        'notification',
        `Low stock alert: ${lowStockAlerts.length} items need restocking`,
        { lowStockItems: lowStockAlerts }
      ));
    }

    return responses;
  }

  private async handleOrderInventoryUpdate(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    const { order } = message.data || {};

    if (!order) {
      return responses;
    }

    // Update inventory based on order status
    if (order.status === 'confirmed') {
      // Convert reserved items to actual deductions
      for (const item of order.items) {
        const inventoryItem = this.inventory.find(
          inv => inv.sku === item.sku && inv.storeId === order.storeId
        );
        
        if (inventoryItem) {
          inventoryItem.quantity -= item.quantity;
          inventoryItem.reserved -= item.quantity;
        }
      }
    } else if (order.status === 'cancelled') {
      // Release reserved items
      for (const item of order.items) {
        const inventoryItem = this.inventory.find(
          inv => inv.sku === item.sku && inv.storeId === order.storeId
        );
        
        if (inventoryItem) {
          inventoryItem.reserved -= item.quantity;
        }
      }
    }

    return responses;
  }

  private async checkLowStock(storeId?: string): Promise<InventoryItem[]> {
    const lowStockItems = this.inventory.filter(item => {
      const matchesStore = !storeId || item.storeId === storeId;
      return matchesStore && item.quantity <= item.reorderPoint;
    });

    // Update state with low stock alerts
    this.state.lowStockAlerts = lowStockItems.map(item => item.sku);
    
    return lowStockItems;
  }

  private startInventoryMonitoring(): void {
    // Check inventory every 30 seconds
    setInterval(async () => {
      const lowStockItems = await this.checkLowStock();
      
      if (lowStockItems.length > 0) {
        // Create restock requests for critically low items
        for (const item of lowStockItems) {
          if (item.quantity <= 5) { // Critical threshold
            const existingRequest = this.state.restockRequests.find(
              req => req.sku === item.sku && req.storeId === item.storeId
            );

            if (!existingRequest) {
              this.state.restockRequests.push({
                sku: item.sku,
                storeId: item.storeId,
                quantity: item.maxStock - item.quantity,
                priority: item.quantity === 0 ? 'high' : 'medium',
                timestamp: new Date()
              });

              // Send auto-restock message
              await this.sendMessage(
                'store-manager-agent',
                'notification',
                `Auto-restock triggered for ${item.name} (SKU: ${item.sku})`,
                {
                  autoRestock: true,
                  item: item,
                  requestedQuantity: item.maxStock - item.quantity
                }
              );
            }
          }
        }
      }

      this.state.lastInventoryCheck = new Date();
    }, 30000);
  }

  // Public methods for external inventory management
  updateInventory(storeId: string, sku: string, quantity: number): void {
    const item = this.inventory.find(inv => inv.storeId === storeId && inv.sku === sku);
    if (item) {
      item.quantity = quantity;
    }
  }

  getInventoryForStore(storeId: string): InventoryItem[] {
    return this.inventory.filter(item => item.storeId === storeId);
  }

  getAllInventory(): InventoryItem[] {
    return this.inventory;
  }

  getState(): InventoryAgentState {
    return this.state;
  }

  updateState(newState: InventoryAgentState): void {
    this.state = InventoryAgentStateSchema.parse(newState);
  }
}