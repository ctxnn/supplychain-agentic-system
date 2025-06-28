import { BaseAgent } from './BaseAgent';
import { AgentMessage, RouteAgentState, RouteAgentStateSchema, Order } from './types';

export class RouteAgent extends BaseAgent {
  private state: RouteAgentState;

  constructor() {
    super('route-agent', 'route');
    this.state = RouteAgentStateSchema.parse({});
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];

    switch (message.type) {
      case 'order':
        responses.push(...await this.handleRouteOptimization(message));
        break;
      case 'route':
        responses.push(...await this.handleRouteUpdate(message));
        break;
      default:
        console.log(`[RouteAgent] Unhandled message type: ${message.type}`);
    }

    return responses;
  }

  private async handleRouteOptimization(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    const { order } = message.data || {};

    if (!order) {
      return responses;
    }

    // Calculate optimal route
    const optimizedRoute = await this.calculateOptimalRoute(order);
    
    // Add to active routes
    this.state.activeRoutes.push({
      orderId: order.id,
      driverId: `DRIVER-${Math.floor(Math.random() * 100)}`,
      route: optimizedRoute.waypoints,
      estimatedTime: optimizedRoute.estimatedTime,
      status: 'planned'
    });

    // Send route to delivery agent
    responses.push(this.createResponse(
      'delivery-agent',
      'route',
      `Optimal route calculated for order ${order.id}`,
      {
        orderId: order.id,
        route: optimizedRoute,
        estimatedDelivery: new Date(Date.now() + optimizedRoute.estimatedTime * 60000)
      }
    ));

    // Notify customer of estimated delivery time
    responses.push(this.createResponse(
      'customer-agent',
      'notification',
      `Your order ${order.id} is being prepared. Estimated delivery: ${Math.round(optimizedRoute.estimatedTime)} minutes`,
      {
        orderId: order.id,
        estimatedTime: optimizedRoute.estimatedTime
      }
    ));

    return responses;
  }

  private async handleRouteUpdate(message: AgentMessage): Promise<AgentMessage[]> {
    const responses: AgentMessage[] = [];
    const { orderId, status, location } = message.data || {};

    // Update route status
    const route = this.state.activeRoutes.find(r => r.orderId === orderId);
    if (route) {
      route.status = status;
      
      // If route is completed, remove from active routes
      if (status === 'completed') {
        this.state.activeRoutes = this.state.activeRoutes.filter(r => r.orderId !== orderId);
      }
    }

    return responses;
  }

  private async calculateOptimalRoute(order: Order): Promise<{
    waypoints: Array<{ lat: number; lng: number; address?: string }>;
    estimatedTime: number;
    distance: number;
    fuelEfficiency: number;
  }> {
    // Simplified route calculation - in production, use Google Maps API or similar
    const storeLocations = {
      'STORE-001': { lat: 36.1627, lng: -86.7816, address: '100 Oaks Blvd, Nashville, TN' },
      'STORE-002': { lat: 35.9254, lng: -86.8689, address: '3600 Mallory Ln, Franklin, TN' },
      'STORE-003': { lat: 35.8456, lng: -86.3903, address: '2315 S Church St, Murfreesboro, TN' }
    };

    const storeLocation = storeLocations[order.storeId as keyof typeof storeLocations] || storeLocations['STORE-001'];
    
    // Generate a realistic delivery location near the store
    const deliveryLocation = {
      lat: storeLocation.lat + (Math.random() - 0.5) * 0.1,
      lng: storeLocation.lng + (Math.random() - 0.5) * 0.1,
      address: 'Customer Delivery Address'
    };

    const waypoints = [storeLocation, deliveryLocation];
    
    // Calculate distance (simplified)
    const distance = this.calculateDistance(storeLocation, deliveryLocation);
    
    // Estimate time based on optimization mode
    let estimatedTime: number;
    switch (this.state.optimizationMode) {
      case 'time':
        estimatedTime = distance * 2; // 2 minutes per km (fast route)
        break;
      case 'fuel':
        estimatedTime = distance * 2.5; // 2.5 minutes per km (fuel efficient)
        break;
      case 'distance':
        estimatedTime = distance * 2.2; // 2.2 minutes per km (shortest distance)
        break;
      default:
        estimatedTime = distance * 2;
    }

    return {
      waypoints,
      estimatedTime,
      distance,
      fuelEfficiency: this.state.optimizationMode === 'fuel' ? 0.85 : 1.0
    };
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Public methods
  setOptimizationMode(mode: 'time' | 'fuel' | 'distance'): void {
    this.state.optimizationMode = mode;
  }

  getActiveRoutes(): RouteAgentState['activeRoutes'] {
    return this.state.activeRoutes;
  }

  getState(): RouteAgentState {
    return this.state;
  }

  updateState(newState: RouteAgentState): void {
    this.state = RouteAgentStateSchema.parse(newState);
  }
}