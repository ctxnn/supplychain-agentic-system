import { z } from 'zod';

// Define the state schema using Zod
export const AgentStateSchema = z.object({
  // Order information
  order: z.object({
    id: z.string().optional(),
    customerId: z.string().optional(),
    items: z.array(z.object({
      sku: z.string(),
      name: z.string(),
      quantity: z.number(),
      price: z.number()
    })).optional(),
    deliveryAddress: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string()
    }).optional(),
    status: z.enum(['pending', 'validated', 'inventory_checked', 'store_assigned', 'route_optimized', 'driver_assigned', 'confirmed', 'error']).default('pending'),
    createdAt: z.date().optional()
  }).optional(),

  // Agent tracking
  currentAgent: z.string().optional(),
  nextAgent: z.string().optional(),
  workflowComplete: z.boolean().default(false),
  errorOccurred: z.boolean().default(false),
  errorMessage: z.string().optional(),

  // Inventory information
  inventoryAvailable: z.boolean().default(false),
  inventoryItems: z.array(z.object({
    sku: z.string(),
    name: z.string(),
    availableQuantity: z.number(),
    requestedQuantity: z.number(),
    storeId: z.string()
  })).optional(),

  // Store assignment
  assignedStore: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    manager: z.string()
  }).optional(),

  // Route information
  optimizedRoute: z.object({
    waypoints: z.array(z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string()
    })),
    estimatedTime: z.number(),
    distance: z.number(),
    fuelEfficiency: z.number()
  }).optional(),

  // Delivery information
  assignedDriver: z.object({
    id: z.string(),
    name: z.string(),
    vehicle: z.string(),
    estimatedPickup: z.date().optional()
  }).optional(),

  // Messages and logs
  messages: z.array(z.object({
    agent: z.string(),
    action: z.string(),
    timestamp: z.string(),
    data: z.any().optional()
  })).default([]),

  // Customer query handling
  customerQuery: z.string().optional(),
  customerResponse: z.string().optional()
});

export class AgentState {
  constructor(initialData = {}) {
    this.data = AgentStateSchema.parse({
      ...initialData,
      messages: initialData.messages || [],
      workflowComplete: false,
      errorOccurred: false,
      inventoryAvailable: false
    });
  }

  update(updates) {
    this.data = AgentStateSchema.parse({
      ...this.data,
      ...updates
    });
  }

  addMessage(agent, action, data = null) {
    this.data.messages.push({
      agent,
      action,
      timestamp: new Date().toISOString(),
      data
    });
  }

  get() {
    return this.data;
  }

  setCurrentAgent(agent) {
    this.data.currentAgent = agent;
  }

  setNextAgent(agent) {
    this.data.nextAgent = agent;
  }

  markComplete() {
    this.data.workflowComplete = true;
  }

  markError(message) {
    this.data.errorOccurred = true;
    this.data.errorMessage = message;
  }
} 