import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Route,
  MapPin,
  Clock,
  Truck,
  Zap,
  Navigation,

  Target
} from 'lucide-react';
import { useSupplyChain } from '../context/SupplyChainContext';

const RouteOptimization: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useSupplyChain();
  const [optimizationMode, setOptimizationMode] = useState<'time' | 'fuel' | 'distance'>('time');

  const activeRoutes = state.orders.filter(order => order.status === 'shipped');
  const routeMetrics = {
    totalRoutes: activeRoutes.length,
    avgDeliveryTime: '23 min',
    fuelSavings: '15%',
    onTimeDelivery: '94.2%'
  };

  const optimizationOptions = [
    { id: 'time', label: 'Fastest Route', icon: Clock, description: 'Minimize delivery time' },
    { id: 'fuel', label: 'Fuel Efficient', icon: Zap, description: 'Reduce fuel consumption' },
    { id: 'distance', label: 'Shortest Distance', icon: Target, description: 'Minimize total distance' }
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
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Route Optimization</h1>
                <p className="text-gray-600 text-sm">AI-powered delivery route planning</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live Optimization</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          {[
            { label: 'Active Routes', value: routeMetrics.totalRoutes, icon: Route, color: 'from-blue-500 to-blue-600' },
            { label: 'Avg Delivery Time', value: routeMetrics.avgDeliveryTime, icon: Clock, color: 'from-green-500 to-green-600' },
            { label: 'Fuel Savings', value: routeMetrics.fuelSavings, icon: Zap, color: 'from-yellow-500 to-yellow-600' },
            { label: 'On-Time Delivery', value: routeMetrics.onTimeDelivery, icon: Target, color: 'from-purple-500 to-purple-600' }
          ].map((metric) => (
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

        {/* Optimization Controls */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Strategy</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {optimizationOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setOptimizationMode(option.id as any)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  optimizationMode === option.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <option.icon className={`w-5 h-5 ${
                    optimizationMode === option.id ? 'text-primary-600' : 'text-gray-600'
                  }`} />
                  <span className={`font-medium ${
                    optimizationMode === option.id ? 'text-primary-900' : 'text-gray-900'
                  }`}>
                    {option.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 text-left">{option.description}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Route Map Placeholder */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Route Visualization</h3>
          <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Interactive Route Map</p>
              <p>Real-time delivery tracking and route optimization would appear here</p>
            </div>
          </div>
        </motion.div>

        {/* Active Routes */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Active Delivery Routes</h3>
          </div>
          
          <div className="p-6">
            {activeRoutes.length > 0 ? (
              <div className="space-y-4">
                {activeRoutes.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{order.id}</h4>
                        <p className="text-gray-600 text-sm">
                          {order.items.length} items • ETA: {order.estimatedDelivery?.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">12.3 km</p>
                        <p className="text-xs text-gray-500">Optimized route</p>
                      </div>
                      <button className="px-3 py-1 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition-colors flex items-center space-x-1">
                        <Navigation className="w-4 h-4" />
                        <span>View Route</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Route className="w-12 h-12 mx-auto mb-4" />
                <p>No active routes to optimize</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RouteOptimization;