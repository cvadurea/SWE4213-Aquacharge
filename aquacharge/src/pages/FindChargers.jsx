import React, { useEffect, useState } from 'react';
import SidebarVO from '../components/SidebarVO';
import TimeslotCalendar from '../components/TimeslotCalendar';

const PORT_API_BASE = import.meta.env.VITE_PORT_API_URL || 'http://localhost:3006';
const FLEET_API_BASE = import.meta.env.VITE_FLEET_API_URL || 'http://localhost:3004';
const BOOKING_API_BASE = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3003';

const FindChargers = ({ onNavigate, onLogout }) => {
	const [ports, setPorts] = useState([]);
	const [vessels, setVessels] = useState([]);
	const [primaryVessel, setPrimaryVessel] = useState(null);
	const [selectedPort, setSelectedPort] = useState(null);
	const [availableChargers, setAvailableChargers] = useState([]);
	const [selectedCharger, setSelectedCharger] = useState(null);
	const [showCalendar, setShowCalendar] = useState(false);
	const [pendingTimeslot, setPendingTimeslot] = useState(null);
	const [showBookingTypeModal, setShowBookingTypeModal] = useState(false);
	const [bookingType, setBookingType] = useState('regular');
	const [dischargeKwh, setDischargeKwh] = useState('');
	const [bookingStatus, setBookingStatus] = useState('');
	const [bookingLoadingChargerId, setBookingLoadingChargerId] = useState(null);
	const [isPortsLoading, setIsPortsLoading] = useState(true);
	const [isChargersLoading, setIsChargersLoading] = useState(false);
	const [error, setError] = useState('');

	const getStoredUser = () => {
		const userData = localStorage.getItem('user');
		if (!userData) {
			return null;
		}

		try {
			return JSON.parse(userData);
		} catch (err) {
			console.error('Error parsing user data:', err);
			return null;
		}
	};

	const parseResponseBody = async (response) => {
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
				headers: {
					'Content-Type': 'application/json',
				},
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

			// Find and set the primary vessel
			const primary = vesselList.find((v) => v.is_primary);
			if (primary) {
				setPrimaryVessel(primary);
			} else if (vesselList.length > 0) {
				// If no primary vessel is set, alert the user
				setError('No primary vessel set. Please set a primary vessel in My Vessels before booking.');
			}
		} catch (err) {
			console.error('Error fetching vessels:', err);
			setError('Could not connect to vessel service.');
		}
	};

	const getPortChargers = async (port) => {
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

	const createBooking = async (charger, timeslot, options = {}) => {
		const user = getStoredUser();

		if (!user?.id) {
			setError('Missing user information. Please log in again.');
			return;
		}

		if (!selectedPort?.id) {
			setError('Please select a port first.');
			return;
		}

		if (!primaryVessel?.id) {
			setError('No primary vessel set. Please set a primary vessel in My Vessels before booking.');
			return;
		}

		if (!timeslot?.start || !timeslot?.end) {
			setError('Invalid timeslot selected.');
			return;
		}

		try {
			setError('');
			setBookingStatus('');
			setBookingLoadingChargerId(charger.id);

			const response = await fetch(`${BOOKING_API_BASE}/bookings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
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
				return;
			}

			if (data?.v2g_transaction) {
				setBookingStatus(
					`Booking confirmed (V2G) for charger #${charger.id} using ${primaryVessel.vessel_name}. Discharge: ${data.v2g_transaction.energy_discharged} kWh.`
				);
			} else {
				setBookingStatus(`Booking confirmed for charger #${charger.id} using ${primaryVessel.vessel_name}.`);
			}
			setShowCalendar(false);
			setSelectedCharger(null);
			setPendingTimeslot(null);
			setShowBookingTypeModal(false);
		} catch (err) {
			console.error('Error creating booking:', err);
			setError('Could not connect to booking service.');
		} finally {
			setBookingLoadingChargerId(null);
		}
	};

	const handleChargerClick = (charger) => {
		setSelectedCharger(charger);
		setShowCalendar(true);
		setError('');
	};

	const handleTimeslotSelect = (timeslot) => {
		if (selectedCharger && timeslot) {
			if (String(selectedCharger.type || '').toLowerCase() === 'bidirectional') {
				setPendingTimeslot(timeslot);
				setBookingType('regular');
				setDischargeKwh('');
				setShowBookingTypeModal(true);
				return;
			}

			createBooking(selectedCharger, timeslot, { booking_type: 'regular' });
		}
	};

	const closeBookingTypeModal = () => {
		setShowBookingTypeModal(false);
		setPendingTimeslot(null);
		setBookingType('regular');
		setDischargeKwh('');
	};

	const confirmBookingType = () => {
		if (!selectedCharger || !pendingTimeslot) return;
		if (bookingType === 'bidirectional') {
			const parsed = Number(dischargeKwh);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				setError('Please enter a valid kWh discharge amount.');
				return;
			}
			createBooking(selectedCharger, pendingTimeslot, {
				booking_type: 'bidirectional',
				energy_discharged_kwh: parsed,
			});
			return;
		}

		createBooking(selectedCharger, pendingTimeslot, { booking_type: 'regular' });
	};

	const handleCloseCalendar = () => {
		setShowCalendar(false);
		setSelectedCharger(null);
	};

	useEffect(() => {
		getPorts();
		getVessels();
	}, []);

	return (
		<div className="min-h-screen bg-slate-950 text-white flex">
			<SidebarVO onNavigate={onNavigate} onLogout={onLogout} />

			<main className="flex-1 p-6" style={{ marginLeft: 175 }}>
				<div className="max-w-7xl mx-auto">
					<div className="mb-8">
						<h1 className="text-4xl font-bold">Find Chargers</h1>
						<p className="text-gray-400 mt-2">Select a port to view currently available chargers</p>
					</div>

					{error && <p className="text-red-400 mb-4">{error}</p>}

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<section className="bg-slate-900 border border-slate-700 rounded-lg p-4">
							<h2 className="text-xl font-semibold mb-4">Ports</h2>

							{isPortsLoading ? (
								<p className="text-slate-300">Loading ports...</p>
							) : ports.length === 0 ? (
								<p className="text-slate-300">No ports found.</p>
							) : (
								<div className="space-y-3">
									{ports.map((port) => (
										<button
											key={port.id}
											type="button"
											onClick={() => getPortChargers(port)}
											className={`w-full text-left rounded-lg border p-4 transition ${
												selectedPort?.id === port.id
													? 'border-emerald-500 bg-slate-800'
													: 'border-slate-700 bg-slate-900 hover:bg-slate-800'
											}`}
										>
											<p className="text-lg font-medium">{port.port_name}</p>
											<p className="text-sm text-slate-400 mt-1">{port.address}</p>
											<p className="text-sm text-slate-300 mt-2">
												Capacity: {port.capacity} • Available Points: {port.available_charging_points}
											</p>
										</button>
									))}
								</div>
							)}
						</section>

						<section className="bg-slate-900 border border-slate-700 rounded-lg p-4">
							<h2 className="text-xl font-semibold mb-4">Available Chargers</h2>

							<div className="mb-4 space-y-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
								{primaryVessel ? (
									<div className="bg-slate-900 border border-slate-600 rounded p-3">
										<p className="font-semibold text-emerald-400">Booking Vessel: {primaryVessel.vessel_name}</p>
									</div>
								) : (
									<div className="bg-slate-900 border border-red-700 rounded p-3">
										<p className="text-red-400 font-semibold">No Primary Vessel Set</p>
										<p className="text-xs text-slate-400 mt-1">
											Please set a primary vessel in My Vessels before booking.
										</p>
									</div>
								)}
							</div>

							{bookingStatus && <p className="text-emerald-400 mb-3 text-sm">{bookingStatus}</p>}

							{!selectedPort ? (
								<p className="text-slate-300">Choose a port to see available chargers.</p>
							) : isChargersLoading ? (
								<p className="text-slate-300">Loading chargers...</p>
							) : availableChargers.length === 0 ? (
								<p className="text-slate-300">No available chargers in this port right now.</p>
							) : (
								<div className="space-y-3">
									{availableChargers.map((charger) => (
										<button
											key={charger.id}
											type="button"
											onClick={() => handleChargerClick(charger)}
											className="w-full rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-emerald-500 p-4 text-left transition cursor-pointer"
										>
											<p className="font-medium text-lg">Charger #{charger.id}</p>
											<p className="text-sm text-slate-300 mt-1">Type: {charger.type}</p>
											<div className="flex items-center justify-between mt-2">
												<span className="inline-block text-xs px-2 py-1 rounded bg-emerald-700 text-emerald-100">
													Available
												</span>
												<span className="text-sm text-emerald-400">Click to view timeslots →</span>
											</div>
										</button>
									))}
								</div>
							)}
						</section>
					</div>
				</div>
			</main>

			{showCalendar && selectedCharger && selectedPort && (
				<TimeslotCalendar
					charger={selectedCharger}
					port={selectedPort}
					onClose={handleCloseCalendar}
					onSelectTimeslot={handleTimeslotSelect}
				/>
			)}

			{showBookingTypeModal && (
				<div
					style={{
						position: 'fixed',
						inset: 0,
						zIndex: 1400,
						background: 'rgba(0,0,0,0.6)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: 16,
					}}
				>
					<div
						style={{
							width: '100%',
							maxWidth: 520,
							background: '#0f172a',
							border: '1px solid #334155',
							borderRadius: 12,
							padding: 16,
							color: '#e2e8f0',
						}}
					>
						<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
							<div>
								<h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Booking Type</h2>
								<p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: 13 }}>
									Charger #{selectedCharger?.id} supports bidirectional bookings.
								</p>
							</div>
							<button
								type="button"
								onClick={closeBookingTypeModal}
								style={{
									border: '1px solid #334155',
									background: 'transparent',
									color: '#e2e8f0',
									borderRadius: 8,
									padding: '6px 10px',
									cursor: 'pointer',
								}}
							>
								✕
							</button>
						</div>

						<div style={{ marginTop: 14 }}>
							<label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>
								Select mode
							</label>
							<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
								<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
									<input
										type="radio"
										name="bookingType"
										value="regular"
										checked={bookingType === 'regular'}
										onChange={() => setBookingType('regular')}
									/>
									Regular
								</label>
								<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
									<input
										type="radio"
										name="bookingType"
										value="bidirectional"
										checked={bookingType === 'bidirectional'}
										onChange={() => setBookingType('bidirectional')}
									/>
									Bidirectional (V2G)
								</label>
							</div>
						</div>

						{bookingType === 'bidirectional' && (
							<div style={{ marginTop: 14 }}>
								<label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>
									Energy to discharge to the grid (kWh)
								</label>
								<input
									type="number"
									min="0"
									step="0.1"
									value={dischargeKwh}
									onChange={(e) => setDischargeKwh(e.target.value)}
									style={{
										width: '100%',
										padding: '10px 12px',
										borderRadius: 10,
										border: '1px solid #334155',
										background: '#020617',
										color: '#e2e8f0',
									}}
									placeholder="e.g. 10"
								/>
								<p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: 12 }}>
									Your transaction will record price/kWh and total payment.
								</p>
							</div>
						)}

						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
							<button
								type="button"
								onClick={closeBookingTypeModal}
								style={{
									border: '1px solid #334155',
									background: '#334155',
									color: '#e2e8f0',
									borderRadius: 10,
									padding: '10px 12px',
									cursor: 'pointer',
								}}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={confirmBookingType}
								style={{
									border: '1px solid #0ea5e9',
									background: '#0284c7',
									color: 'white',
									borderRadius: 10,
									padding: '10px 12px',
									cursor: 'pointer',
								}}
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default FindChargers;
