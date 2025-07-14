// import { StateGraph, END } from '@langchain/core';
import { v4 as uuidv4 } from 'uuid';
import { AgentMessage, AgentMessageSchema } from './types';

export abstract class BaseAgent {
  protected agentId: string;
  protected agentType: string;
  protected messageQueue: AgentMessage[] = [];
  protected isProcessing = false;

  constructor(agentId: string, agentType: string) {
    this.agentId = agentId;
    this.agentType = agentType;
  }

  // Abstract methods that each agent must implement
  abstract processMessage(message: AgentMessage): Promise<AgentMessage[]>;
  abstract getState(): unknown;
  abstract updateState(newState: unknown): void;

  // Common messaging functionality
  async sendMessage(
    to: string, 
    type: AgentMessage['type'], 
    content: string, 
    data?: Record<string, unknown>
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: uuidv4(),
      from: this.agentId,
      to,
      type,
      content,
      timestamp: new Date(),
      status: 'sent',
      data
    };

    // Validate message
    AgentMessageSchema.parse(message);
    
    // In a real implementation, this would send to a message broker
    console.log(`[${this.agentId}] Sending message to ${to}:`, message);
    
    return message;
  }

  async receiveMessage(message: AgentMessage): Promise<void> {
    this.messageQueue.push(message);
    if (!this.isProcessing) {
      await this.processMessageQueue();
    }
  }

  private async processMessageQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      try {
        const responses = await this.processMessage(message);
        
        // Send any response messages
        for (const response of responses) {
          // In a real implementation, this would use the message broker
          console.log(`[${this.agentId}] Response:`, response);
        }
        
        // Mark message as processed
        message.status = 'processed';
      } catch (error) {
        console.error(`[${this.agentId}] Error processing message:`, error);
      }
    }
    
    this.isProcessing = false;
  }

  // Utility method for creating standardized responses
  protected createResponse(
    to: string,
    type: AgentMessage['type'],
    content: string,
    data?: Record<string, unknown>
  ): AgentMessage {
    return {
      id: uuidv4(),
      from: this.agentId,
      to,
      type,
      content,
      timestamp: new Date(),
      status: 'sent',
      data
    };
  }

  // Health check method
  getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: string } {
    const queueSize = this.messageQueue.length;
    
    if (queueSize > 100) {
      return { status: 'unhealthy', details: `Message queue overloaded: ${queueSize} messages` };
    } else if (queueSize > 50) {
      return { status: 'degraded', details: `High message queue: ${queueSize} messages` };
    }
    
    return { status: 'healthy', details: 'Agent operating normally' };
  }
}