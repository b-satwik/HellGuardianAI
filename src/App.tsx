import React from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

export const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="relative min-h-screen w-full bg-[#04070C] flex flex-col justify-center items-center font-mono font-bold text-[#00D4FF]">
        <div className="animate-spin text-4xl mb-4">/</div>
        <div className="text-glow-blue select-none tracking-widest">ESTABLISHING ENCRYPTED SESSION...</div>
      </div>
    );
  }

  return user ? <DashboardPage /> : <LoginPage />;
};
