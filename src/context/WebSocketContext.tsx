import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import io, { Socket } from 'socket.io-client';
import { AgentMessage, MessageType } from '../agents/types';

// Define the shape of the context state
interface WebSocketContextType {
  isConnected: boolean;
  messages: AgentMessage[];
  agents: string[];
  sendToAgent: (
    agentId: string,
    type: MessageType,
    content: string,
    data?: Record<string, unknown>
  ) => void;
  broadcast: (
    type: MessageType,
    content: string,
    data?: Record<string, unknown>
  ) => void;
  registerHandler: (handler: (message: AgentMessage) => void) => void;
  unregisterHandler: (handler: (message: AgentMessage) => void) => void;
}

// Create the context with a default undefined value
const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

// Custom hook to use the WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Provider component
export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messageHandlers = useRef<((message: AgentMessage) => void)[]>([]);

  const getSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io('ws://localhost:3001', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }
    return socketRef.current;
  }, []);

  const handleConnect = useCallback(() => {
    console.log('WebSocket connected');
    setIsConnected(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('WebSocket disconnected');
    setIsConnected(false);
  }, []);

  const handleAgentMessage = useCallback((message: AgentMessage) => {
    console.log('Received agent message:', message);
    setMessages(prev => [...prev, message]);

    // Notify all registered handlers
    messageHandlers.current.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }, []);

  const handleAgentList = useCallback((agentList: string[]) => {
    console.log('Received agent list:', agentList);
    setAgents(agentList);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('agent-message', handleAgentMessage);
      socket.on('agent-list', handleAgentList);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('agent-message', handleAgentMessage);
        socket.off('agent-list', handleAgentList);
        if (socket.connected) {
          socket.disconnect();
        }
      };
    }
  }, [getSocket, handleConnect, handleDisconnect, handleAgentMessage, handleAgentList]);

  const registerHandler = useCallback((handler: (message: AgentMessage) => void) => {
    messageHandlers.current.push(handler);
  }, []);

  const unregisterHandler = useCallback((handler: (message: AgentMessage) => void) => {
    messageHandlers.current = messageHandlers.current.filter(h => h !== handler);
  }, []);

  const sendToAgent = useCallback(
    (
      agentId: string,
      type: MessageType,
      content: string,
      data: Record<string, unknown> = {}
    ) => {
      const socket = getSocket();
      const message = { to: agentId, type, content, data, from: 'frontend' };
      socket.emit('agent-message', message);
    },
    [getSocket]
  );

  const broadcast = useCallback(
    (type: MessageType, content: string, data: Record<string, unknown> = {}) => {
      const socket = getSocket();
      const message = { type, content, data, from: 'frontend' };
      socket.emit('broadcast', message);
    },
    [getSocket]
  );

  const value = {
    isConnected,
    messages,
    agents,
    sendToAgent,
    broadcast,
    registerHandler,
    unregisterHandler,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
