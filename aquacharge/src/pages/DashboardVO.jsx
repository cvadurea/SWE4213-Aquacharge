import React, { useState, useEffect, useMemo } from 'react';
import SidebarVO from '../components/SidebarVO';

const BOOKING_API_BASE = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3003';

const DashboardVO = ({ onLogout, onNavigate }) => {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [pricePerKwh, setPricePerKwh] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  const getStoredUser = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    try {
      return JSON.parse(userData);
    } catch (err) {
      console.error('Error parsing user data:', err);
      return null;
    }
  };

  const parseResponseBody = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    const text = await response.text();
    return { message: text || 'Unexpected response from server' };
  };

  const loadBookingsAndPrice = async () => {
    const stored = getStoredUser();
    const token = localStorage.getItem('token');

    if (!stored?.id || !token) {
      setError('Unable to load dashboard data. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);

      const bookingsPromise = fetch(
        `${BOOKING_API_BASE}/bookings/user/${encodeURIComponent(stored.id)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const pricePromise = fetch(`${BOOKING_API_BASE}/v2g/price`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const [bookingsRes, priceRes] = await Promise.all([bookingsPromise, pricePromise]);
      const bookingsData = await parseResponseBody(bookingsRes);
      const priceData = await parseResponseBody(priceRes);

      if (!bookingsRes.ok) {
        setError(bookingsData.message || `Failed to fetch bookings (HTTP ${bookingsRes.status}).`);
      } else {
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      }

      if (priceRes.ok && typeof priceData.price_per_kwh !== 'undefined') {
        setPricePerKwh(Number(priceData.price_per_kwh));
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Could not connect to booking service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookingsAndPrice();
  }, []);

  const upcomingBookings = useMemo(() => {
    const now = Date.now();
    return bookings
      .filter((b) => b.status === 'confirmed' && new Date(b.start_time).getTime() > now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 5);
  }, [bookings]);

  const last30DaysEarnings = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    return bookings.reduce((sum, b) => {
      if (!b.v2g_transaction) return sum;
      const createdAt = new Date(b.v2g_transaction.created_at || b.start_time).getTime();
      if (createdAt < cutoff) return sum;
      const payment = Number(b.v2g_transaction.payment);
      return sum + (Number.isFinite(payment) ? payment : 0);
    }, 0);
  }, [bookings]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <SidebarVO onNavigate={onNavigate} onLogout={onLogout} />
      <main className="flex-1 p-6" style={{ marginLeft: 175 }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold">Welcome, {user?.first_name || 'Vessel Owner'}</h1>
              <p className="text-gray-400 mt-2">Vessel Owner Dashboard</p>
            </div>
          </div>

          {error && <p className="text-red-400 mb-4">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Total V2G Earnings (Last 30 Days)</p>
              <p className="mt-2 text-3xl font-semibold">
                ${last30DaysEarnings.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Current V2G Price</p>
              <p className="mt-2 text-3xl font-semibold">
                {pricePerKwh != null ? `$${pricePerKwh.toFixed(2)} / kW` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Upcoming Bookings</p>
              <p className="mt-2 text-3xl font-semibold">{upcomingBookings.length}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Next Bookings</h2>
            </div>
            {isLoading ? (
              <p className="text-slate-300">Loading bookings...</p>
            ) : upcomingBookings.length === 0 ? (
              <p className="text-slate-300">No upcoming bookings.</p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300"
                  >
                    <p className="font-semibold">
                      Booking #{b.id} • Charger {b.charger_id}
                    </p>
                    <p>
                      Start: {new Date(b.start_time).toLocaleString()}
                    </p>
                    <p>
                      End: {new Date(b.end_time).toLocaleString()}
                    </p>
                    {b.type === 'bidirectional' && b.v2g_transaction && (
                      <p className="text-emerald-400 mt-1">
                        V2G • {b.v2g_transaction.energy_discharged} kW @ $
                        {Number(b.v2g_transaction.price_per_kwh).toFixed(2)}/kW
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardVO;
