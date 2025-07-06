import { BaseAgent } from './BaseAgent.js';

export class StoreManagerAgent extends BaseAgent {
  constructor(llm = null) {
    super('store_manager_agent', llm);
    this.stores = this.initializeStores();
  }

  async process(state) {
    this.logAction('Assigning store for order');
    state.setCurrentAgent(this.name);

    try {
      const orderData = state.get().order;
      const inventoryItems = state.get().inventoryItems;

      if (!orderData || !inventoryItems) {
        return this.createErrorState(state, 'Missing order or inventory data');
      }

      // Assign optimal store using LLM
      const storeAssignment = await this.assignOptimalStore(orderData, inventoryItems);
      
      if (storeAssignment.success) {
        state.update({
          assignedStore: storeAssignment.store,
          order: {
            ...orderData,
            status: 'store_assigned'
          },
          nextAgent: 'route_agent'
        });

        this.createSuccessState(state, 'store_assigned', storeAssignment);
        this.logAction('Store assigned successfully', storeAssignment);
      } else {
        return this.createErrorState(state, `Store assignment failed: ${storeAssignment.reason}`);
      }

    } catch (error) {
      return this.createErrorState(state, `Store manager agent error: ${error.message}`);
    }

    return state;
  }

  async assignOptimalStore(orderData, inventoryItems) {
    const prompt = {
      system: `You are a store manager for a delivery platform. Your job is to assign the optimal store for order fulfillment.

Consider these factors:
1. Store proximity to delivery address
2. Inventory availability at each store
3. Store capacity and current workload
4. Store operating hours
5. Specialized items availability

Available stores:
${JSON.stringify(this.stores, null, 2)}

Return a JSON response with this format:
{
  "success": true/false,
  "store": {
    "id": "store_id",
    "name": "store_name",
    "address": "store_address",
    "manager": "manager_name"
  },
  "reasoning": "explanation of why this store was chosen",
  "estimatedPickupTime": "HH:MM"
}`,
      human: `Assign store for this order:
Order: ${JSON.stringify(orderData, null, 2)}
Available Items: ${JSON.stringify(inventoryItems, null, 2)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      
      if (result.error || !result.success) {
        return this.fallbackStoreAssignment(orderData, inventoryItems);
      }

      return result;
    } catch (error) {
      return this.fallbackStoreAssignment(orderData, inventoryItems);
    }
  }

  fallbackStoreAssignment(orderData, inventoryItems) {
    // Simple fallback: assign to store with most available items
    const storeItemCounts = {};
    
    for (const item of inventoryItems) {
      storeItemCounts[item.storeId] = (storeItemCounts[item.storeId] || 0) + 1;
    }

    const bestStoreId = Object.keys(storeItemCounts).reduce((a, b) => 
      storeItemCounts[a] > storeItemCounts[b] ? a : b
    );

    const store = this.stores.find(s => s.id === bestStoreId);
    
    if (!store) {
      return {
        success: false,
        reason: 'No suitable store found'
      };
    }

    return {
      success: true,
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        manager: store.manager
      },
      reasoning: `Assigned to ${store.name} based on item availability`,
      estimatedPickupTime: '30:00'
    };
  }

  initializeStores() {
    return [
      {
        id: 'STORE-001',
        name: 'Walmart Supercenter - Nashville',
        address: '100 Oaks Blvd, Nashville, TN 37204',
        manager: 'Sarah Johnson',
        location: { lat: 36.1627, lng: -86.7816 },
        status: 'active',
        operatingHours: '6:00 AM - 11:00 PM',
        capacity: 'high'
      },
      {
        id: 'STORE-002',
        name: 'Walmart Supercenter - Franklin',
        address: '3600 Mallory Ln, Franklin, TN 37067',
        manager: 'Mike Chen',
        location: { lat: 35.9254, lng: -86.8689 },
        status: 'active',
        operatingHours: '6:00 AM - 11:00 PM',
        capacity: 'medium'
      },
      {
        id: 'STORE-003',
        name: 'Walmart Supercenter - Murfreesboro',
        address: '2315 S Church St, Murfreesboro, TN 37127',
        manager: 'Lisa Rodriguez',
        location: { lat: 35.8456, lng: -86.3903 },
        status: 'maintenance',
        operatingHours: '6:00 AM - 11:00 PM',
        capacity: 'low'
      }
    ];
  }

  async getStoreStatus(storeId) {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) {
      return { error: 'Store not found' };
    }

    // Use LLM to analyze store performance
    const prompt = {
      system: `You are a store operations analyst. Analyze the store status and provide insights.

Consider:
1. Current operational status
2. Capacity utilization
3. Performance metrics
4. Recommendations for improvement

Return a JSON response with this format:
{
  "status": "active/maintenance/closed",
  "capacity": "high/medium/low",
  "performance": "excellent/good/fair/poor",
  "insights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"]
}`,
      human: `Analyze this store: ${JSON.stringify(store, null, 2)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      return result.error ? this.fallbackStoreStatus(store) : result;
    } catch (error) {
      return this.fallbackStoreStatus(store);
    }
  }

  fallbackStoreStatus(store) {
    return {
      status: store.status,
      capacity: store.capacity,
      performance: store.status === 'active' ? 'good' : 'fair',
      insights: [`Store is currently ${store.status}`, `Capacity level: ${store.capacity}`],
      recommendations: store.status === 'maintenance' ? ['Complete maintenance tasks', 'Update inventory systems'] : ['Continue current operations']
    };
  }

  getAllStores() {
    return this.stores;
  }

  getActiveStores() {
    return this.stores.filter(store => store.status === 'active');
  }
} 