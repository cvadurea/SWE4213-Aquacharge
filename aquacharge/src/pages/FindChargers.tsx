import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChargerCard from '@/components/ChargerCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, MapPin, Zap, Calendar, Loader2, CheckCircle } from 'lucide-react';

const PORT_API_BASE = 'http://localhost:3006';
const FLEET_API_BASE = 'http://localhost:3004';
const BOOKING_API_BASE = 'http://localhost:3003';

interface Port {
  id: string;
  name: string;
  location?: string;
}

interface Charger {
  id: string;
  type: string;
  port_id: string;
  is_available: boolean;
}

interface Vessel {
  id: string;
  vessel_name: string;
  is_primary: boolean;
}

interface Timeslot {
  start: string;
  end: string;
}

interface FindChargersProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export default function FindChargers({ onNavigate, onLogout }: FindChargersProps) {
  const [ports, setPorts] = useState<Port[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [primaryVessel, setPrimaryVessel] = useState<Vessel | null>(null);
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [availableChargers, setAvailableChargers] = useState<Charger[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [pendingTimeslot, setPendingTimeslot] = useState<Timeslot | null>(null);
  const [showBookingTypeModal, setShowBookingTypeModal] = useState(false);
  const [bookingType, setBookingType] = useState('regular');
  const [dischargeKwh, setDischargeKwh] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingLoadingChargerId, setBookingLoadingChargerId] = useState<string | null>(null);
  const [isPortsLoading, setIsPortsLoading] = useState(true);
  const [isChargersLoading, setIsChargersLoading] = useState(false);
  const [error, setError] = useState('');

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

  const getPorts = async () => {
    try {
      setIsPortsLoading(true);
      setError('');

      const response = await fetch(`${PORT_API_BASE}/ports`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        setError(data.message || `Failed to fetch ports (HTTP ${response.status}).`);
        return;
      }

      setPorts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching ports:', err);
      setError('Could not connect to port service.');
    } finally {
      setIsPortsLoading(false);
    }
  };

  const getVessels = async () => {
    const user = getStoredUser();
    const token = localStorage.getItem('token');

    if (!user?.id || !token) {
      setError('Unable to load vessels. Please log in again.');
      return;
    }

    try {
      const response = await fetch(`${FLEET_API_BASE}/vessels/${encodeURIComponent(user.id)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        setError(data.message || `Failed to fetch vessels (HTTP ${response.status}).`);
        return;
      }

      const vesselList = Array.isArray(data) ? data : [];
      setVessels(vesselList);

      const primary = vesselList.find((v) => v.is_primary);
      if (primary) {
        setPrimaryVessel(primary);
      } else if (vesselList.length > 0) {
        setError('No primary vessel set. Please set a primary vessel in My Vessels before booking.');
      }
    } catch (err) {
      console.error('Error fetching vessels:', err);
      setError('Could not connect to vessel service.');
    }
  };

  const getPortChargers = async (port: Port) => {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Missing auth token. Please log in again.');
      return;
    }

    try {
      setIsChargersLoading(true);
      setError('');
      setSelectedPort(port);

      const response = await fetch(`${PORT_API_BASE}/ports/${encodeURIComponent(port.id)}/chargers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired or unauthorized. Please log in again.');
        } else {
          setError(data.message || `Failed to fetch chargers (HTTP ${response.status}).`);
        }
        setAvailableChargers([]);
        return;
      }

      const chargers = Array.isArray(data) ? data : [];
      setAvailableChargers(chargers.filter((charger) => charger.is_available));
    } catch (err) {
      console.error('Error fetching chargers for port:', err);
      setError('Could not connect to port service.');
      setAvailableChargers([]);
    } finally {
      setIsChargersLoading(false);
    }
  };

