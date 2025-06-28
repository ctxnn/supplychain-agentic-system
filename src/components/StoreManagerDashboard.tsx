import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Store,
  Package,
  AlertTriangle,
  TrendingUp,
  Users,
  ShoppingCart,
  Activity,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { useSupplyChain } from '../context/SupplyChainContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const StoreManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useSupplyChain();
  const [selectedStore, setSelectedStore] = useState(state.stores[0].id);

  const selectedStoreData = state.stores.find(s => s.id === selectedStore);
  const storeInventory = state.inventory.filter(item => item.storeId === selectedStore);
  const storeOrders = state.orders.filter(order => order.storeId === selectedStore);

  const inventoryData = storeInventory.map(item => ({
    name: item.name,
    available: item.quantity - item.reserved,
    reserved: item.reserved,
    total: item.quantity
  }));

  const categoryData = storeInventory.reduce((acc, item) => {
    const existing = acc.find(cat => cat.name === item.category);
    if (existing) {
      existing.value += item.quantity;
    } else {
      acc.push({ name: item.category, value: item.quantity });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ['#0071ce', '#ff6900', '#22c55e', '#f59e0b', '#ef4444'];

  const lowStockItems = storeInventory.filter(item => item.quantity < 10);

  const handleRestockItem = (sku: string) => {
    dispatch({
      type: 'UPDATE_INVENTORY',
      payload: { storeId: selectedStore, sku, quantity: 50 }
    });
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { message: `Restock order placed for ${sku}`, type: 'success' }
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
                <h1 className="text-xl font-bold text-gray-900">Store Manager Dashboard</h1>
                <p className="text-gray-600 text-sm">Real-time inventory & operations monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {state.stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  selectedStoreData?.status === 'active' ? 'bg-green-400' :
                  selectedStoreData?.status === 'maintenance' ? 'bg-yellow-400' : 'bg-red-400'
                } animate-pulse`}></div>
                <span className="text-sm text-gray-600 capitalize">{selectedStoreData?.status}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Store Info Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedStoreData?.name}</h2>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedStoreData?.address}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-600 text-sm">Store Manager</p>
              <p className="font-semibold text-gray-900">{selectedStoreData?.manager}</p>
            </div>
          </div>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {[
            { 
              label: 'Total Orders Today', 
              value: storeOrders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length,
              icon: ShoppingCart,
              color: 'from-blue-500 to-blue-600',
              change: '+12%'
            },
            { 
              label: 'Items in Stock', 
              value: storeInventory.reduce((sum, item) => sum + item.quantity, 0),
              icon: Package,
              color: 'from-green-500 to-green-600',
              change: '+3%'
            },
            { 
              label: 'Low Stock Alerts', 
              value: lowStockItems.length,
              icon: AlertTriangle,
              color: 'from-yellow-500 to-yellow-600',
              change: '-2'
            },
            { 
              label: 'Revenue Today', 
              value: '$12,450',
              icon: TrendingUp,
              color: 'from-purple-500 to-purple-600',
              change: '+8%'
            }
          ].map((metric, index) => (
            <div
              key={metric.label}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/80 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-r ${metric.color} rounded-xl flex items-center justify-center`}>
                  <metric.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {metric.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-gray-600 text-sm">{metric.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Inventory Chart */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Levels</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="available" stackId="a" fill="#0071ce" />
                <Bar dataKey="reserved" stackId="a" fill="#ff6900" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Category Distribution */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Low Stock Alerts */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                Low Stock Alerts
              </h3>
              <span className="text-sm text-gray-600">{lowStockItems.length} items need attention</span>
            </div>
          </div>
          
          <div className="p-6">
            {lowStockItems.length > 0 ? (
              <div className="space-y-4">
                {lowStockItems.map((item, index) => (
                  <motion.div
                    key={item.sku}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-gray-600 text-sm">SKU: {item.sku} • Category: {item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-600">{item.quantity}</p>
                        <p className="text-gray-600 text-sm">units left</p>
                      </div>
                      <button
                        onClick={() => handleRestockItem(item.sku)}
                        className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-300 flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Restock</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4" />
                <p>All items are well stocked!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StoreManagerDashboard;