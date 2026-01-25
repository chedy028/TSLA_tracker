import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Landing Page
import { LandingPage } from './components/landing';

// Auth components
import LoginPage from './components/auth/LoginPage';
import AuthCallback from './components/auth/AuthCallback';

// Main components
import PriceChart from './components/PriceChart';
import PriceHero from './components/PriceHero';
import ValuationBadge from './components/ValuationBadge';
import RulesLegend from './components/RulesLegend';

// Chat components
import AIChatWidget from './components/chat/AIChatWidget';

// Payment components
import PayWall from './components/payment/PayWall';
import SubscriptionStatus from './components/payment/SubscriptionStatus';

// Alerts
import AlertSettings from './components/alerts/AlertSettings';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import { useStockData } from './hooks/useStockData';

// Dashboard component for authenticated users
const Dashboard = () => {
  const { price, loading, error } = useStockData();
  const { subscription } = useSubscription();
  const isPremium = subscription?.status === 'active';

  return (
    <div className="dashboard">
      <PriceHero />
      <PriceChart />
      <ValuationBadge />
      <RulesLegend />

      {/* Premium features */}
      {isPremium ? (
        <>
          <AIChatWidget />
          <AlertSettings />
        </>
      ) : (
        <PayWall />
      )}

      <SubscriptionStatus />
    </div>
  );
};

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          {/* Public Landing Page */}
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
          />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
