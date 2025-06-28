import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  ShoppingCart,
  MapPin,
  Clock,
  CheckCircle,
  Truck,
  Package,
  Search,
  Plus,
  Bot
} from 'lucide-react';
import { useSupplyChain } from '../context/SupplyChainContext';
import { useAgents } from '../context/AgentContext';

const CustomerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useSupplyChain();
  const { sendMessage } = useAgents();
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'track'>('chat');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant' as const,
      content: "Hello! I'm your AI shopping assistant powered by LangGraph. I can help you find products, place orders, and track deliveries using natural language. What can I help you with today?",
      timestamp: new Date()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isProcessing) return;
    
    const userMessage = {
      role: 'user' as const,
      content: chatInput,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    setIsProcessing(true);

    try {
      // Send message to AI agent
      const response = await sendMessage(chatInput);
      
      const assistantMessage = {
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, assistantMessage]);

      // Simulate order creation for demo
      if (chatInput.toLowerCase().includes('order') || chatInput.toLowerCase().includes('buy')) {
        const newOrder = {
          id: `ORD-${Date.now()}`,
          customerId: 'CUST-AI',
          items: [
            { sku: 'SKU-001', name: 'AI Recommended Product', quantity: 1, price: 19.99 }
          ],
          status: 'pending' as const,
          storeId: 'STORE-001',
          createdAt: new Date(),
          estimatedDelivery: new Date(Date.now() + 3600000)
        };

        dispatch({ type: 'ADD_ORDER', payload: newOrder });
        dispatch({ 
          type: 'ADD_NOTIFICATION', 
          payload: { message: `AI Agent processed order ${newOrder.id}`, type: 'success' }
        });
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant' as const,
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusIcons = {
    pending: Clock,
    confirmed: CheckCircle,
    shipped: Truck,
    delivered: Package,
    cancelled: ArrowLeft
  };

  const statusColors = {
    pending: 'text-yellow-500 bg-yellow-50',
    confirmed: 'text-blue-500 bg-blue-50',
    shipped: 'text-orange-500 bg-orange-50',
    delivered: 'text-green-500 bg-green-50',
    cancelled: 'text-red-500 bg-red-50'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50"
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Customer Portal</h1>
                <p className="text-gray-600 text-sm">LangGraph AI-Powered Shopping Experience</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-primary-500" />
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">AI Agent Active</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex space-x-1 mb-8 bg-white/50 p-1 rounded-2xl backdrop-blur-sm border border-white/20"
        >
          {[
            { id: 'chat', label: 'AI Assistant', icon: MessageCircle },
            { id: 'orders', label: 'My Orders', icon: ShoppingCart },
            { id: 'track', label: 'Track Orders', icon: MapPin }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Chat Interface */}
        {activeTab === 'chat' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
                <Bot className="w-5 h-5 mr-2 text-primary-500" />
                LangGraph AI Shopping Assistant
              </h2>
              <p className="text-gray-600">Powered by advanced AI agents for natural language ordering</p>
            </div>
            
            <div className="h-96 p-6 overflow-y-auto">
              <div className="space-y-4">
                {chatHistory.map((message, index) => (
                  <div key={index} className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'justify-end' : ''
                  }`}>
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`rounded-2xl p-4 max-w-xs ${
                      message.role === 'user' 
                        ? 'bg-primary-500 text-white rounded-tr-sm' 
                        : 'bg-gray-50 text-gray-800 rounded-tl-sm'
                    }`}>
                      <p>{message.content}</p>
                      <p className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    )}
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm p-4 max-w-xs">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Try: 'I need some groceries for dinner' or 'Order 2 bananas and yogurt'"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6"
          >
            {state.orders.map((order, index) => {
              const StatusIcon = statusIcons[order.status];
              return (
                <motion.div
                  key={order.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/80 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColors[order.status]}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{order.id}</h3>
                        <p className="text-gray-600 text-sm">{order.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg"></div>
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-medium text-gray-900">${item.price}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-sm text-gray-600">
                      Total: ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                    </div>
                    {order.estimatedDelivery && (
                      <div className="text-sm text-gray-600">
                        ETA: {order.estimatedDelivery.toLocaleString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Track Orders Tab */}
        {activeTab === 'track' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Live Order Tracking</h2>
              
              {state.orders.filter(o => o.status === 'shipped').map((order) => (
                <div key={order.id} className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Truck className="w-6 h-6 text-blue-500" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{order.id}</h3>
                        <p className="text-gray-600 text-sm">AI-optimized route in progress</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">15 min</p>
                      <p className="text-gray-600 text-sm">AI Estimated</p>
                    </div>
                  </div>
                  
                  <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-2" />
                      <p>AI-powered live GPS tracking map</p>
                      <p className="text-sm">Route optimized by LangGraph agents</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { status: 'Order Confirmed', time: '2:30 PM', completed: true },
                      { status: 'AI Route Calculated', time: '2:35 PM', completed: true },
                      { status: 'Out for Delivery', time: '3:15 PM', completed: true },
                      { status: 'Delivered', time: 'Expected 3:30 PM', completed: false }
                    ].map((step, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${step.completed ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className={`${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                            {step.status}
                          </span>
                          <span className="text-gray-500 text-sm">{step.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {state.orders.filter(o => o.status === 'shipped').length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4" />
                  <p>No orders currently in transit</p>
                  <p className="text-sm">Try placing an order through the AI assistant!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CustomerPortal;