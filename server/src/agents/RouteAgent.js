import { BaseAgent } from './BaseAgent.js';

export class RouteAgent extends BaseAgent {
  constructor(llm = null) {
    super('route_agent', llm);
    this.optimizationMode = 'time'; // time, fuel, distance
  }

  async process(state) {
    this.logAction('Optimizing delivery route');
    state.setCurrentAgent(this.name);

    try {
      const orderData = state.get().order;
      const assignedStore = state.get().assignedStore;

      if (!orderData || !assignedStore) {
        return this.createErrorState(state, 'Missing order or store data');
      }

      // Optimize route using LLM
      const routeOptimization = await this.optimizeRoute(orderData, assignedStore);
      
      if (routeOptimization.success) {
        state.update({
          optimizedRoute: routeOptimization.route,
          order: {
            ...orderData,
            status: 'route_optimized'
          },
          nextAgent: 'delivery_agent'
        });

        this.createSuccessState(state, 'route_optimized', routeOptimization);
        this.logAction('Route optimized successfully', routeOptimization);
      } else {
        return this.createErrorState(state, `Route optimization failed: ${routeOptimization.reason}`);
      }

    } catch (error) {
      return this.createErrorState(state, `Route agent error: ${error.message}`);
    }

    return state;
  }

  async optimizeRoute(orderData, assignedStore) {
    const prompt = {
      system: `You are a route optimization expert for a delivery platform. Your job is to calculate the optimal delivery route.

Consider these factors:
1. Store location to delivery address distance
2. Traffic conditions and time of day
3. Road conditions and speed limits
4. Fuel efficiency and cost optimization
5. Delivery time windows

Optimization mode: ${this.optimizationMode}

Return a JSON response with this format:
{
  "success": true/false,
  "route": {
    "waypoints": [
      {"lat": 36.1627, "lng": -86.7816, "address": "Store Address"},
      {"lat": 36.1650, "lng": -86.7850, "address": "Delivery Address"}
    ],
    "estimatedTime": 25,
    "distance": 12.5,
    "fuelEfficiency": 0.85
  },
  "optimizationFactors": ["factor1", "factor2"],
  "trafficConditions": "light/medium/heavy",
  "recommendations": ["rec1", "rec2"]
}`,
      human: `Optimize route for this delivery:
Store: ${JSON.stringify(assignedStore, null, 2)}
Delivery Address: ${JSON.stringify(orderData.deliveryAddress, null, 2)}
Order Items: ${JSON.stringify(orderData.items, null, 2)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      
      if (result.error || !result.success) {
        return this.fallbackRouteOptimization(orderData, assignedStore);
      }

      return result;
    } catch (error) {
      return this.fallbackRouteOptimization(orderData, assignedStore);
    }
  }

  fallbackRouteOptimization(orderData, assignedStore) {
    // Get store location
    const storeLocation = this.getStoreLocation(assignedStore.id);
    
    // Generate delivery location (simplified - in production would use geocoding)
    const deliveryLocation = this.generateDeliveryLocation(orderData.deliveryAddress);
    
    // Calculate distance and time
    const distance = this.calculateDistance(storeLocation, deliveryLocation);
    const estimatedTime = this.calculateEstimatedTime(distance, this.optimizationMode);
    
    const waypoints = [
      {
        lat: storeLocation.lat,
        lng: storeLocation.lng,
        address: assignedStore.address
      },
      {
        lat: deliveryLocation.lat,
        lng: deliveryLocation.lng,
        address: `${orderData.deliveryAddress.street}, ${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state}`
      }
    ];

    return {
      success: true,
      route: {
        waypoints,
        estimatedTime,
        distance,
        fuelEfficiency: this.optimizationMode === 'fuel' ? 0.85 : 1.0
      },
      optimizationFactors: [
        `Optimized for ${this.optimizationMode}`,
        'Distance-based calculation',
        'Standard traffic conditions'
      ],
      trafficConditions: 'medium',
      recommendations: [
        'Monitor real-time traffic updates',
        'Consider alternative routes during peak hours'
      ]
    };
  }

  getStoreLocation(storeId) {
    const storeLocations = {
      'STORE-001': { lat: 36.1627, lng: -86.7816 },
      'STORE-002': { lat: 35.9254, lng: -86.8689 },
      'STORE-003': { lat: 35.8456, lng: -86.3903 }
    };
    
    return storeLocations[storeId] || storeLocations['STORE-001'];
  }

  generateDeliveryLocation(address) {
    // Simplified geocoding - in production would use Google Maps API
    const baseLocation = { lat: 36.1627, lng: -86.7816 };
    
    // Add some random variation to simulate different delivery locations
    return {
      lat: baseLocation.lat + (Math.random() - 0.5) * 0.1,
      lng: baseLocation.lng + (Math.random() - 0.5) * 0.1
    };
  }

  calculateDistance(point1, point2) {
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

  calculateEstimatedTime(distance, mode) {
    // Estimate time based on optimization mode
    let baseTimePerKm;
    
    switch (mode) {
      case 'time':
        baseTimePerKm = 2; // 2 minutes per km (fast route)
        break;
      case 'fuel':
        baseTimePerKm = 2.5; // 2.5 minutes per km (fuel efficient)
        break;
      case 'distance':
        baseTimePerKm = 2.2; // 2.2 minutes per km (shortest distance)
        break;
      default:
        baseTimePerKm = 2;
    }

    return Math.round(distance * baseTimePerKm);
  }

  setOptimizationMode(mode) {
    this.optimizationMode = mode;
    this.logAction('Optimization mode changed', { mode });
  }

  async analyzeTrafficConditions(route) {
    const prompt = {
      system: `You are a traffic analysis expert. Analyze the current traffic conditions for a delivery route.

Consider:
1. Time of day and day of week
2. Historical traffic patterns
3. Current weather conditions
4. Special events or construction

Return a JSON response with this format:
{
  "trafficLevel": "light/medium/heavy",
  "estimatedDelay": 5,
  "alternativeRoutes": ["route1", "route2"],
  "recommendations": ["rec1", "rec2"]
}`,
      human: `Analyze traffic for this route: ${JSON.stringify(route, null, 2)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      return result.error ? this.fallbackTrafficAnalysis() : result;
    } catch (error) {
      return this.fallbackTrafficAnalysis();
    }
  }

  fallbackTrafficAnalysis() {
    return {
      trafficLevel: 'medium',
      estimatedDelay: 5,
      alternativeRoutes: ['Consider side streets', 'Use highway during off-peak'],
      recommendations: ['Monitor real-time traffic', 'Plan for extra time']
    };
  }
} 