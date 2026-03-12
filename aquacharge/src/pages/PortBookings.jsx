import React, { useEffect, useMemo, useState } from 'react';
import SidebarPO from '../components/SidebarPO';

const BOOKING_API_BASE = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3003';
const PORT_API_BASE = import.meta.env.VITE_PORT_API_URL || 'http://localhost:3006';
const DRAWER_WIDTH = 175;

const PortBookings = ({ onNavigate, onLogout }) => {
  const [portInfo, setPortInfo] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const loadPortInfo = async () => {
    const user = getStoredUser();
    if (!user?.email && !user?.id) {
      setError('Unable to load port operator session. Please log in again.');
      return null;
    }

    try {
      setError('');
      // Prefer linking by owner_email (consistent with MyPort)
      if (user.email) {
        const listResponse = await fetch(`${PORT_API_BASE}/ports`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const listData = await parseResponseBody(listResponse);
        if (listResponse.ok && Array.isArray(listData)) {
          const linkedPort = listData.find((p) => p.owner_email === user.email);
          if (linkedPort) {
            setPortInfo(linkedPort);
            return linkedPort;
          }
        }
      }

      // Fallback: try direct lookup by user id
      if (user.id) {
        const directResponse = await fetch(`${PORT_API_BASE}/ports/${encodeURIComponent(user.id)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const directData = await parseResponseBody(directResponse);
        if (directResponse.ok) {
          setPortInfo(directData);
          return directData;
        }
      }

      setPortInfo(null);
      setError('No linked port found for this account.');
      return null;
    } catch (err) {
      console.error('Error fetching port info:', err);
      setPortInfo(null);
      setError('Could not connect to port service.');
      return null;
    }
  };

  const buildBookingsUrl = (portId) => {
    const base = String(BOOKING_API_BASE || '').replace(/\/+$/, '');
    // Support both direct booking-service bases (http://...:3003) and gateway-style bases (http://.../api)
    // by not duplicating the /bookings segment if it's already included.
    if (base.endsWith('/bookings') || base.endsWith('/api/bookings')) {
      return `${base}/port/${encodeURIComponent(portId)}?status=active`;
    }
    return `${base}/bookings/port/${encodeURIComponent(portId)}?status=active`;
  };

  const loadBookings = async (portId, { silent = false } = {}) => {
    if (!portId) return;
    try {
      setError('');
      if (!silent) setIsRefreshing(true);
      const response = await fetch(buildBookingsUrl(portId), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await parseResponseBody(response);
      if (!response.ok) {
        setError(data.message || `Failed to fetch bookings (HTTP ${response.status}).`);
        return;
      }
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching port bookings:', err);
      setError('Could not connect to booking service.');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      setIsLoading(true);
      const port = await loadPortInfo();
      if (!isActive) return;
      await loadBookings(port?.id, { silent: true });
      if (!isActive) return;
      setIsLoading(false);
    };

    init();

    return () => {
      isActive = false;
    };
  }, []);

  const orderedBookings = useMemo(() => {
    const now = Date.now();
    const list = [...bookings];
    list.sort((a, b) => {
      const aStart = new Date(a.start_time).getTime();
      const bStart = new Date(b.start_time).getTime();
      const aKey = aStart < now ? Number.MAX_SAFE_INTEGER + aStart : aStart;
      const bKey = bStart < now ? Number.MAX_SAFE_INTEGER + bStart : bStart;
      return aKey - bKey;
    });
    return list;
  }, [bookings]);

  const bookingsByCharger = useMemo(() => {
    const map = new Map();
    orderedBookings.forEach((booking) => {
      const chargerId = booking.charger_id ?? 'Unknown';
      if (!map.has(chargerId)) map.set(chargerId, []);
      map.get(chargerId).push(booking);
    });

    return Array.from(map.entries()).sort(([a], [b]) => Number(a) - Number(b));
  }, [orderedBookings]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <SidebarPO onNavigate={onNavigate} onLogout={onLogout} />

      <main className="flex-1 p-6" style={{ marginLeft: DRAWER_WIDTH }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Bookings</h1>
            <p className="text-gray-400 mt-2">
              {portInfo?.port_name ? `Active bookings for ${portInfo.port_name}` : 'Active bookings for your port'}
            </p>
            <div className="mt-3">
              <button
                type="button"
                disabled={!portInfo?.id || isRefreshing}
                onClick={() => loadBookings(portInfo?.id)}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-600"
              >
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 mb-4">{error}</p>}

          {isLoading ? (
            <p className="text-slate-300">Loading bookings...</p>
          ) : orderedBookings.length === 0 ? (
            <p className="text-slate-300">No active bookings.</p>
          ) : (
            <div className="space-y-6">
              {bookingsByCharger.map(([chargerId, chargerBookings]) => (
                <section
                  key={String(chargerId)}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-4"
                >
                  <h2 className="text-xl font-semibold">Charger #{chargerId}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {chargerBookings.length} active booking{chargerBookings.length === 1 ? '' : 's'}
                  </p>

                  <div className="mt-4 space-y-3">
                    {chargerBookings.map((booking) => (
                      <div key={booking.id} className="rounded-lg border border-slate-700 bg-slate-950 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">Booking #{booking.id}</p>
                          <span className="text-xs px-2 py-1 rounded bg-emerald-700 text-emerald-100">
                            {booking.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-2">
                          Vessel: {booking.vessel_id} • User: {booking.user_id}
                        </p>
                        <p className="text-sm text-slate-300 mt-1">
                          Start: {new Date(booking.start_time).toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-300">
                          End: {new Date(booking.end_time).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PortBookings;

