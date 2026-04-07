import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BookingCard from '@/components/BookingCard';
import { getPONavigation } from '@/lib/navigation';
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
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [verificationBookings, setVerificationBookings] = useState<any[]>([]);
  const [selectedVerificationBookingId, setSelectedVerificationBookingId] = useState<string | number | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const parseResponseBody = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    const text = await response.text();
    return { message: text || 'Unexpected response from server' };
  };

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

        const [activeResponse, verificationResponse] = await Promise.all([
          fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}?status=active`),
          fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}?status=verification`),
        ]);

        const activeData = await parseResponseBody(activeResponse);
        const verificationData = await parseResponseBody(verificationResponse);

        setActiveBookings(Array.isArray(activeData) ? activeData : []);
        setVerificationBookings(Array.isArray(verificationData) ? verificationData : []);
        setSelectedVerificationBookingId(null);
      } catch (err) {
        console.error('Error loading port bookings:', err);
        setError('Could not connect to booking service.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, []);

  const handleVerification = async (bookingId: string | number, verified: boolean) => {
    try {
      setError('');

      const response = await fetch(`${BOOKING_API_BASE}/bookings/${encodeURIComponent(String(bookingId))}/verification`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verified }),
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        setError(data.message || `Failed to update verification (HTTP ${response.status}).`);
        return;
      }

      setVerificationBookings((prev) => prev.filter((booking) => String(booking.id) !== String(bookingId)));
    } catch (err) {
      console.error('Error updating verification:', err);
      setError('Could not connect to booking service.');
    }
  };

  const navigation = getPONavigation();

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
          <CardTitle>Bookings {portId ? `for Port #${portId}` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading bookings...</p>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="mb-3 text-lg font-semibold">Pending Verification</h3>
                {verificationBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings pending verification.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {verificationBookings.map((booking) => (
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
                            : booking.v2g_energy_discharged
                              ? {
                                  energyDischarged: booking.v2g_energy_discharged,
                                  pricePerKwh: booking.v2g_price_per_kwh || 0,
                                }
                              : undefined
                        }
                        v2gLabel="Promised energy"
                        onClick={() => setSelectedVerificationBookingId(booking.id)}
                        footerAction={
                          <div className={`grid grid-cols-2 gap-2 ${String(selectedVerificationBookingId) === String(booking.id) ? 'ring-2 ring-primary/30 rounded-md p-1' : ''}`}>
                            <button
                              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                              onClick={() => handleVerification(booking.id, true)}
                            >
                              Confirm verification
                            </button>
                            <button
                              className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                              onClick={() => handleVerification(booking.id, false)}
                            >
                              Failed verification
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold">Active Bookings</h3>
                {activeBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active bookings found.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {activeBookings.map((booking) => (
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}