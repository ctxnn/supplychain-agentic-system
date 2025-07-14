import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from './state.js';
import { CustomerAgent } from './CustomerAgent.ts';
import { InventoryAgent } from './InventoryAgent.js';
import { StoreManagerAgent } from './StoreManagerAgent.js';
import { RouteAgent } from './RouteAgent.js';
import { DeliveryAgent } from './DeliveryAgent.js';
import { NotificationAgent } from './NotificationAgent.js';

export class WorkflowOrchestrator {
  constructor(openaiApiKey = null) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.1,
      openAIApiKey: openaiApiKey || process.env.OPENAI_API_KEY
    });

    // Initialize all agents
    this.customerAgent = new CustomerAgent(this.llm);
    this.inventoryAgent = new InventoryAgent(this.llm);
    this.storeManagerAgent = new StoreManagerAgent(this.llm);
    this.routeAgent = new RouteAgent(this.llm);
    this.deliveryAgent = new DeliveryAgent(this.llm);
    this.notificationAgent = new NotificationAgent(this.llm);

    // Workflow state
    this.activeWorkflows = new Map();
    this.workflowHistory = [];
  }

  async runWorkflow(initialState) {
    const workflowId = `workflow-${Date.now()}`;
    const state = new AgentState(initialState);
    
    this.activeWorkflows.set(workflowId, {
      id: workflowId,
      state: state,
      startTime: new Date(),
      status: 'running'
    });

    console.log(`🚀 Starting workflow ${workflowId}`);

    try {
      // Execute the workflow steps
      const result = await this.executeWorkflow(state);
      
      // Update workflow status
      const workflow = this.activeWorkflows.get(workflowId);
      workflow.status = result.errorOccurred ? 'failed' : 'completed';
      workflow.endTime = new Date();
      workflow.result = result;

      // Move to history
      this.workflowHistory.push(workflow);
      this.activeWorkflows.delete(workflowId);

      console.log(`✅ Workflow ${workflowId} ${workflow.status}`);
      return result;

    } catch (error) {
      console.error(`❌ Workflow ${workflowId} failed:`, error);
      
      // Handle error
      const errorResult = await this.handleWorkflowError(state, error);
      
      // Update workflow status
      const workflow = this.activeWorkflows.get(workflowId);
      workflow.status = 'failed';
      workflow.endTime = new Date();
      workflow.error = error.message;
      workflow.result = errorResult;

      // Move to history
      this.workflowHistory.push(workflow);
      this.activeWorkflows.delete(workflowId);

      return errorResult;
    }
  }

  async executeWorkflow(state) {
    const workflowSteps = [
      { name: 'customer_agent', agent: this.customerAgent },
      { name: 'inventory_agent', agent: this.inventoryAgent },
      { name: 'store_manager_agent', agent: this.storeManagerAgent },
      { name: 'route_agent', agent: this.routeAgent },
      { name: 'delivery_agent', agent: this.deliveryAgent },
      { name: 'notification_agent', agent: this.notificationAgent }
    ];

    for (const step of workflowSteps) {
      console.log(`🔄 Executing ${step.name}...`);
      
      try {
        // Process with current agent
        await step.agent.process(state);
        
        // Check for errors
        if (state.get().errorOccurred) {
          console.log(`❌ Error in ${step.name}: ${state.get().errorMessage}`);
          return state.get();
        }

        // Check if workflow should continue
        const nextAgent = state.get().nextAgent;
        if (nextAgent === 'error_handler') {
          console.log(`⚠️ Redirecting to error handler from ${step.name}`);
          return await this.handleWorkflowError(state, new Error(state.get().errorMessage));
        }

        console.log(`✅ ${step.name} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Error in ${step.name}:`, error);
        return await this.handleWorkflowError(state, error);
      }
    }

    return state.get();
  }

  async handleWorkflowError(state, error) {
    console.log('🛠️ Handling workflow error...');
    
    try {
      // Send error notification
      const errorNotification = await this.notificationAgent.handleErrorNotification(state);
      
      // Update state with error information
      state.markError(error.message);
      state.addMessage('workflow_orchestrator', 'error_handled', {
        error: error.message,
        notification: errorNotification
      });

      return state.get();
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
      state.markError(`Workflow error: ${error.message}. Notification failed: ${notificationError.message}`);
      return state.get();
    }
  }

  async handleCustomerQuery(query) {
    console.log('💬 Handling customer query...');
    
    try {
      const response = await this.customerAgent.handleCustomerQuery(query);
      return response;
    } catch (error) {
      console.error('Error handling customer query:', error);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error processing your query. Please try again or contact support.'
      };
    }
  }

  async updateInventory(storeId, sku, quantity) {
    console.log('📦 Updating inventory...');
    
    try {
      this.inventoryAgent.updateInventory(sku, storeId, quantity);
      return {
        success: true,
        message: `Inventory updated: ${sku} at ${storeId} = ${quantity}`
      };
    } catch (error) {
      console.error('Error updating inventory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async setRouteOptimization(mode) {
    console.log(`🗺️ Setting route optimization mode: ${mode}`);
    
    try {
      this.routeAgent.setOptimizationMode(mode);
      return {
        success: true,
        message: `Route optimization mode set to: ${mode}`
      };
    } catch (error) {
      console.error('Error setting route optimization:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getWorkflowStatus(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId) || 
                    this.workflowHistory.find(w => w.id === workflowId);
    
    if (!workflow) {
      return { error: 'Workflow not found' };
    }

    return {
      id: workflow.id,
      status: workflow.status,
      startTime: workflow.startTime,
      endTime: workflow.endTime,
      currentAgent: workflow.state.get().currentAgent,
      workflowComplete: workflow.state.get().workflowComplete,
      errorOccurred: workflow.state.get().errorOccurred,
      errorMessage: workflow.state.get().errorMessage,
      messages: workflow.state.get().messages
    };
  }

  async getAgentHealth() {
    return {
      customerAgent: { status: 'healthy', details: 'Customer agent operating normally' },
      inventoryAgent: { status: 'healthy', details: 'Inventory agent operating normally' },
      storeManagerAgent: { status: 'healthy', details: 'Store manager agent operating normally' },
      routeAgent: { status: 'healthy', details: 'Route agent operating normally' },
      deliveryAgent: { status: 'healthy', details: 'Delivery agent operating normally' },
      notificationAgent: { status: 'healthy', details: 'Notification agent operating normally' }
    };
  }

  async getSystemStatus() {
    const activeWorkflows = this.activeWorkflows.size;
    const completedWorkflows = this.workflowHistory.length;
    
    return {
      status: 'operational',
      activeWorkflows,
      completedWorkflows,
      totalWorkflows: activeWorkflows + completedWorkflows,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  async getWorkflowHistory(limit = 10) {
    return this.workflowHistory
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit)
      .map(workflow => ({
        id: workflow.id,
        status: workflow.status,
        startTime: workflow.startTime,
        endTime: workflow.endTime,
        duration: workflow.endTime ? workflow.endTime - workflow.startTime : null,
        error: workflow.error
      }));
  }

  async getAgentData(agentName) {
    const agents = {
      customer: this.customerAgent,
      inventory: this.inventoryAgent,
      storeManager: this.storeManagerAgent,
      route: this.routeAgent,
      delivery: this.deliveryAgent,
      notification: this.notificationAgent
    };

    const agent = agents[agentName];
    if (!agent) {
      return { error: 'Agent not found' };
    }

    // Return agent-specific data
    switch (agentName) {
      case 'inventory':
        return {
          inventory: agent.getAllInventory(),
          lowStockAlerts: agent.state?.lowStockAlerts || []
        };
      case 'storeManager':
        return {
          stores: agent.getAllStores(),
          activeStores: agent.getActiveStores()
        };
      case 'delivery':
        return {
          drivers: agent.getAllDrivers(),
          availableDrivers: agent.getAvailableDrivers(),
          activeDeliveries: agent.getActiveDeliveries()
        };
      case 'notification':
        return {
          notificationHistory: agent.getNotificationHistory()
        };
      default:
        return {
          status: 'Agent data available',
          agentName: agent.name
        };
    }
  }
} 