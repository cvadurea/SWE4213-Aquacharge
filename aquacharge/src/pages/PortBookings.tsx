import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BookingCard from '@/components/BookingCard';
import { getPONavigation } from '@/lib/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

const BOOKING_API_BASE = 'http://localhost:3003';
const PORT_API_BASE = 'http://localhost:3006';
const FLEET_API_BASE = 'http://localhost:3004';
const USER_API_BASE = 'http://localhost:3007';

interface Vessel {
  id: number;
  vessel_name: string;
  registration_number: string;
}

interface BookingRecord {
  id: number | string;
  user_id: number | string;
  vessel_id: number | string;
  charger_id: number | string;
  start_time: string;
  end_time: string;
  status: string;
  v2g_transaction?: {
    energy_discharged: number;
    price_per_kwh: number;
  };
  v2g_energy_discharged?: number;
  v2g_price_per_kwh?: number;
}

type BookingCardStatus = 'confirmed' | 'pending' | 'active' | 'completed' | 'cancelled' | 'pending_verification' | 'failed';

interface PortBookingsProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

interface UserRecord {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export default function PortBookings({ onLogout, onNavigate }: PortBookingsProps) {
  const [portId, setPortId] = useState<string | number | null>(null);
  const [activeBookings, setActiveBookings] = useState<BookingRecord[]>([]);
  const [verificationBookings, setVerificationBookings] = useState<BookingRecord[]>([]);
  const [pastBookings, setPastBookings] = useState<BookingRecord[]>([]);
  const [vesselsById, setVesselsById] = useState<Record<string, Vessel>>({});
  const [usersById, setUsersById] = useState<Record<string, UserRecord>>({});
  const [vesselSearchTerm, setVesselSearchTerm] = useState('');
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

        const [activeResponse, verificationResponse, completedResponse, failedResponse, cancelledResponse, vesselsResponse, usersResponse] = await Promise.all([
          fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}?status=active`),
          fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}?status=verification`),
          fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}?status=completed`),
          fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}?status=failed`),
          fetch(`${BOOKING_API_BASE}/bookings/port/${matchedPort.id}?status=cancelled`),
          fetch(`${FLEET_API_BASE}/vessels`),
          fetch(`${USER_API_BASE}/users`),
        ]);

        const activeData = await parseResponseBody(activeResponse);
        const verificationData = await parseResponseBody(verificationResponse);
        const completedData = await parseResponseBody(completedResponse);
        const failedData = await parseResponseBody(failedResponse);
        const cancelledData = await parseResponseBody(cancelledResponse);
        const vesselsData = await parseResponseBody(vesselsResponse);
        const usersData = await parseResponseBody(usersResponse);

        const allPastBookings = [
          ...(Array.isArray(completedData) ? completedData : []),
          ...(Array.isArray(failedData) ? failedData : []),
          ...(Array.isArray(cancelledData) ? cancelledData : []),
        ].sort(
          (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime()
        );

        const vesselMap: Record<string, Vessel> = {};
        if (Array.isArray(vesselsData)) {
          vesselsData.forEach((vessel) => {
            const key = String(vessel.id);
            vesselMap[key] = {
              id: Number(vessel.id),
              vessel_name: vessel.vessel_name || `Vessel #${vessel.id}`,
              registration_number: vessel.registration_number || 'N/A',
            };
          });
        }

        const userMap: Record<string, UserRecord> = {};
        if (Array.isArray(usersData)) {
          usersData.forEach((user) => {
            const key = String(user.id);
            userMap[key] = {
              id: Number(user.id),
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
            };
          });
        }

        setActiveBookings(Array.isArray(activeData) ? activeData : []);
        setVerificationBookings(Array.isArray(verificationData) ? verificationData : []);
        setPastBookings(allPastBookings);
        setVesselsById(vesselMap);
        setUsersById(userMap);
        setSelectedVerificationBookingId(null);
      } catch (err) {
        console.error('Error loading port bookings:', err);
        setError('Could not connect to booking service.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();

    // Set up auto-refresh every 5 seconds
    const interval = window.setInterval(() => {
      setIsLoading(false); // Don't show loading spinner on auto-refresh
      void loadBookings();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
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

  const normalizeBookingStatus = (status: string): BookingCardStatus => {
    if (
      status === 'confirmed'
      || status === 'pending'
      || status === 'active'
      || status === 'completed'
      || status === 'cancelled'
      || status === 'pending_verification'
      || status === 'failed'
    ) {
      return status;
    }

    return 'pending';
  };

  const getVesselLabel = (booking: BookingRecord) => {
    const vessel = vesselsById[String(booking.vessel_id)];
    if (!vessel) {
      return `Vessel #${booking.vessel_id}`;
    }
    return `${vessel.vessel_name} (${vessel.registration_number})`;
  };

  const getVOName = (booking: BookingRecord) => {
    const user = usersById[String(booking.user_id)];
    if (!user) {
      return `VO #${booking.user_id}`;
    }

    const fullName = `${String(user.first_name || '').trim()} ${String(user.last_name || '').trim()}`.trim();
    if (fullName) {
      return fullName;
    }

    return user.email || `VO #${booking.user_id}`;
  };

  const visiblePastBookings = pastBookings.filter((booking) => {
    if (!vesselSearchTerm.trim()) {
      return true;
    }

    const term = vesselSearchTerm.toLowerCase();
    return getVOName(booking).toLowerCase().includes(term);
  });

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
                        status={normalizeBookingStatus(booking.status)}
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
                        status={normalizeBookingStatus(booking.status)}
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

              <div>
                <h3 className="mb-3 text-lg font-semibold">Past Bookings</h3>

                <div className="mb-4 space-y-3">
                  <Input
                    value={vesselSearchTerm}
                    onChange={(event) => setVesselSearchTerm(event.target.value)}
                    placeholder="Search by vessel owner (VO) name"
                  />
                </div>

                {visiblePastBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No past bookings found for the selected vessel/search.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visiblePastBookings.map((booking) => (
                      <div key={booking.id} className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                        <p className="text-xs font-medium text-muted-foreground">VO: {getVOName(booking)}</p>
                        <p className="text-xs font-medium text-muted-foreground">{getVesselLabel(booking)}</p>
                        <BookingCard
                          id={booking.id}
                          chargerId={booking.charger_id}
                          startTime={booking.start_time}
                          endTime={booking.end_time}
                          status={normalizeBookingStatus(booking.status)}
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
                        />
                      </div>
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