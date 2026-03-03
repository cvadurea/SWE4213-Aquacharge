import React, { useState, useEffect } from 'react';
import SidebarVO from '../components/SidebarVO';

const DashboardVO = ({ onLogout, onNavigate }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <SidebarVO onNavigate={onNavigate} onLogout={onLogout} />
      <main className="flex-1 p-6"></main>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Welcome, {user?.first_name || 'Vessel Owner'}</h1>
            <p className="text-gray-400 mt-2">Vessel Owner Dashboard</p>
          </div>
          </div>
        </div>
    </div>
  );
};

export default DashboardVO;
