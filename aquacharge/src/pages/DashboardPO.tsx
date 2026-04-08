import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import { getPONavigation } from '@/lib/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap, DollarSign, Settings, BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const BOOKING_API_BASE = 'http://localhost:3003';
const PORT_API_BASE = 'http://localhost:3006';
const FLEET_API_BASE = 'http://localhost:3004';

interface DashboardPOProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

interface BookingRecord {
  id: number | string;
  vessel_id: number | string;
  end_time: string;
  status: string;
  type?: string;
  v2g_energy_discharged?: number;
  v2g_price_per_kwh?: number;
  v2g_transaction?: {
    energy_discharged?: number;
    price_per_kwh?: number;
    payment?: number;
  };
}

interface Vessel {
  id: number;
  vessel_name: string;
  registration_number: string;
}

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DashboardPO({ onLogout, onNavigate }: DashboardPOProps) {
  const [user, setUser] = useState<any>(null);
  const [portId, setPortId] = useState<number | null>(null);
  const [pricePerKwh, setPricePerKwh] = useState<number | null>(null);
  const [completedBookings, setCompletedBookings] = useState<BookingRecord[]>([]);
  const [vesselsById, setVesselsById] = useState<Record<string, Vessel>>({});
  const [selectedVesselId, setSelectedVesselId] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'energy' | 'revenue'>('energy');
  const [newPrice, setNewPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

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

  const parseResponseBody = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    const text = await response.text();
    return { message: text || 'Unexpected response from server' };
  };

  const loadDashboardData = async () => {
    try {
      setError('');
      setIsLoadingAnalytics(true);

      const stored = localStorage.getItem('user');
      if (!stored) {
        setError('Please log in again.');
        return;
      }

      const parsedUser = JSON.parse(stored);
      const [priceResponse, portsResponse, vesselsResponse] = await Promise.all([
        fetch(`${BOOKING_API_BASE}/v2g/price`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`${PORT_API_BASE}/ports`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`${FLEET_API_BASE}/vessels`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      const priceData = await parseResponseBody(priceResponse);
      const portsData = await parseResponseBody(portsResponse);
      const vesselsData = await parseResponseBody(vesselsResponse);

      if (!priceResponse.ok) {
        setError(priceData.message || `Failed to load V2G price (HTTP ${priceResponse.status}).`);
      } else if (typeof priceData.price_per_kwh !== 'undefined') {
        const value = Number(priceData.price_per_kwh);
        setPricePerKwh(value);
        setNewPrice(value.toFixed(2));
      }

      const matchedPort = Array.isArray(portsData)
        ? portsData.find((item) => item.owner_email === parsedUser.email)
        : null;

      if (!matchedPort) {
        setError('No port found for this account.');
        setCompletedBookings([]);
        return;
      }

      setPortId(Number(matchedPort.id));

      const completedResponse = await fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}?status=completed`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const completedData = await parseResponseBody(completedResponse);

      if (!completedResponse.ok) {
        setError(completedData.message || `Failed to load completed bookings (HTTP ${completedResponse.status}).`);
      } else {
        setCompletedBookings(Array.isArray(completedData) ? completedData : []);
      }

      const vesselMap: Record<string, Vessel> = {};
      if (Array.isArray(vesselsData)) {
        vesselsData.forEach((vessel) => {
          vesselMap[String(vessel.id)] = {
            id: Number(vessel.id),
            vessel_name: vessel.vessel_name || `Vessel #${vessel.id}`,
            registration_number: vessel.registration_number || 'N/A',
          };
        });
      }
      setVesselsById(vesselMap);
    } catch (err) {
      console.error('Error loading PO dashboard data:', err);
      setError('Could not connect to services.');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSavePrice = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(newPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Price per kW must be a positive number.');
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

  const navigation = getPONavigation();

  const vesselOptions = useMemo(() => {
    const vesselIds = new Set(completedBookings.map((booking) => String(booking.vessel_id)));
    return Array.from(vesselIds)
      .map((id) => ({
        id,
        label: vesselsById[id]
          ? `${vesselsById[id].vessel_name} (${vesselsById[id].registration_number})`
          : `Vessel #${id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [completedBookings, vesselsById]);

  const selectedLabel = selectedVesselId === 'all'
    ? 'All vessels'
    : vesselOptions.find((option) => option.id === selectedVesselId)?.label || `Vessel #${selectedVesselId}`;

  const filteredCompletedBookings = useMemo(() => {
    if (selectedVesselId === 'all') {
      return completedBookings;
    }

    return completedBookings.filter((booking) => String(booking.vessel_id) === selectedVesselId);
  }, [completedBookings, selectedVesselId]);

  const last30DaysEarnings = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;

    return filteredCompletedBookings.reduce((sum, booking) => {
      const completedAt = new Date(booking.end_time).getTime();
      if (completedAt < cutoff) return sum;

      const transactionPayment = Number(booking.v2g_transaction?.payment);
      if (Number.isFinite(transactionPayment) && transactionPayment > 0) {
        return sum + transactionPayment;
      }

      const energy = Number(booking.v2g_transaction?.energy_discharged ?? booking.v2g_energy_discharged);
      const price = Number(booking.v2g_transaction?.price_per_kwh ?? booking.v2g_price_per_kwh);
      if (!Number.isFinite(energy) || !Number.isFinite(price)) {
        return sum;
      }

      return sum + energy * price;
    }, 0);
  }, [filteredCompletedBookings]);

  const last30DaysOutput = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;

    return filteredCompletedBookings.reduce((sum, booking) => {
      const completedAt = new Date(booking.end_time).getTime();
      if (completedAt < cutoff) return sum;

      const energy = Number(booking.v2g_transaction?.energy_discharged ?? booking.v2g_energy_discharged);
      return sum + (Number.isFinite(energy) ? energy : 0);
    }, 0);
  }, [filteredCompletedBookings]);

  const chartData = useMemo(() => {
    const today = new Date();
    const dayMap = new Map<string, { energy: number; revenue: number }>();

    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      const key = toLocalDateKey(date);
      dayMap.set(key, { energy: 0, revenue: 0 });
    }

    filteredCompletedBookings.forEach((booking) => {
      const completedAt = new Date(booking.end_time);
      if (Number.isNaN(completedAt.getTime())) {
        return;
      }

      const key = toLocalDateKey(completedAt);
      if (!dayMap.has(key)) {
        return;
      }

      const energy = Number(booking.v2g_transaction?.energy_discharged ?? booking.v2g_energy_discharged);
      const payment = Number(booking.v2g_transaction?.payment);
      const fallbackPrice = Number(booking.v2g_transaction?.price_per_kwh ?? booking.v2g_price_per_kwh);
      const revenue = Number.isFinite(payment)
        ? payment
        : (Number.isFinite(energy) && Number.isFinite(fallbackPrice) ? energy * fallbackPrice : 0);

      const current = dayMap.get(key) || { energy: 0, revenue: 0 };
      dayMap.set(key, {
        energy: current.energy + (Number.isFinite(energy) ? energy : 0),
        revenue: current.revenue + (Number.isFinite(revenue) ? revenue : 0),
      });
    });

    return Array.from(dayMap.entries()).map(([date, values]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      energy: values.energy,
      revenue: values.revenue,
    }));
  }, [filteredCompletedBookings]);

  const chartConfig = {
    energy: {
      label: 'Energy output',
      color: '#22c55e',
    },
    revenue: {
      label: 'Earnings',
      color: '#f59e0b',
    },
  };

  const activeBarColor = chartMode === 'energy' ? '#22c55e' : '#f59e0b';

  return (
    <DashboardLayout
      title={`Welcome, ${user?.first_name || 'Port Operator'}`}
      subtitle="Manage your port and V2G pricing"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="dashboard"
      onNavigate={onNavigate}
      userType="port_operator"
    >
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-accent/10 p-4 border border-accent/20">
          <Zap className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-accent">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <MetricCard
          label="Current V2G Discharge Price"
          value={pricePerKwh != null ? `$${pricePerKwh.toFixed(2)} / kW` : '—'}
          icon={<DollarSign className="h-5 w-5 text-secondary" />}
        />
        <MetricCard
          label={`${selectedLabel} Earnings (30 Days)`}
          value={`$${last30DaysEarnings.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5 text-accent" />}
        />
        <MetricCard
          label={`${selectedLabel} Output (30 Days)`}
          value={`${last30DaysOutput.toFixed(1)} kWh`}
          icon={<Zap className="h-5 w-5 text-secondary" />}
        />
        <MetricCard
          label="System Status"
          value="Operational"
          icon={<Zap className="h-5 w-5 text-accent" />}
        />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {chartMode === 'energy' ? '30-Day Energy Output' : '30-Day Earnings'}
              </CardTitle>
              <CardDescription>
                View totals across all vessels or filter to a single vessel
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={chartMode === 'energy' ? 'default' : 'outline'}
                onClick={() => setChartMode('energy')}
              >
                Output
              </Button>
              <Button
                size="sm"
                variant={chartMode === 'revenue' ? 'default' : 'outline'}
                onClick={() => setChartMode('revenue')}
              >
                Earnings
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant={selectedVesselId === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedVesselId('all')}
            >
              Total (All Vessels)
            </Button>
            {vesselOptions.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant={selectedVesselId === option.id ? 'default' : 'outline'}
                onClick={() => setSelectedVesselId(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAnalytics ? (
            <p className="text-sm text-muted-foreground">Loading analytics...</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <BarChart
                key={`po-chart-${chartMode}-${selectedVesselId}`}
                data={chartData}
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
                  key={`po-y-axis-${chartMode}`}
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
                            {chartMode === 'energy' ? 'Energy output' : 'Earnings'}
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
                  dataKey={chartMode === 'energy' ? 'energy' : 'revenue'}
                  fill={activeBarColor}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            V2G Price Management
          </CardTitle>
          <CardDescription>
            Set the discharge price for vessel-to-grid transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePrice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price per kW
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  disabled={isSaving}
                  placeholder="0.20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Currency
                </label>
                <div className="px-4 py-2 rounded-lg border border-border bg-input text-foreground">
                  USD
                </div>
              </div>
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? 'Saving...' : 'Update Price'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This price will be displayed to all vessel owners on their dashboards.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Links {portId ? `for Port #${portId}` : ''}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={() => onNavigate('bookings')}
            className="block w-full text-left px-4 py-2 rounded-lg hover:bg-muted transition-colors text-secondary font-medium"
          >
            View All Bookings →
          </button>
          <button
            onClick={() => onNavigate('my-port')}
            className="block w-full text-left px-4 py-2 rounded-lg hover:bg-muted transition-colors text-secondary font-medium"
          >
            Manage Port & Chargers →
          </button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
