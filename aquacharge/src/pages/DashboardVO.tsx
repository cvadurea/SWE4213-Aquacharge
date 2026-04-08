import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import BookingCard from '@/components/BookingCard';
import { getVONavigation } from '@/lib/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap, TrendingUp, Calendar, Bell } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const BOOKING_API_BASE = 'http://localhost:3003';

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

interface UserNotification {
  id: number;
  title: string;
  message: string;
  created_at: string;
}

// Demo data initialization (commented out by default).
// Uncomment this block and the demo toggle inside loadBookingsAndPrice()
// when you want populated dashboard data without relying on backend state.
// const DEMO_DASHBOARD_BOOKINGS: Booking[] = [
//   {
//     id: 'demo-1',
//     charger_id: '2',
//     start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
//     end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
//     status: 'completed',
//     type: 'bidirectional',
//     v2g_transaction: {
//       energy_discharged: 40,
//       price_per_kwh: 0.22,
//       payment: 8.8,
//     },
//   },
//   {
//     id: 'demo-2',
//     charger_id: '2',
//     start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
//     end_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
//     status: 'completed',
//     type: 'bidirectional',
//     v2g_transaction: {
//       energy_discharged: 55,
//       price_per_kwh: 0.21,
//       payment: 11.55,
//     },
//   },
//   {
//     id: 'demo-3',
//     charger_id: '3',
//     start_time: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
//     end_time: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
//     status: 'completed',
//     type: 'bidirectional',
//     v2g_transaction: {
//       energy_discharged: 62,
//       price_per_kwh: 0.2,
//       payment: 12.4,
//     },
//   },
//   {
//     id: 'demo-4',
//     charger_id: '5',
//     start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
//     end_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
//     status: 'confirmed',
//     type: 'regular',
//   },
// ];

