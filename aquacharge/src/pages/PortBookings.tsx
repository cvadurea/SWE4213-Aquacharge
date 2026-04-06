import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BookingCard from '@/components/BookingCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const BOOKING_API_BASE = 'http://localhost:3003';
const PORT_API_BASE = 'http://localhost:3006';

interface PortBookingsProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function PortBookings({ onLogout, onNavigate }: PortBookingsProps) {
  const [portId, setPortId] = useState<string | number | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (!stored) {
          setError('Please log in again.');
          setIsLoading(false);
          return;
        }

        const user = JSON.parse(stored);
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

        setPortId(matchedPort.id);

        const bookingsResponse = await fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}`);
        const bookingsData = await bookingsResponse.json();
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      } catch (err) {
        console.error('Error loading port bookings:', err);
        setError('Could not connect to booking service.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, []);

  const navigation = [
    { label: 'Dashboard', id: 'dashboard' },
    { label: 'Bookings', id: 'bookings' },
    { label: 'My Port', id: 'my-port' },
    { label: 'Profile', id: 'profile' },
  ];

  return (
    <DashboardLayout
      title="Bookings"
      subtitle="Review bookings at your port"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="bookings"
      onNavigate={onNavigate}
      userType="port_operator"
    >
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Bookings {portId ? `for Port #${portId}` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active bookings found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  id={booking.id}
                  chargerId={booking.charger_id}
                  startTime={booking.start_time}
                  endTime={booking.end_time}
                  status={booking.status}
                  v2gInfo={
                    booking.v2g_transaction
                      ? {
                          energyDischarged: booking.v2g_transaction.energy_discharged,
                          pricePerKwh: booking.v2g_transaction.price_per_kwh,
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