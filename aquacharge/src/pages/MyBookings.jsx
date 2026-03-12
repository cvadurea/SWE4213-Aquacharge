import React, { useEffect, useState } from 'react';
import SidebarVO from '../components/SidebarVO';

const BOOKING_API_BASE = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3003';

const MyBookings = ({ onNavigate, onLogout }) => {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancellingId, setIsCancellingId] = useState(null);
    const [error, setError] = useState('');

    const getStoredUser = () => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            return null;
        }

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

    const loadBookings = async () => {
        const user = getStoredUser();
        const token = localStorage.getItem('token');

        if (!user?.id || !token) {
            setError('Unable to load booking session. Please log in again.');
            setIsLoading(false);
            return;
        }

        try {
            setError('');
            setIsLoading(true);

            const response = await fetch(`${BOOKING_API_BASE}/bookings/user/${encodeURIComponent(user.id)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await parseResponseBody(response);
            if (!response.ok) {
                setError(data.message || `Failed to fetch bookings (HTTP ${response.status}).`);
                return;
            }

            setBookings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading bookings:', err);
            setError('Could not connect to booking service.');
        } finally {
            setIsLoading(false);
        }
    };

    const cancelBooking = async (bookingId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Missing auth token. Please log in again.');
            return;
        }

        try {
            setError('');
            setIsCancellingId(bookingId);

            const response = await fetch(`${BOOKING_API_BASE}/bookings/${encodeURIComponent(bookingId)}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await parseResponseBody(response);
            if (!response.ok) {
                setError(data.message || `Failed to cancel booking (HTTP ${response.status}).`);
                return;
            }

            await loadBookings();
        } catch (err) {
            console.error('Error cancelling booking:', err);
            setError('Could not connect to booking service.');
        } finally {
            setIsCancellingId(null);
        }
    };

    useEffect(() => {
        loadBookings();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
            <SidebarVO onNavigate={onNavigate} onLogout={onLogout} />

            <main className="flex-1 p-6" style={{ marginLeft: 175 }}>
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold">My Bookings</h1>
                        <p className="text-gray-400 mt-2">View and manage your charger bookings</p>
                    </div>

                    {error && <p className="text-red-400 mb-4">{error}</p>}

                    {isLoading ? (
                        <p className="text-slate-300">Loading bookings...</p>
                    ) : bookings.length === 0 ? (
                        <p className="text-slate-300">No bookings found.</p>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking) => (
                                <div key={booking.id} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                                    <p className="font-semibold text-lg">Booking #{booking.id}</p>
                                    <p className="text-sm text-slate-300 mt-1">Port: {booking.port_id} • Charger: {booking.charger_id}</p>
                                    <p className="text-sm text-slate-300">Vessel: {booking.vessel_id}</p>
                                    <p className="text-sm text-slate-300">
                                        Start: {new Date(booking.start_time).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-slate-300">
                                        End: {new Date(booking.end_time).toLocaleString()}
                                    </p>
                                    <p className="text-sm mt-1">
                                        Status:{' '}
                                        <span
                                            className={
                                                booking.status === 'cancelled'
                                                    ? 'text-amber-400'
                                                    : booking.status === 'confirmed'
                                                    ? 'text-emerald-400'
                                                    : 'text-slate-300'
                                            }
                                        >
                                            {booking.status}
                                        </span>
                                    </p>

                                    {booking.status !== 'cancelled' && (
                                        <button
                                            type="button"
                                            onClick={() => cancelBooking(booking.id)}
                                            disabled={isCancellingId === booking.id}
                                            className="mt-3 px-3 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-60"
                                        >
                                            {isCancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MyBookings;
