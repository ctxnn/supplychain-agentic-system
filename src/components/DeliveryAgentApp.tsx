import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  Package,
  Phone
} from 'lucide-react';
import { useSupplyChain } from '../context/SupplyChainContext';

const DeliveryAgentApp: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useSupplyChain();

  const deliveryOrders = state.orders.filter(order => order.status === 'shipped');

  const handleStatusUpdate = (orderId: string, status: 'delivered' | 'cancelled') => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status } });
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { message: `Order ${orderId} marked as ${status}`, type: 'success' }
    });
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
                <h1 className="text-xl font-bold text-gray-900">Delivery Agent</h1>
                <p className="text-gray-600 text-sm">Mobile delivery management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">On Route</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Active Deliveries */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-gray-900">Active Deliveries</h2>
          
          {deliveryOrders.length > 0 ? (
            deliveryOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{order.id}</h3>
                      <p className="text-gray-600 text-sm">Customer: {order.customerId}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                    In Transit
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Items</h4>
                    {order.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center justify-between py-1">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="text-gray-600">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Delivery Info</h4>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>ETA: {order.estimatedDelivery?.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>GPS Tracking Active</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'delivered')}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Delivered</span>
                  </button>
                  <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Call Customer</span>
                  </button>
                  <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center space-x-2">
                    <Navigation className="w-4 h-4" />
                    <span>Navigate</span>
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4" />
              <p>No active deliveries</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DeliveryAgentApp;