export default function DashboardVO({ onLogout, onNavigate }: DashboardVOProps) {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pricePerKwh, setPricePerKwh] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [error, setError] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingNotifications, setIsMarkingNotifications] = useState(false);
  const [dismissingNotificationId, setDismissingNotificationId] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'energy' | 'revenue'>('energy');

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

      // Demo mode toggle (commented out by default).
      // Uncomment the lines below to bootstrap the dashboard with mock data.
      // setBookings(DEMO_DASHBOARD_BOOKINGS);
      // setPricePerKwh(0.22);
      // setIsLoading(false);
      // return;

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

      const notificationsPromise = fetch(
        `${BOOKING_API_BASE}/notifications/user/${encodeURIComponent(stored.id)}?unreadOnly=true&limit=5`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const [bookingsRes, priceRes, notificationsRes] = await Promise.all([
        bookingsPromise,
        pricePromise,
        notificationsPromise,
      ]);
      const bookingsData = await parseResponseBody(bookingsRes);
      const priceData = await parseResponseBody(priceRes);
      const notificationsData = await parseResponseBody(notificationsRes);

      if (!bookingsRes.ok) {
        setError(bookingsData.message || `Failed to fetch bookings (HTTP ${bookingsRes.status}).`);
      } else {
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      }

      if (priceRes.ok && typeof priceData.price_per_kwh !== 'undefined') {
        setPricePerKwh(Number(priceData.price_per_kwh));
      }

      if (notificationsRes.ok) {
        setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
        setNotificationError('');
      } else {
        setNotificationError(
          notificationsData.message || `Failed to load notifications (HTTP ${notificationsRes.status}).`
        );
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Could not connect to booking service.');
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationsAsRead = async () => {
    const stored = getStoredUser();
    const token = localStorage.getItem('token');

    if (!stored?.id || !token || notifications.length === 0) {
      return;
    }

    try {
      setIsMarkingNotifications(true);
      const response = await fetch(
        `${BOOKING_API_BASE}/notifications/user/${encodeURIComponent(stored.id)}/read-all`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await parseResponseBody(response);
        setNotificationError(data.message || `Failed to mark notifications as read (HTTP ${response.status}).`);
        return;
      }

      setNotifications([]);
      setNotificationError('');
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      setNotificationError('Could not update notification state.');
    } finally {
      setIsMarkingNotifications(false);
    }
  };

  const dismissNotification = async (notificationId: number) => {
    const stored = getStoredUser();
    const token = localStorage.getItem('token');

    if (!stored?.id || !token) {
      setNotificationError('Missing auth information. Please log in again.');
      return;
    }

    try {
      setDismissingNotificationId(notificationId);
      const response = await fetch(
        `${BOOKING_API_BASE}/notifications/user/${encodeURIComponent(stored.id)}/${encodeURIComponent(String(notificationId))}/read`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await parseResponseBody(response);
        setNotificationError(data.message || `Failed to dismiss notification (HTTP ${response.status}).`);
        return;
      }

      setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
      setNotificationError('');
    } catch (err) {
      console.error('Error dismissing notification:', err);
      setNotificationError('Could not dismiss notification.');
    } finally {
      setDismissingNotificationId(null);
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

  const last30DaysDischargedEnergy = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;

    return bookings.reduce((sum, booking) => {
      if (!booking.v2g_transaction) return sum;

      const completedAt = new Date(booking.end_time).getTime();
      if (completedAt < cutoff) return sum;

      const energyDischarged = Number(booking.v2g_transaction.energy_discharged);
      return sum + (Number.isFinite(energyDischarged) ? energyDischarged : 0);
    }, 0);
  }, [bookings]);

  const dischargeChartData = useMemo(() => {
    const today = new Date();
    const dayMap = new Map<string, { energy: number; revenue: number }>();

    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      dayMap.set(key, { energy: 0, revenue: 0 });
    }

    bookings.forEach((booking) => {
      if (booking.status !== 'completed' || booking.type !== 'bidirectional' || !booking.v2g_transaction) {
        return;
      }

      const completedAt = new Date(booking.end_time);
      if (Number.isNaN(completedAt.getTime())) {
        return;
      }

      const key = completedAt.toISOString().slice(0, 10);
      if (!dayMap.has(key)) {
        return;
      }

      const current = dayMap.get(key) || { energy: 0, revenue: 0 };
      const energy = Number(booking.v2g_transaction.energy_discharged);
      const payment = Number(booking.v2g_transaction.payment);
      dayMap.set(key, {
        energy: current.energy + (Number.isFinite(energy) ? energy : 0),
        revenue: current.revenue + (Number.isFinite(payment) ? payment : 0),
      });
    });

    return Array.from(dayMap.entries()).map(([date, values]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      energy: values.energy,
      revenue: values.revenue,
    }));
  }, [bookings]);

  const dischargeChartConfig = {
    energy: {
      label: 'Energy discharged',
      color: '#22c55e',
    },
    revenue: {
      label: 'V2G revenue',
      color: '#f59e0b',
    },
  };

  const activeBarColor = chartMode === 'energy' ? '#22c55e' : '#f59e0b';

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

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-secondary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Alerts about V2G price changes from port operators
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={notifications.length === 0 || isMarkingNotifications}
              onClick={markNotificationsAsRead}
            >
              {isMarkingNotifications ? 'Marking...' : 'Mark all as read'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notificationError && (
            <p className="text-sm text-destructive mb-3">{notificationError}</p>
          )}
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new notifications.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Dismiss notification"
                      disabled={dismissingNotificationId === notification.id}
                      onClick={() => dismissNotification(notification.id)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      {dismissingNotificationId === notification.id ? '...' : 'x'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <MetricCard
          label="V2G Earnings (Last 30 Days)"
          value={`$${last30DaysEarnings.toFixed(2)}`}
          icon={<TrendingUp className="h-5 w-5 text-accent" />}
          trend="up"
          trendValue="+12% from last month"
        />
        <MetricCard
          label="Discharged Energy (Last 30 Days)"
          value={`${last30DaysDischargedEnergy.toFixed(1)} kWh`}
          icon={<Zap className="h-5 w-5 text-secondary" />}
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

      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>
                {chartMode === 'energy' ? 'Daily Energy Discharge' : 'Daily V2G Revenue'}
              </CardTitle>
              <CardDescription>
                Interactive bar graph for the last 30 days
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={chartMode === 'energy' ? 'default' : 'outline'}
                onClick={() => setChartMode('energy')}
              >
                Daily Discharge
              </Button>
              <Button
                size="sm"
                variant={chartMode === 'revenue' ? 'default' : 'outline'}
                onClick={() => setChartMode('revenue')}
              >
                Daily V2G Revenue
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={dischargeChartConfig} className="h-[320px] w-full">
            <BarChart
              key={`bar-chart-${chartMode}`}
              data={dischargeChartData}
              margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={2}
                tickMargin={8}
              />
              <YAxis
                key={`y-axis-${chartMode}`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
                tickFormatter={(value) =>
                  chartMode === 'revenue'
                    ? `$${Number(value).toFixed(0)}`
                    : Number(value).toFixed(0)
                }
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={
                  <ChartTooltipContent
                    labelKey="label"
                    indicator="dot"
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-6">
                        <span className="text-muted-foreground">
                          {chartMode === 'energy' ? 'Energy discharged' : 'V2G revenue'}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {chartMode === 'energy'
                            ? `${Number(value).toFixed(1)} kWh`
                            : `$${Number(value).toFixed(2)}`}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey={chartMode}
                fill={activeBarColor}
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationDuration={650}
                animationEasing="ease-in-out"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

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
