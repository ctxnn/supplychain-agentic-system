import { z } from 'zod';

// NLP Types
export type Intent = 'ORDER' | 'CANCEL_ORDER' | 'MODIFY_ORDER' | 'QUERY_INVENTORY' | 'TRACK_ORDER' | 'GENERAL_QUERY' | 'PROVIDE_DETAILS';

export type EntityType = 'product' | 'quantity' | 'order_id' | 'action' | 'modification';

export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface NLPAnalysis {
  intent: Intent;
  entities: Entity[];
  confidence: number;
}

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

// Define message types using Zod enums
export const MessageTypeEnum = z.enum([
  'order',
  'cancel_order',
  'modify_order',
  'inventory',
  'route',
  'notification',
  'emergency',
  'inventory-query',
  'track-order',
  'order-status',
  'response',
  'error',
  'user-message',
]);
export type MessageType = z.infer<typeof MessageTypeEnum>;

export const MessageStatusEnum = z.enum(['sent', 'delivered', 'processed', 'received']);
export type MessageStatus = z.infer<typeof MessageStatusEnum>;

// Agent message schemas
export const AgentMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: MessageTypeEnum,
  content: z.string(),
  timestamp: z.date(),
  status: MessageStatusEnum,
  data: z.record(z.any()).optional(),
});

// Agent state schemas
const OrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const CustomerAgentStateSchema = z.object({
  currentOrder: OrderSchema.nullable().optional(),
  customerPreferences: z.record(z.any()).default({}),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.date(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).default([]),
  conversationState: z.enum(['idle', 'awaiting_quantity', 'awaiting_clarification', 'processing']).default('idle'),
  pendingAction: z.object({
    type: z.string(),
    items: z.array(OrderItemSchema),
  }).nullable().optional(),
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
export type AgentMessage = z.infer<typeof AgentMessageSchema> & {
  data?: Record<string, any>;
};

export type OrderItem = {
  name: string;
  quantity: number;
  metadata?: Record<string, unknown>;
};

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

export type CustomerAgentState = z.infer<typeof CustomerAgentStateSchema>;

export type InventoryAgentState = z.infer<typeof InventoryAgentStateSchema>;
export type RouteAgentState = z.infer<typeof RouteAgentStateSchema>;