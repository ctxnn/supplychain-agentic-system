import { CustomerAgent } from './CustomerAgent';
import { InventoryAgent } from './InventoryAgent';
import { RouteAgent } from './RouteAgent';
import { BaseAgent } from './BaseAgent';
import { AgentMessage } from './types';

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private messageHistory: AgentMessage[] = [];

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // Initialize all agents
    const customerAgent = new CustomerAgent();
    const inventoryAgent = new InventoryAgent();
    const routeAgent = new RouteAgent();

    // Register agents
    this.agents.set('customer-agent', customerAgent);
    this.agents.set('inventory-agent', inventoryAgent);
    this.agents.set('route-agent', routeAgent);
    this.agents.set('store-manager-agent', new MockStoreManagerAgent());
    this.agents.set('delivery-agent', new MockDeliveryAgent());
    this.agents.set('notification-agent', new MockNotificationAgent());

    console.log('Agent Orchestrator initialized with', this.agents.size, 'agents');
  }

  async routeMessage(message: AgentMessage): Promise<void> {
    const targetAgent = this.agents.get(message.to);
    
    if (!targetAgent) {
      console.error(`Agent not found: ${message.to}`);
      return;
    }

    // Add to message history
    this.messageHistory.push(message);

    // Route message to target agent
    await targetAgent.receiveMessage(message);
  }

  async broadcastMessage(message: Omit<AgentMessage, 'to'>): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      if (agentId !== message.from) {
        await this.routeMessage({ ...message, to: agentId } as AgentMessage);
      }
    }
  }

  getAgent<T extends BaseAgent>(agentId: string): T | undefined {
    return this.agents.get(agentId) as T;
  }

  getAllAgents(): Map<string, BaseAgent> {
    return this.agents;
  }

  getMessageHistory(): AgentMessage[] {
    return this.messageHistory;
  }

  getAgentHealth(): Record<string, any> {
    const health: Record<string, any> = {};
    
    for (const [agentId, agent] of this.agents) {
      health[agentId] = agent.getHealth();
    }
    
    return health;
  }

  // Public interface methods
  async handleCustomerChat(input: string): Promise<string> {
    const customerAgent = this.getAgent<CustomerAgent>('customer-agent');
    if (customerAgent) {
      return await customerAgent.handleChatInput(input);
    }
    return "Customer agent not available";
  }

  async updateInventory(storeId: string, sku: string, quantity: number): Promise<void> {
    const inventoryAgent = this.getAgent<InventoryAgent>('inventory-agent');
    if (inventoryAgent) {
      inventoryAgent.updateInventory(storeId, sku, quantity);
    }
  }

  async setRouteOptimization(mode: 'time' | 'fuel' | 'distance'): Promise<void> {
    const routeAgent = this.getAgent<RouteAgent>('route-agent');
    if (routeAgent) {
      routeAgent.setOptimizationMode(mode);
    }
  }
}

// Mock agents for demonstration
class MockStoreManagerAgent extends BaseAgent {
  constructor() {
    super('store-manager-agent', 'store-manager');
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage[]> {
    console.log(`[StoreManagerAgent] Received: ${message.content}`);
    return [];
  }

  getState(): any {
    return {};
  }

  updateState(newState: any): void {
    // Mock implementation
  }
}

class MockDeliveryAgent extends BaseAgent {
  constructor() {
    super('delivery-agent', 'delivery');
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage[]> {
    console.log(`[DeliveryAgent] Received: ${message.content}`);
    return [];
  }

  getState(): any {
    return {};
  }

  updateState(newState: any): void {
    // Mock implementation
  }
}

class MockNotificationAgent extends BaseAgent {
  constructor() {
    super('notification-agent', 'notification');
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage[]> {
    console.log(`[NotificationAgent] Received: ${message.content}`);
    return [];
  }

  getState(): any {
    return {};
  }

  updateState(newState: any): void {
    // Mock implementation
  }
}