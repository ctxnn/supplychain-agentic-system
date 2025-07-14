import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import Dashboard from './components/Dashboard';
import CustomerPortal from './components/CustomerPortal';
import StoreManagerDashboard from './components/StoreManagerDashboard';
import DeliveryAgentApp from './components/DeliveryAgentApp';
import InventoryAgent from './components/InventoryAgent';
import RouteOptimization from './components/RouteOptimization';
import AgentCommunication from './components/AgentCommunication';
import { SupplyChainProvider } from './context/SupplyChainContext';
import { AgentProvider } from './context/AgentContext';
import { WebSocketProvider } from './context/WebSocketContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <WebSocketProvider>
      <AgentProvider>
        <SupplyChainProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen"
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customer" element={
                  <ErrorBoundary>
                    <CustomerPortal />
                  </ErrorBoundary>
                } />
                <Route path="/store-manager" element={<StoreManagerDashboard />} />
                <Route path="/delivery" element={<DeliveryAgentApp />} />
                <Route path="/inventory" element={<InventoryAgent />} />
                <Route path="/routing" element={<RouteOptimization />} />
                <Route path="/communications" element={<AgentCommunication />} />
              </Routes>
            </motion.div>
          </div>
        </Router>
        </SupplyChainProvider>
      </AgentProvider>
    </WebSocketProvider>
  );
}

export default App;