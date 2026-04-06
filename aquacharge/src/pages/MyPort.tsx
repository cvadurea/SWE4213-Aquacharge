import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getPONavigation } from '@/lib/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus, PlugZap } from 'lucide-react';

const PORT_API_BASE = 'http://localhost:3006';

interface MyPortProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function MyPort({ onLogout, onNavigate }: MyPortProps) {
  const [port, setPort] = useState<any>(null);
  const [chargers, setChargers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPort = async () => {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setError('Please log in again.');
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(userData);

      try {
        const portsResponse = await fetch(`${PORT_API_BASE}/ports`);
        const ports = await portsResponse.json();
        const matchedPort = Array.isArray(ports)
          ? ports.find((item) => item.owner_email === user.email)
          : null;

        if (!matchedPort) {
          setError('No port found for this account.');
          setIsLoading(false);
          return;
        }

        setPort(matchedPort);

        const chargersResponse = await fetch(`${PORT_API_BASE}/ports/${matchedPort.id}/chargers`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            'Content-Type': 'application/json',
          },
        });
        const chargersData = await chargersResponse.json();
        setChargers(Array.isArray(chargersData) ? chargersData : []);
      } catch (err) {
        console.error('Error loading port data:', err);
        setError('Could not connect to port service.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPort();
  }, []);

  const navigation = getPONavigation();

  return (
    <DashboardLayout
      title="My Port"
      subtitle="Manage your port and chargers"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="my-port"
      onNavigate={onNavigate}
      userType="port_operator"
    >
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Port Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {isLoading ? (
              <p>Loading port information...</p>
            ) : port ? (
              <>
                <p><span className="font-medium text-foreground">Name:</span> {port.port_name}</p>
                <p><span className="font-medium text-foreground">Address:</span> {port.address}</p>
                <p><span className="font-medium text-foreground">Capacity:</span> {port.capacity}</p>
                <p><span className="font-medium text-foreground">Available Points:</span> {port.available_charging_points}</p>
              </>
            ) : (
              <p>No port found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="h-5 w-5" /> Chargers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chargers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chargers registered yet.</p>
            ) : (
              <div className="space-y-3">
                {chargers.map((charger) => (
                  <div key={charger.id} className="rounded-lg border border-border px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Charger #{charger.id}</span>
                      <span className="text-muted-foreground capitalize">{charger.type}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {charger.is_available ? 'Available' : 'Unavailable'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Button className="mt-4 gap-2" onClick={() => onNavigate('bookings')}>
              <Plus className="h-4 w-4" /> View Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}