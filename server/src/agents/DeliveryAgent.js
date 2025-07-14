import { BaseAgent } from './BaseAgent.js';

export class DeliveryAgent extends BaseAgent {
  constructor(llm = null) {
    super('delivery_agent', llm);
    this.drivers = this.initializeDrivers();
    this.activeDeliveries = new Map();
  }

  async process(state) {
    this.logAction('Assigning driver for delivery');
    state.setCurrentAgent(this.name);

    try {
      const orderData = state.get().order;
      const optimizedRoute = state.get().optimizedRoute;

      if (!orderData || !optimizedRoute) {
        return this.createErrorState(state, 'Missing order or route data');
      }

      // Assign optimal driver using LLM
      const driverAssignment = await this.assignOptimalDriver(orderData, optimizedRoute);
      
      if (driverAssignment.success) {
        state.update({
          assignedDriver: driverAssignment.driver,
          order: {
            ...orderData,
            status: 'driver_assigned'
          },
          nextAgent: 'notification_agent'
        });

        // Track active delivery
        this.activeDeliveries.set(orderData.id, {
          orderId: orderData.id,
          driverId: driverAssignment.driver.id,
          route: optimizedRoute,
          status: 'assigned',
          assignedAt: new Date(),
          estimatedPickup: driverAssignment.estimatedPickup
        });

        this.createSuccessState(state, 'driver_assigned', driverAssignment);
        this.logAction('Driver assigned successfully', driverAssignment);
      } else {
        return this.createErrorState(state, `Driver assignment failed: ${driverAssignment.reason}`);
      }

    } catch (error) {
      return this.createErrorState(state, `Delivery agent error: ${error.message}`);
    }

    return state;
  }

