import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';
import { AgentOrchestrator } from '../agents/AgentOrchestrator.ts';

const agentOrchestrator = new AgentOrchestrator();

export const setupAgentHandlers = (io: Server) => {
  io.of('/agents').on('connection', (socket) => {
    logger.info(`Agent client connected: ${socket.id}`);

    socket.emit('agent:init', {
      message: 'Connected to agent service',
      health: agentOrchestrator.getAgentHealth(),
      history: agentOrchestrator.getMessageHistory(),
    });

    socket.on('customer:message', async (data: { content: string }, callback) => {
      try {
        logger.info(`Received customer message: ${data.content}`);

        const userMessage = {
          from: 'customer',
          content: data.content,
          timestamp: new Date().toISOString(),
        };
        io.of('/agents').emit('agent:message', userMessage);

        const response = await agentOrchestrator.handleCustomerChat(data.content);

        const agentResponse = {
          from: 'agent',
          content: response,
          timestamp: new Date().toISOString(),
        };
        io.of('/agents').emit('agent:message', agentResponse);

        if (typeof callback === 'function') {
          callback({ success: true, message: agentResponse });
        }
      } catch (error) {
        logger.error('Error processing customer message:', error);

        const errorResponse = {
          from: 'system',
          content: 'Sorry, I encountered an error processing your request.',
          timestamp: new Date().toISOString(),
        };
        io.of('/agents').emit('agent:message', errorResponse);

        if (typeof callback === 'function') {
          callback({ success: false, message: errorResponse });
        }
      }
    });

    const healthInterval = setInterval(() => {
      const health = agentOrchestrator.getAgentHealth();
      socket.emit('agent:health', health);
    }, 5000);

    socket.on('disconnect', () => {
      logger.info(`Agent client disconnected: ${socket.id}`);
      clearInterval(healthInterval);
    });
  });
};

export { agentOrchestrator };
