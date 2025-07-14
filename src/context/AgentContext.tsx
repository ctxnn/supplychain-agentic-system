import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AgentOrchestrator } from '../agents/AgentOrchestrator';
import { AgentMessage } from '../agents/types';
import { useWebSocket } from './WebSocketContext';

interface AgentContextType {
  orchestrator: AgentOrchestrator;
  messages: AgentMessage[];
  agentHealth: Record<string, unknown>;
  sendMessage: (input: string) => Promise<string>;
  updateInventory: (storeId: string, sku: string, quantity: number) => Promise<void>;
  setRouteOptimization: (mode: 'time' | 'fuel' | 'distance') => Promise<void>;
}

const AgentContext = createContext<AgentContextType | null>(null);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orchestrator] = useState(() => new AgentOrchestrator());
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [agentHealth, setAgentHealth] = useState<Record<string, unknown>>({});
  const { isConnected, registerHandler } = useWebSocket();

  // Handle incoming WebSocket messages
  useEffect(() => {
    // Register a handler for agent messages
    const unregister = registerHandler((message: AgentMessage) => {
      setMessages(prev => [...prev, message]);
    });

    // Initial sync
    setMessages(orchestrator.getMessageHistory());
    setAgentHealth(orchestrator.getAgentHealth());

    return unregister;
  }, [registerHandler, orchestrator]);

  const sendMessage = useCallback(async (input: string): Promise<string> => {
    // Only use orchestrator for message handling
    return orchestrator.handleCustomerChat(input);
  }, [orchestrator]);

  const updateInventory = async (storeId: string, sku: string, quantity: number): Promise<void> => {
    await orchestrator.updateInventory(storeId, sku, quantity);
  };

  const setRouteOptimization = async (mode: 'time' | 'fuel' | 'distance'): Promise<void> => {
    await orchestrator.setRouteOptimization(mode);
  };

  return (
    <AgentContext.Provider value={{
      orchestrator,
      messages,
      agentHealth,
      sendMessage,
      updateInventory,
      setRouteOptimization
    }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgents = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
};