  async assignOptimalDriver(orderData, optimizedRoute) {
    const prompt = {
      system: `You are a delivery fleet manager for a delivery platform. Your job is to assign the optimal driver for a delivery.

Consider these factors:
1. Driver availability and current location
2. Driver experience and rating
3. Vehicle type and capacity
4. Route complexity and driver skills
5. Current workload and delivery time windows

Available drivers:
${JSON.stringify(this.drivers, null, 2)}

Return a JSON response with this format:
{
  "success": true/false,
  "driver": {
    "id": "driver_id",
    "name": "driver_name",
    "vehicle": "vehicle_type",
    "rating": 4.8
  },
  "estimatedPickup": "2024-01-01T10:30:00Z",
  "reasoning": "explanation of why this driver was chosen",
  "deliveryNotes": ["note1", "note2"]
}`,
      human: `Assign driver for this delivery:
Order: ${JSON.stringify(orderData, null, 2)}
Route: ${JSON.stringify(optimizedRoute, null, 2)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      
      if (result.error || !result.success) {
        return this.fallbackDriverAssignment(orderData, optimizedRoute);
      }

      return result;
    } catch (error) {
      return this.fallbackDriverAssignment(orderData, optimizedRoute);
    }
  }

  fallbackDriverAssignment(orderData, optimizedRoute) {
    // Find available driver with best rating
    const availableDrivers = this.drivers.filter(driver => driver.status === 'available');
    
    if (availableDrivers.length === 0) {
      return {
        success: false,
        reason: 'No available drivers'
      };
    }

    // Sort by rating and select the best available driver
    const bestDriver = availableDrivers.sort((a, b) => b.rating - a.rating)[0];
    
    // Calculate estimated pickup time (30 minutes from now)
    const estimatedPickup = new Date(Date.now() + 30 * 60 * 1000);

    return {
      success: true,
      driver: {
        id: bestDriver.id,
        name: bestDriver.name,
        vehicle: bestDriver.vehicle,
        rating: bestDriver.rating
      },
      estimatedPickup: estimatedPickup.toISOString(),
      reasoning: `Assigned ${bestDriver.name} based on availability and rating (${bestDriver.rating})`,
      deliveryNotes: [
        'Driver will contact customer 10 minutes before arrival',
        'Special handling required for fragile items'
      ]
    };
  }

  initializeDrivers() {
    return [
      {
        id: 'DRIVER-001',
        name: 'John Smith',
        vehicle: 'Ford Transit Van',
        rating: 4.8,
        status: 'available',
        currentLocation: { lat: 36.1627, lng: -86.7816 },
        experience: '3 years',
        specializations: ['fragile_items', 'large_orders']
      },
      {
        id: 'DRIVER-002',
        name: 'Maria Garcia',
        vehicle: 'Toyota Prius',
        rating: 4.9,
        status: 'available',
        currentLocation: { lat: 35.9254, lng: -86.8689 },
        experience: '2 years',
        specializations: ['express_delivery', 'small_orders']
      },
      {
        id: 'DRIVER-003',
        name: 'David Johnson',
        vehicle: 'Chevrolet Express',
        rating: 4.7,
        status: 'busy',
        currentLocation: { lat: 35.8456, lng: -86.3903 },
        experience: '5 years',
        specializations: ['bulk_orders', 'refrigerated_items']
      },
      {
        id: 'DRIVER-004',
        name: 'Sarah Wilson',
        vehicle: 'Honda Civic',
        rating: 4.6,
        status: 'available',
        currentLocation: { lat: 36.1650, lng: -86.7850 },
        experience: '1 year',
        specializations: ['local_delivery', 'customer_service']
      }
    ];
  }

  async updateDeliveryStatus(orderId, status, location = null) {
    const delivery = this.activeDeliveries.get(orderId);
    if (!delivery) {
      return { error: 'Delivery not found' };
    }

    delivery.status = status;
    delivery.lastUpdated = new Date();
    
    if (location) {
      delivery.currentLocation = location;
    }

    this.logAction('Delivery status updated', { orderId, status, location });
    return { success: true, delivery };
  }

  async getDriverStatus(driverId) {
    const driver = this.drivers.find(d => d.id === driverId);
    if (!driver) {
      return { error: 'Driver not found' };
    }

    // Use LLM to analyze driver performance
    const prompt = {
      system: `You are a delivery operations analyst. Analyze the driver's performance and provide insights.

Consider:
1. Current status and availability
2. Rating and customer feedback
3. Experience and specializations
4. Recent delivery performance
5. Recommendations for improvement

Return a JSON response with this format:
{
  "status": "available/busy/offline",
  "performance": "excellent/good/fair/poor",
  "insights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"],
  "nextAvailable": "2024-01-01T10:30:00Z"
}`,
      human: `Analyze this driver: ${JSON.stringify(driver, null, 2)}`
    };

    try {
      const result = await this.invokeLLMWithJSON(prompt);
      return result.error ? this.fallbackDriverStatus(driver) : result;
    } catch (error) {
      return this.fallbackDriverStatus(driver);
    }
  }

  fallbackDriverStatus(driver) {
    return {
      status: driver.status,
      performance: driver.rating >= 4.5 ? 'excellent' : driver.rating >= 4.0 ? 'good' : 'fair',
      insights: [
        `Driver rating: ${driver.rating}`,
        `Experience: ${driver.experience}`,
        `Specializations: ${driver.specializations.join(', ')}`
      ],
      recommendations: [
        'Continue monitoring performance',
        'Provide additional training if needed'
      ],
      nextAvailable: driver.status === 'available' ? new Date().toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
  }

  getAllDrivers() {
    return this.drivers;
  }

  getAvailableDrivers() {
    return this.drivers.filter(driver => driver.status === 'available');
  }

  getActiveDeliveries() {
    return Array.from(this.activeDeliveries.values());
  }

  async reassignDriver(orderId, newDriverId) {
    const delivery = this.activeDeliveries.get(orderId);
    if (!delivery) {
      return { error: 'Delivery not found' };
    }

    const newDriver = this.drivers.find(d => d.id === newDriverId);
    if (!newDriver) {
      return { error: 'Driver not found' };
    }

    if (newDriver.status !== 'available') {
      return { error: 'Driver not available' };
    }

    // Update delivery assignment
    delivery.driverId = newDriverId;
    delivery.reassignedAt = new Date();
    delivery.status = 'reassigned';

    this.logAction('Driver reassigned', { orderId, oldDriver: delivery.driverId, newDriver: newDriverId });
    
    return { success: true, delivery };
  }
} 