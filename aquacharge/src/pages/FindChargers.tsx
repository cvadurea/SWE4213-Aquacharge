import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChargerCard from '@/components/ChargerCard';
import { getVONavigation } from '@/lib/navigation';
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
  port_name?: string;
  address?: string;
  capacity?: number;
  available_charging_points?: number;
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

interface AvailabilityTimeslot extends Timeslot {
  available: boolean;
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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeslots, setTimeslots] = useState<AvailabilityTimeslot[]>([]);
  const [isTimeslotsLoading, setIsTimeslotsLoading] = useState(false);
  const [selectedStartSlot, setSelectedStartSlot] = useState<AvailabilityTimeslot | null>(null);
  const [selectedEndSlot, setSelectedEndSlot] = useState<AvailabilityTimeslot | null>(null);
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

  const handlePortSelect = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPortId = event.target.value;

    if (!selectedPortId) {
      setSelectedPort(null);
      setAvailableChargers([]);
      return;
    }

    const port = ports.find((item) => String(item.id) === String(selectedPortId));
    if (!port) {
      setError('Selected port could not be found.');
      return;
    }

    await getPortChargers(port);
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
    setSelectedStartSlot(null);
    setSelectedEndSlot(null);
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

  const toDayRange = (dateString: string) => {
    const start = new Date(`${dateString}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  };

  const loadTimeslots = async (chargerId: string, dateString: string) => {
    try {
      setIsTimeslotsLoading(true);
      setError('');

      const { start, end } = toDayRange(dateString);
      const params = new URLSearchParams({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });

      const response = await fetch(`${BOOKING_API_BASE}/chargers/${encodeURIComponent(chargerId)}/timeslots?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        setError(data.message || `Failed to fetch timeslots (HTTP ${response.status}).`);
        setTimeslots([]);
        return;
      }

      const now = new Date();
      const nextSlots: AvailabilityTimeslot[] = (Array.isArray(data?.timeslots) ? data.timeslots : [])
        .filter((slot: AvailabilityTimeslot) => new Date(slot.end) > now)
        .map((slot: AvailabilityTimeslot) => ({
          start: slot.start,
          end: slot.end,
          available: Boolean(slot.available),
        }));

      setTimeslots(nextSlots);
    } catch (err) {
      console.error('Error loading timeslots:', err);
      setError('Could not connect to booking service for timeslot availability.');
      setTimeslots([]);
    } finally {
      setIsTimeslotsLoading(false);
    }
  };

  useEffect(() => {
    if (showCalendar && selectedCharger?.id) {
      loadTimeslots(selectedCharger.id, selectedDate);
    }
  }, [showCalendar, selectedCharger?.id, selectedDate]);

  const formatSlotTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSlotIndex = (slot: AvailabilityTimeslot | null) => {
    if (!slot) return -1;
    return timeslots.findIndex((item) => item.start === slot.start && item.end === slot.end);
  };

  const isInSelectedRange = (slot: AvailabilityTimeslot) => {
    const startIndex = getSlotIndex(selectedStartSlot);
    const endIndex = getSlotIndex(selectedEndSlot || selectedStartSlot);
    const idx = getSlotIndex(slot);
    if (startIndex < 0 || endIndex < 0 || idx < 0) return false;
    return idx >= Math.min(startIndex, endIndex) && idx <= Math.max(startIndex, endIndex);
  };

  const handleSlotClick = (slot: AvailabilityTimeslot) => {
    if (!slot.available) return;

    if (!selectedStartSlot || (selectedStartSlot && selectedEndSlot)) {
      setSelectedStartSlot(slot);
      setSelectedEndSlot(null);
      return;
    }

    const startIndex = getSlotIndex(selectedStartSlot);
    const endIndex = getSlotIndex(slot);

    if (startIndex < 0 || endIndex < 0) {
      setSelectedStartSlot(slot);
      setSelectedEndSlot(null);
      return;
    }

    if (endIndex < startIndex) {
      setSelectedStartSlot(slot);
      setSelectedEndSlot(null);
      return;
    }

    const range = timeslots.slice(startIndex, endIndex + 1);
    const hasUnavailable = range.some((item) => !item.available);
    if (hasUnavailable) {
      setError('Selected range includes unavailable timeslots.');
      return;
    }

    const selectedStart = new Date(selectedStartSlot.start).getTime();
    const selectedEnd = new Date(slot.end).getTime();
    const hours = (selectedEnd - selectedStart) / (1000 * 60 * 60);
    if (hours > 4) {
      setError('Maximum booking duration is 4 hours.');
      return;
    }

    setError('');
    setSelectedEndSlot(slot);
  };

  const continueWithTimeslot = () => {
    if (!selectedStartSlot) {
      setError('Please choose at least a start timeslot.');
      return;
    }

    const finalEnd = selectedEndSlot || selectedStartSlot;
    setPendingTimeslot({
      start: selectedStartSlot.start,
      end: finalEnd.end,
    });
    setShowCalendar(false);
    setShowBookingTypeModal(true);
  };

  const navigation = getVONavigation();

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
            <div className="space-y-3">
              <label htmlFor="port-select" className="text-sm text-muted-foreground block">
                Available Ports
              </label>

              <select
                id="port-select"
                value={selectedPort?.id || ''}
                onChange={handlePortSelect}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
              >
                <option value="">Select a port...</option>
                {ports.map((port) => (
                  <option key={port.id} value={port.id}>
                    {port.port_name || port.name || `Port #${port.id}`}
                  </option>
                ))}
              </select>

              {selectedPort && (
                <div className="p-4 rounded-lg border border-secondary/40 bg-secondary/10">
                  <p className="font-semibold text-foreground">
                    {selectedPort.port_name || selectedPort.name || `Port #${selectedPort.id}`}
                  </p>
                  {(selectedPort.address || selectedPort.location) && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedPort.address || selectedPort.location}
                    </p>
                  )}
                  {(typeof selectedPort.capacity !== 'undefined' || typeof selectedPort.available_charging_points !== 'undefined') && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Capacity: {selectedPort.capacity ?? '-'} • Available Points: {selectedPort.available_charging_points ?? '-'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chargers Section */}
      {selectedPort && (
        <Card>
          <CardHeader>
            <CardTitle>
              Available Chargers at {selectedPort.port_name || selectedPort.name || `Port #${selectedPort.id}`}
            </CardTitle>
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
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Charger Type</p>
                  <p className="font-semibold text-foreground">{selectedCharger.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Booking Date</p>
                  <Input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedStartSlot(null);
                      setSelectedEndSlot(null);
                    }}
                  />
                </div>
              </div>

              {isTimeslotsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 text-secondary animate-spin mr-2" />
                  <p className="text-sm text-muted-foreground">Loading availability...</p>
                </div>
              ) : timeslots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No available timeslots for this day.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {timeslots.map((slot) => {
                    const selected = isInSelectedRange(slot);
                    return (
                      <button
                        type="button"
                        key={`${slot.start}-${slot.end}`}
                        disabled={!slot.available}
                        onClick={() => handleSlotClick(slot)}
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                          slot.available
                            ? selected
                              ? 'border-secondary bg-secondary/15 text-secondary'
                              : 'border-border hover:border-secondary/60 hover:bg-muted'
                            : 'border-border bg-muted/40 text-muted-foreground/60 cursor-not-allowed'
                        }`}
                      >
                        {formatSlotTime(slot.start)}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedStartSlot && (
                <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                  Selected: {formatSlotTime(selectedStartSlot.start)} -{' '}
                  {formatSlotTime((selectedEndSlot || selectedStartSlot).end)}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCalendar(false);
                    setSelectedStartSlot(null);
                    setSelectedEndSlot(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedStartSlot}
                  onClick={continueWithTimeslot}
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
