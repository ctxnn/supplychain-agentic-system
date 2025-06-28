import { z } from 'zod';

// Core data schemas
export const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  items: z.array(z.object({
    sku: z.string(),
    name: z.string(),
    quantity: z.number(),
    price: z.number()
  })),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  storeId: z.string(),
  createdAt: z.date(),
  estimatedDelivery: z.date().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

export const InventoryItemSchema = z.object({
  storeId: z.string(),
  sku: z.string(),
  name: z.string(),
  quantity: z.number(),
  reserved: z.number(),
  category: z.string(),
  price: z.number(),
  reorderPoint: z.number().default(10),
  maxStock: z.number().default(100)
});

export const StoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }),
  address: z.string(),
  manager: z.string(),
  status: z.enum(['active', 'maintenance', 'closed'])
});

// Agent message schemas
export const AgentMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.enum(['order', 'inventory', 'route', 'notification', 'emergency']),
  content: z.string(),
  timestamp: z.date(),
  status: z.enum(['sent', 'delivered', 'processed']),
  data: z.record(z.any()).optional()
});

// Agent state schemas
export const CustomerAgentStateSchema = z.object({
  currentOrder: OrderSchema.optional(),
  customerPreferences: z.record(z.any()).default({}),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.date()
  })).default([])
});

export const InventoryAgentStateSchema = z.object({
  lowStockAlerts: z.array(z.string()).default([]),
  restockRequests: z.array(z.object({
    sku: z.string(),
    storeId: z.string(),
    quantity: z.number(),
    priority: z.enum(['low', 'medium', 'high']),
    timestamp: z.date()
  })).default([]),
  lastInventoryCheck: z.date().optional()
});

export const RouteAgentStateSchema = z.object({
  activeRoutes: z.array(z.object({
    orderId: z.string(),
    driverId: z.string(),
    route: z.array(z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional()
    })),
    estimatedTime: z.number(),
    status: z.enum(['planned', 'active', 'completed'])
  })).default([]),
  optimizationMode: z.enum(['time', 'fuel', 'distance']).default('time')
});

// Type exports
export type Order = z.infer<typeof OrderSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type Store = z.infer<typeof StoreSchema>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export type CustomerAgentState = z.infer<typeof CustomerAgentStateSchema>;
export type InventoryAgentState = z.infer<typeof InventoryAgentStateSchema>;
export type RouteAgentState = z.infer<typeof RouteAgentStateSchema>;