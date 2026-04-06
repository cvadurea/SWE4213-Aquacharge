import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BookingCard from '@/components/BookingCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, Zap, Loader2, Filter, CheckCircle2 } from 'lucide-react';

const BOOKING_API_BASE = 'http://localhost:3003';

interface Booking {
  id: string;
  charger_id: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  v2g_transaction?: {
    energy_discharged: number;
    price_per_kwh: number;
    payment: number;
  };
}

interface MyBookingsProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

type FilterType = 'all' | 'confirmed' | 'pending' | 'cancelled';

export default function MyBookings({ onNavigate, onLogout }: MyBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);

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

  const parseResponseBody = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    const text = await response.text();
    return { message: text || 'Unexpected response from server' };
  };

  const loadBookings = async () => {
    const stored = getStoredUser();
    const token = localStorage.getItem('token');

    if (!stored?.id || !token) {
      setError('Unable to load bookings. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);

      const response = await fetch(
        `${BOOKING_API_BASE}/bookings/user/${encodeURIComponent(stored.id)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

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

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Missing auth token. Please log in again.');
      return;
    }

    const confirmed = window.confirm('Cancel this booking? This will make the timeslot available again.');
    if (!confirmed) return;

    try {
      setCancelingBookingId(bookingId);
      setError('');
      setSuccess('');

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

      setBookings((prev) =>
        prev.map((booking) =>
          String(booking.id) === String(bookingId)
            ? { ...booking, status: 'cancelled' }
            : booking
        )
      );
      setSuccess(`Booking #${bookingId} cancelled successfully. The timeslot is now available for booking.`);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError('Could not connect to booking service.');
    } finally {
      setCancelingBookingId(null);
    }
  };

  const canCancelBooking = (booking: Booking) => {
    const statusCancelable = booking.status === 'confirmed' || booking.status === 'pending';
    const endTime = new Date(booking.end_time).getTime();
    return statusCancelable && endTime > Date.now();
  };

  const filteredBookings = useMemo(() => {
    if (filterStatus === 'all') {
      return bookings;
    }
    return bookings.filter((b) => b.status === filterStatus);
  }, [bookings, filterStatus]);

  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [filteredBookings]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      totalEarnings: bookings.reduce((sum, b) => {
        if (b.v2g_transaction?.payment) {
          return sum + Number(b.v2g_transaction.payment);
        }
        return sum;
      }, 0),
    };
  }, [bookings]);

  const navigation = [
    { label: 'Dashboard', id: 'dashboard', icon: <Zap className="h-4 w-4" /> },
    { label: 'Find Chargers', id: 'find-chargers', icon: <Calendar className="h-4 w-4" /> },
    { label: 'My Bookings', id: 'my-bookings', icon: <Calendar className="h-4 w-4" /> },
    { label: 'My Vessels', id: 'my-vessels', icon: <Zap className="h-4 w-4" /> },
    { label: 'Profile', id: 'profile', icon: <Zap className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout
      title="My Bookings"
      subtitle="View and manage your charging bookings"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="my-bookings"
      onNavigate={onNavigate}
      userType="vessel_owner"
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-accent/10 p-4 border border-accent/20">
          <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-accent">{success}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Bookings</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Confirmed</p>
            <p className="mt-2 text-2xl font-bold text-secondary">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Pending</p>
            <p className="mt-2 text-2xl font-bold text-yellow-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">V2G Earnings</p>
            <p className="mt-2 text-2xl font-bold text-accent">${stats.totalEarnings.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
          className="gap-1"
        >
          <Filter className="h-3 w-3" />
          All ({stats.total})
        </Button>
        <Button
          variant={filterStatus === 'confirmed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('confirmed')}
        >
          Confirmed ({stats.confirmed})
        </Button>
        <Button
          variant={filterStatus === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('pending')}
        >
          Pending ({stats.pending})
        </Button>
        <Button
          variant={filterStatus === 'cancelled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('cancelled')}
        >
          Cancelled ({stats.cancelled})
        </Button>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-secondary animate-spin mr-3" />
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      ) : sortedBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {filterStatus === 'all'
                ? 'No bookings yet'
                : `No ${filterStatus} bookings`}
            </p>
            <Button onClick={() => onNavigate('find-chargers')}>
              Find Chargers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Recent Bookings Section */}
          {sortedBookings.slice(0, 5).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {filterStatus === 'all' ? 'Recent Bookings' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Bookings`}
                </CardTitle>
                <CardDescription>
                  Showing {sortedBookings.length} booking{sortedBookings.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      id={booking.id}
                      chargerId={booking.charger_id}
                      startTime={booking.start_time}
                      endTime={booking.end_time}
                      status={booking.status as any}
                      v2gInfo={
                        booking.type === 'bidirectional' && booking.v2g_transaction
                          ? {
                              energyDischarged: booking.v2g_transaction.energy_discharged,
                              pricePerKwh: booking.v2g_transaction.price_per_kwh,
                            }
                          : undefined
                      }
                      footerAction={
                        canCancelBooking(booking) ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            disabled={cancelingBookingId === booking.id}
                            onClick={() => handleCancelBooking(String(booking.id))}
                          >
                            {cancelingBookingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Bookings Section */}
          {sortedBookings.length > 5 && (
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedBookings.slice(5).map((booking) => (
                    <BookingCard
                      key={booking.id}
                      id={booking.id}
                      chargerId={booking.charger_id}
                      startTime={booking.start_time}
                      endTime={booking.end_time}
                      status={booking.status as any}
                      v2gInfo={
                        booking.type === 'bidirectional' && booking.v2g_transaction
                          ? {
                              energyDischarged: booking.v2g_transaction.energy_discharged,
                              pricePerKwh: booking.v2g_transaction.price_per_kwh,
                            }
                          : undefined
                      }
                      footerAction={
                        canCancelBooking(booking) ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            disabled={cancelingBookingId === booking.id}
                            onClick={() => handleCancelBooking(String(booking.id))}
                          >
                            {cancelingBookingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex gap-3">
        <Button onClick={() => onNavigate('find-chargers')} className="gap-2">
          <Calendar className="h-4 w-4" />
          Find More Chargers
        </Button>
        <Button variant="outline" onClick={() => loadBookings()} className="gap-2">
          <Zap className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </DashboardLayout>
  );
}
