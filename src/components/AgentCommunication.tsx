import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Users,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useSupplyChain } from '../context/SupplyChainContext';

const AgentCommunication: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useSupplyChain();
  const [newMessage, setNewMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('all');

  const agents = [
    'Customer Agent',
    'Inventory Agent',
    'Delivery Agent',
    'Route Agent',
    'Store Manager Agent',
    'Notification Agent'
  ];

  const messageTypes = {
    order: { icon: MessageSquare, color: 'text-blue-500 bg-blue-50' },
    inventory: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-50' },
    route: { icon: Activity, color: 'text-green-500 bg-green-50' },
    notification: { icon: Zap, color: 'text-purple-500 bg-purple-50' },
    emergency: { icon: AlertTriangle, color: 'text-red-500 bg-red-50' }
  };

  const filteredMessages = selectedAgent === 'all' 
    ? state.agentMessages 
    : state.agentMessages.filter(msg => msg.from === selectedAgent || msg.to === selectedAgent);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: `MSG-${Date.now()}`,
      from: 'System Admin',
      to: selectedAgent === 'all' ? 'All Agents' : selectedAgent,
      type: 'notification' as const,
      content: newMessage,
      timestamp: new Date(),
      status: 'sent' as const
    };

    dispatch({ type: 'ADD_AGENT_MESSAGE', payload: message });
    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Agent Communications</h1>
                <p className="text-gray-600 text-sm">Inter-agent messaging & coordination</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">{agents.length} Agents Online</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          {[
            { label: 'Total Messages', value: state.agentMessages.length, icon: MessageSquare, color: 'from-blue-500 to-blue-600' },
            { label: 'Active Agents', value: agents.length, icon: Users, color: 'from-green-500 to-green-600' },
            { label: 'Messages Today', value: state.agentMessages.filter(m => 
              new Date(m.timestamp).toDateString() === new Date().toDateString()
            ).length, icon: Activity, color: 'from-purple-500 to-purple-600' },
            { label: 'Response Time', value: '1.2s', icon: Clock, color: 'from-orange-500 to-orange-600' }
          ].map((metric, index) => (
            <div
              key={metric.label}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-r ${metric.color} rounded-xl flex items-center justify-center`}>
                  <metric.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-gray-600 text-sm">{metric.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Message Feed */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Message Feed</h3>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="px-3 py-1 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="all">All Agents</option>
                  {agents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="h-96 overflow-y-auto p-6">
              <div className="space-y-4">
                {filteredMessages.slice().reverse().map((message, index) => {
                  const MessageIcon = messageTypes[message.type].icon;
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start space-x-3 p-4 bg-gray-50/50 rounded-xl"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${messageTypes[message.type].color}`}>
                        <MessageIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{message.from}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-600">{message.to}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-800 text-sm">{message.content}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            message.status === 'processed' ? 'bg-green-100 text-green-800' :
                            message.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {message.status === 'processed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {message.status}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">{message.type}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Send message to agents..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Agent Status */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Agent Status</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {agents.map((agent, index) => (
                  <motion.div
                    key={agent}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="font-medium text-gray-900">{agent}</span>
                    </div>
                    <span className="text-xs text-gray-500">Online</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AgentCommunication;