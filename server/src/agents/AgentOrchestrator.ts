import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { CustomerAgent } from './CustomerAgent.ts';
import { AgentMessage, AgentMessageSchema, MessageStatus, MessageType } from './types.ts';

interface AgentMap {
  [key: string]: CustomerAgent;
}

export class AgentOrchestrator {
  private agents: AgentMap;
  private messageHistory: AgentMessage[];

  constructor() {
    this.agents = {
      'customer-agent': new CustomerAgent(),
    };
    this.messageHistory = [];
    logger.info('AgentOrchestrator initialized with CustomerAgent');
  }

  async handleCustomerChat(content: string): Promise<string> {
    try {
      const customerAgent = this.agents['customer-agent'];
      if (!customerAgent) {
        throw new Error('CustomerAgent not initialized');
      }

      const message: AgentMessage = {
        id: uuidv4(),
        from: 'customer',
        to: 'customer-agent',
        type: 'user-message',
        content: content,
        timestamp: new Date(),
        status: 'received',
        data: {},
      };

      this.messageHistory.push(message);

      const responses = await customerAgent.processMessage(message);
      const primaryResponse = responses[0];

      if (!primaryResponse) {
        return "I'm not sure how to respond to that. Can you try again?";
      }

      this.messageHistory.push(...responses);
      logger.info(`[AgentOrchestrator] Response from CustomerAgent: ${primaryResponse.content}`);

      return primaryResponse.content;
    } catch (error) {
      logger.error('Error in handleCustomerChat:', error);
      return 'I apologize, but I encountered an error. Please check the server logs.';
    }
  }

  getMessageHistory(): AgentMessage[] {
    return [...this.messageHistory];
  }

  getAgentHealth() {
    return {
      status: 'online',
      timestamp: new Date().toISOString(),
      agents: Object.keys(this.agents).length,
    };
  }
}
