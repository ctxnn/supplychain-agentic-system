import React, { createContext, useContext, useEffect, useState } from 'react';
import { AgentOrchestrator } from '../agents/AgentOrchestrator';
import { AgentMessage } from '../agents/types';

interface AgentContextType {
  orchestrator: AgentOrchestrator;
  messages: AgentMessage[];
  agentHealth: Record<string, any>;
  sendMessage: (input: string) => Promise<string>;
  updateInventory: (storeId: string, sku: string, quantity: number) => Promise<void>;
  setRouteOptimization: (mode: 'time' | 'fuel' | 'distance') => Promise<void>;
}

const AgentContext = createContext<AgentContextType | null>(null);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orchestrator] = useState(() => new AgentOrchestrator());
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [agentHealth, setAgentHealth] = useState<Record<string, any>>({});

  useEffect(() => {
    // Update messages and health periodically
    const interval = setInterval(() => {
      setMessages(orchestrator.getMessageHistory());
      setAgentHealth(orchestrator.getAgentHealth());
    }, 1000);

    return () => clearInterval(interval);
  }, [orchestrator]);

  const sendMessage = async (input: string): Promise<string> => {
    return await orchestrator.handleCustomerChat(input);
  };

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