  const createBooking = async (charger: Charger, timeslot: Timeslot, options: any = {}) => {
    const user = getStoredUser();

    if (!user?.id) {
      setError('Missing user information. Please log in again.');
      return false;
    }

    if (!selectedPort?.id) {
      setError('Please select a port first.');
      return false;
    }

    if (!primaryVessel?.id) {
      setError('No primary vessel set. Please set a primary vessel in My Vessels before booking.');
      return false;
    }

    if (!timeslot?.start || !timeslot?.end) {
      setError('Invalid timeslot selected.');
      return false;
    }

    try {
      setError('');
      setBookingStatus('');
      setBookingLoadingChargerId(charger.id);

      const response = await fetch(`${BOOKING_API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          vessel_id: Number(primaryVessel.id),
          port_id: selectedPort.id,
          charger_id: charger.id,
          start_time: timeslot.start,
          end_time: timeslot.end,
          booking_type: options.booking_type || 'regular',
          energy_discharged_kwh: options.energy_discharged_kwh,
        }),
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        setError(data.message || `Failed to create booking (HTTP ${response.status}).`);
        return false;
      }

      if (data?.v2g_transaction) {
        setBookingStatus(
          `Booking confirmed (V2G) for charger #${charger.id} using ${primaryVessel.vessel_name}. Discharge: ${data.v2g_transaction.energy_discharged} kW.`
        );
      } else {
        setBookingStatus(`Booking confirmed for charger #${charger.id} using ${primaryVessel.vessel_name}.`);
      }
      setShowCalendar(false);
      setSelectedCharger(null);
      setPendingTimeslot(null);
      setShowBookingTypeModal(false);
      return true;
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Could not connect to booking service.');
      return false;
    } finally {
      setBookingLoadingChargerId(null);
    }
  };

  const handleChargerClick = (charger: Charger) => {
    setSelectedCharger(charger);
    setShowCalendar(true);
  };

  const handleTimeslotSelect = (timeslot: Timeslot) => {
    setPendingTimeslot(timeslot);
    setShowCalendar(false);
    setShowBookingTypeModal(true);
  };

  const handleConfirmBooking = async () => {
    if (selectedCharger && pendingTimeslot) {
      await createBooking(selectedCharger, pendingTimeslot, {
        booking_type: bookingType,
        energy_discharged_kwh: bookingType === 'bidirectional' ? parseFloat(dischargeKwh) : undefined,
      });
    }
  };

  useEffect(() => {
    getPorts();
    getVessels();
  }, []);

  const navigation = [
    { label: 'Dashboard', id: 'dashboard', icon: <Zap className="h-4 w-4" /> },
    { label: 'Find Chargers', id: 'find-chargers', icon: <MapPin className="h-4 w-4" /> },
    { label: 'My Bookings', id: 'my-bookings', icon: <Calendar className="h-4 w-4" /> },
    { label: 'My Vessels', id: 'my-vessels', icon: <Zap className="h-4 w-4" /> },
    { label: 'Profile', id: 'profile', icon: <Zap className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout
      title="Find Chargers"
      subtitle="Browse available charging ports and book a timeslot"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="find-chargers"
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

      {/* Success Message */}
      {bookingStatus && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-accent/10 p-4 border border-accent/20">
          <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-accent">{bookingStatus}</p>
        </div>
      )}

      {/* Primary Vessel Info */}
      {primaryVessel && (
        <Card className="mb-8 bg-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Primary Vessel</p>
                <p className="text-lg font-semibold text-foreground">{primaryVessel.vessel_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ports Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Available Ports</CardTitle>
          <CardDescription>Select a port to view available chargers</CardDescription>
        </CardHeader>
        <CardContent>
          {isPortsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-secondary animate-spin mr-3" />
              <p className="text-muted-foreground">Loading ports...</p>
            </div>
          ) : ports.length === 0 ? (
            <div className="py-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No ports available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ports.map((port) => (
                <button
                  key={port.id}
                  onClick={() => getPortChargers(port)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedPort?.id === port.id
                      ? 'border-secondary bg-secondary/10'
                      : 'border-border hover:border-secondary/50 hover:bg-card'
                  }`}
                >
                  <p className="font-semibold text-foreground">{port.name}</p>
                  {port.location && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {port.location}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chargers Section */}
      {selectedPort && (
        <Card>
          <CardHeader>
            <CardTitle>Available Chargers at {selectedPort.name}</CardTitle>
            <CardDescription>Click a charger to select a booking timeslot</CardDescription>
          </CardHeader>
          <CardContent>
            {isChargersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-secondary animate-spin mr-3" />
                <p className="text-muted-foreground">Loading chargers...</p>
              </div>
            ) : availableChargers.length === 0 ? (
              <div className="py-8 text-center">
                <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No available chargers at this port</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableChargers.map((charger) => (
                  <div
                    key={charger.id}
                    onClick={() => handleChargerClick(charger)}
                    className="cursor-pointer"
                  >
                    <ChargerCard
                      id={charger.id}
                      type={charger.type}
                      portId={charger.port_id}
                      isAvailable={charger.is_available}
                      onClick={() => handleChargerClick(charger)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar Modal */}
      {showCalendar && selectedCharger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Select Timeslot</CardTitle>
              <CardDescription>Choose when you want to book charger #{selectedCharger.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Charger Type</p>
                <p className="font-semibold text-foreground">{selectedCharger.type}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Calendar integration coming soon. Please contact support to book a timeslot.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCalendar(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setPendingTimeslot({
                      start: new Date().toISOString(),
                      end: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                    });
                    setShowCalendar(false);
                    setShowBookingTypeModal(true);
                  }}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Booking Type Modal */}
      {showBookingTypeModal && selectedCharger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Booking Type</CardTitle>
              <CardDescription>Select the type of booking for charger #{selectedCharger.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setBookingType('regular')}
                >
                  <input
                    type="radio"
                    name="booking-type"
                    value="regular"
                    checked={bookingType === 'regular'}
                    onChange={(e) => setBookingType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-foreground">Regular Charging</p>
                    <p className="text-xs text-muted-foreground">Charge your vessel</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setBookingType('bidirectional')}
                >
                  <input
                    type="radio"
                    name="booking-type"
                    value="bidirectional"
                    checked={bookingType === 'bidirectional'}
                    onChange={(e) => setBookingType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-foreground">V2G (Discharge)</p>
                    <p className="text-xs text-muted-foreground">Discharge energy to grid for earnings</p>
                  </div>
                </label>
              </div>

              {bookingType === 'bidirectional' && (
                <Input
                  type="number"
                  placeholder="Energy to discharge (kWh)"
                  value={dischargeKwh}
                  onChange={(e) => setDischargeKwh(e.target.value)}
                  min="0"
                  step="0.1"
                />
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowBookingTypeModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={bookingLoadingChargerId !== null}
                  onClick={handleConfirmBooking}
                >
                  {bookingLoadingChargerId ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
