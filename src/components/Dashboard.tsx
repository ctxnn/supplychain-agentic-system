import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Store,
  Truck,
  Package,
  Route,
  MessageSquare,
  Activity,

  TrendingUp,

} from 'lucide-react';
import { useSupplyChain } from '../context/SupplyChainContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useSupplyChain();

  const agentCards = [
    {
      id: 'customer',
      title: 'Customer Portal',
      description: 'Natural language ordering & order tracking',
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
      path: '/customer',
      stats: `${state.orders.length} Active Orders`
    },
    {
      id: 'store-manager',
      title: 'Store Manager',
      description: 'Inventory monitoring & store operations',
      icon: Store,
      color: 'from-emerald-500 to-emerald-600',
      path: '/store-manager',
      stats: `${state.stores.filter(s => s.status === 'active').length} Active Stores`
    },
    {
      id: 'delivery',
      title: 'Delivery Agent',
      description: 'Route tracking & delivery status',
      icon: Truck,
      color: 'from-orange-500 to-orange-600',
      path: '/delivery',
      stats: `${state.orders.filter(o => o.status === 'shipped').length} In Transit`
    },
    {
      id: 'inventory',
      title: 'Inventory Agent',
      description: 'Stock management & automated restocking',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      path: '/inventory',
      stats: `${state.inventory.length} SKUs Tracked`
    },
    {
      id: 'routing',
      title: 'Route Optimization',
      description: 'AI-powered delivery route planning',
      icon: Route,
      color: 'from-red-500 to-red-600',
      path: '/routing',
      stats: 'Live Route Analysis'
    },
    {
      id: 'communications',
      title: 'Agent Communications',
      description: 'Inter-agent messaging & coordination',
      icon: MessageSquare,
      color: 'from-indigo-500 to-indigo-600',
      path: '/communications',
      stats: `${state.agentMessages.length} Messages`
    }
  ];

  const metrics = [
    { label: 'Active Orders', value: state.orders.filter(o => o.status !== 'delivered').length, icon: Activity, change: '+12%' },
    { label: 'Total Stores', value: state.stores.length, icon: Store, change: '+2%' },
    { label: 'Agent Messages', value: state.agentMessages.length, icon: MessageSquare, change: '+8%' },
    { label: 'Delivery Success', value: '98.5%', icon: TrendingUp, change: '+0.3%' }
  ];

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
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Supply Chain Command Center</h1>
                <p className="text-gray-600">Multi-Agent Orchestration Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">All Systems Operational</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Dashboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/80 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <metric.icon className="w-8 h-8 text-primary-500" />
                <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {metric.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-gray-600 text-sm">{metric.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Agent Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Agent Interfaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentCards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group cursor-pointer"
                onClick={() => navigate(card.path)}
              >
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/80 transition-all duration-300 hover:shadow-xl">
                  <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">{card.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary-600">{card.stats}</span>
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                      <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-primary-500" />
            Real-Time Activity Feed
          </h3>
          <div className="space-y-3">
            {state.notifications.slice(-5).reverse().map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${
                  notification.type === 'success' ? 'bg-green-400' :
                  notification.type === 'warning' ? 'bg-yellow-400' :
                  notification.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                }`}></div>
                <span className="text-gray-800 flex-1">{notification.message}</span>
                <span className="text-xs text-gray-500">
                  {notification.timestamp?.toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;