import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import BookingCard from '@/components/BookingCard';
import { getVONavigation } from '@/lib/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Zap, TrendingUp, Calendar } from 'lucide-react';
import { LOCAL_API_BASES } from '@/lib/api';

const BOOKING_API_BASE = LOCAL_API_BASES.booking;

interface DashboardVOProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

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

export default function DashboardVO({ onLogout, onNavigate }: DashboardVOProps) {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pricePerKwh, setPricePerKwh] = useState<number | null>(null);
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

  const parseResponseBody = async (response: Response) => {
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
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5);
  }, [bookings]);

  const last30DaysEarnings = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    return bookings.reduce((sum, b) => {
      if (!b.v2g_transaction) return sum;
      const createdAt = new Date(b.v2g_transaction?.payment ? b.start_time : b.start_time).getTime();
      if (createdAt < cutoff) return sum;
      const payment = Number(b.v2g_transaction.payment);
      return sum + (Number.isFinite(payment) ? payment : 0);
    }, 0);
  }, [bookings]);

  const navigation = getVONavigation();

  return (
    <DashboardLayout
      title={`Welcome, ${user?.first_name || 'Vessel Owner'}`}
      subtitle="Manage your vessel bookings and V2G earnings"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="dashboard"
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          label="V2G Earnings (Last 30 Days)"
          value={`$${last30DaysEarnings.toFixed(2)}`}
          icon={<TrendingUp className="h-5 w-5 text-accent" />}
          trend="up"
          trendValue="+12% from last month"
        />
        <MetricCard
          label="Current V2G Price"
          value={pricePerKwh != null ? `$${pricePerKwh.toFixed(2)} / kW` : '—'}
          icon={<Zap className="h-5 w-5 text-secondary" />}
        />
        <MetricCard
          label="Upcoming Bookings"
          value={upcomingBookings.length}
          icon={<Calendar className="h-5 w-5 text-secondary" />}
        />
      </div>

      {/* Next Bookings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Next Bookings</CardTitle>
          <CardDescription>
            Your upcoming confirmed bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin">
                <Zap className="h-6 w-6 text-secondary" />
              </div>
              <p className="ml-3 text-muted-foreground">Loading bookings...</p>
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No upcoming bookings.</p>
              <button
                onClick={() => onNavigate('find-chargers')}
                className="mt-4 text-secondary hover:text-secondary/80 font-medium transition-colors"
              >
                Find chargers →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  id={b.id}
                  chargerId={b.charger_id}
                  startTime={b.start_time}
                  endTime={b.end_time}
                  status={b.status as any}
                  v2gInfo={
                    b.type === 'bidirectional' && b.v2g_transaction
                      ? {
                          energyDischarged: b.v2g_transaction.energy_discharged,
                          pricePerKwh: b.v2g_transaction.price_per_kwh,
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
