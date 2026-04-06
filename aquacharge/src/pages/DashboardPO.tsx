import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import { getPONavigation } from '@/lib/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap, DollarSign, Settings } from 'lucide-react';

const BOOKING_API_BASE = 'http://localhost:3003';

interface DashboardPOProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function DashboardPO({ onLogout, onNavigate }: DashboardPOProps) {
  const [user, setUser] = useState<any>(null);
  const [pricePerKwh, setPricePerKwh] = useState<number | null>(null);
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

  const parseResponseBody = async (response: Response) => {
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
      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-accent/10 p-4 border border-accent/20">
          <Zap className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-accent">{success}</p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <MetricCard
          label="Current V2G Discharge Price"
          value={pricePerKwh != null ? `$${pricePerKwh.toFixed(2)} / kW` : '—'}
          icon={<DollarSign className="h-5 w-5 text-secondary" />}
        />
        <MetricCard
          label="System Status"
          value="Operational"
          icon={<Zap className="h-5 w-5 text-accent" />}
        />
      </div>

      {/* Price Management Card */}
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

      {/* Additional Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
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
