import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface Order {
  id: string;
  customerId: string;
  items: Array<{ sku: string; name: string; quantity: number; price: number }>;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  storeId: string;
  createdAt: Date;
  estimatedDelivery?: Date;
  location?: { lat: number; lng: number };
}

interface InventoryItem {
  storeId: string;
  sku: string;
  name: string;
  quantity: number;
  reserved: number;
  category: string;
  price: number;
}

interface Store {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  address: string;
  manager: string;
  status: 'active' | 'maintenance' | 'closed';
}

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'order' | 'inventory' | 'route' | 'notification' | 'emergency';
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'processed';
}

interface SupplyChainState {
  orders: Order[];
  inventory: InventoryItem[];
  stores: Store[];
  agentMessages: AgentMessage[];
  notifications: Array<{ id: string; message: string; type: string; timestamp: Date }>;
}

type SupplyChainAction =
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { orderId: string; status: Order['status'] } }
  | { type: 'UPDATE_INVENTORY'; payload: { storeId: string; sku: string; quantity: number } }
  | { type: 'ADD_AGENT_MESSAGE'; payload: AgentMessage }
  | { type: 'ADD_NOTIFICATION'; payload: { id: string; message: string; type: string; timestamp: Date } }
  | { type: 'SIMULATE_REAL_TIME_UPDATE' };

// Helper function to generate order IDs
const generateOrderId = () => `ORD-${Date.now()}`;

const initialState: SupplyChainState = {
  orders: [],
  inventory: [
    { storeId: 'STORE-001', sku: 'SKU-001', name: 'Organic Bananas', quantity: 45, reserved: 3, category: 'Produce', price: 2.99 },
    { storeId: 'STORE-001', sku: 'SKU-002', name: 'Greek Yogurt', quantity: 23, reserved: 2, category: 'Dairy', price: 5.99 },
    { storeId: 'STORE-001', sku: 'SKU-003', name: 'Wireless Headphones', quantity: 8, reserved: 0, category: 'Electronics', price: 129.99 },
    { storeId: 'STORE-002', sku: 'SKU-001', name: 'Organic Bananas', quantity: 32, reserved: 0, category: 'Produce', price: 2.99 },
    { storeId: 'STORE-002', sku: 'SKU-003', name: 'Wireless Headphones', quantity: 12, reserved: 1, category: 'Electronics', price: 129.99 }
  ],
  stores: [
    { id: 'STORE-001', name: 'Walmart Supercenter - Nashville', location: { lat: 36.1627, lng: -86.7816 }, address: '100 Oaks Blvd, Nashville, TN', manager: 'Sarah Johnson', status: 'active' },
    { id: 'STORE-002', name: 'Walmart Supercenter - Franklin', location: { lat: 35.9254, lng: -86.8689 }, address: '3600 Mallory Ln, Franklin, TN', manager: 'Mike Chen', status: 'active' },
    { id: 'STORE-003', name: 'Walmart Supercenter - Murfreesboro', location: { lat: 35.8456, lng: -86.3903 }, address: '2315 S Church St, Murfreesboro, TN', manager: 'Lisa Rodriguez', status: 'maintenance' }
  ],
  agentMessages: [],
  notifications: [
    { id: 'NOT-001', message: 'Order ORD-001 out for delivery', type: 'success', timestamp: new Date(Date.now() - 600000) },
    { id: 'NOT-002', message: 'Low stock alert: Greek Yogurt at Nashville store', type: 'warning', timestamp: new Date(Date.now() - 300000) }
  ]
};

const supplyChainReducer = (state: SupplyChainState, action: SupplyChainAction): SupplyChainState => {
  switch (action.type) {
    case 'ADD_ORDER':
      return {
        ...state,
        orders: [...state.orders, action.payload]
      };
    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.orderId
            ? { ...order, status: action.payload.status }
            : order
        )
      };
    case 'UPDATE_INVENTORY':
      return {
        ...state,
        inventory: state.inventory.map(item =>
          item.storeId === action.payload.storeId && item.sku === action.payload.sku
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    case 'ADD_AGENT_MESSAGE':
      return {
        ...state,
        agentMessages: [...state.agentMessages, action.payload]
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: action.payload.id,
            message: action.payload.message,
            type: action.payload.type,
            timestamp: action.payload.timestamp
          }
        ]
      };
    case 'SIMULATE_REAL_TIME_UPDATE':
      // Simulate real-time updates for demo purposes
      const randomOrder = state.orders[Math.floor(Math.random() * state.orders.length)];
      const statuses: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered'];
      const currentStatusIndex = statuses.indexOf(randomOrder.status);
      const nextStatus = statuses[Math.min(currentStatusIndex + 1, statuses.length - 1)];
      
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === randomOrder.id ? { ...order, status: nextStatus } : order
        ),
        notifications: [
          ...state.notifications,
          {
            id: `NOT-${Date.now()}`,
            message: `Order ${randomOrder.id} status updated to ${nextStatus}`,
            type: 'info',
            timestamp: new Date()
          }
        ]
      };
    default:
      return state;
  }
};

const SupplyChainContext = createContext<{
  state: SupplyChainState;
  dispatch: React.Dispatch<SupplyChainAction>;
} | null>(null);

export const SupplyChainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(supplyChainReducer, initialState);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'SIMULATE_REAL_TIME_UPDATE' });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <SupplyChainContext.Provider value={{ state, dispatch }}>
      {children}
    </SupplyChainContext.Provider>
  );
};

export const useSupplyChain = () => {
  const context = useContext(SupplyChainContext);
  if (!context) {
    throw new Error('useSupplyChain must be used within a SupplyChainProvider');
  }
  return context;
};