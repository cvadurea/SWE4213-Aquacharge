import React, { useState, useEffect } from 'react';
import SidebarPO from '../components/SidebarPO';

const BOOKING_API_BASE = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3003';

const DashboardPO = ({ onLogout, onNavigate }) => {
  const [user, setUser] = useState(null);
  const [pricePerKwh, setPricePerKwh] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const parseResponseBody = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    const text = await response.text();
    return { message: text || 'Unexpected response from server' };
  };

  const loadPrice = async () => {
    try {
      setError('');
      const response = await fetch(`${BOOKING_API_BASE}/v2g/price`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await parseResponseBody(response);
      if (!response.ok) {
        setError(data.message || `Failed to load V2G price (HTTP ${response.status}).`);
        return;
      }
      if (typeof data.price_per_kwh !== 'undefined') {
        const value = Number(data.price_per_kwh);
        setPricePerKwh(value);
        setNewPrice(value.toFixed(2));
      }
    } catch (err) {
      console.error('Error loading V2G price:', err);
      setError('Could not connect to booking service.');
    }
  };

  useEffect(() => {
    loadPrice();
  }, []);

  const handleSavePrice = async (event) => {
    event.preventDefault();
    const parsed = Number(newPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Price per kWh must be a positive number.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const response = await fetch(`${BOOKING_API_BASE}/v2g/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_per_kwh: parsed }),
      });
      const data = await parseResponseBody(response);
      if (!response.ok) {
        setError(data.message || `Failed to update V2G price (HTTP ${response.status}).`);
        return;
      }
      setPricePerKwh(Number(data.price_per_kwh));
      setNewPrice(Number(data.price_per_kwh).toFixed(2));
      setSuccess('Price updated successfully. Vessel owner dashboards will reflect this new value.');
    } catch (err) {
      console.error('Error updating V2G price:', err);
      setError('Could not connect to booking service.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <SidebarPO onNavigate={onNavigate} onLogout={onLogout} />
      <main className="flex-1 p-6" style={{ marginLeft: 175 }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold">Welcome, {user?.first_name || 'Port Operator'}</h1>
              <p className="text-gray-400 mt-2">Port Operator Dashboard</p>
            </div>
          </div>

          {error && <p className="text-red-400 mb-4">{error}</p>}
          {success && <p className="text-emerald-400 mb-4">{success}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Current V2G Discharge Price</p>
              <p className="mt-2 text-3xl font-semibold">
                {pricePerKwh != null ? `$${pricePerKwh.toFixed(2)} / kWh` : '—'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400 mb-2">Update V2G Price</p>
              <form onSubmit={handleSavePrice} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full sm:w-32 p-2 rounded bg-slate-800 border border-slate-700"
                  placeholder="0.20"
                />
                <span className="text-sm text-slate-400">USD / kWh</span>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPO;