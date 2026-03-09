import React, { useEffect, useState } from 'react';
import SidebarVO from '../components/SidebarVO';

const PORT_API_BASE = import.meta.env.VITE_PORT_API_URL || 'http://localhost:3006';
const FLEET_API_BASE = import.meta.env.VITE_FLEET_API_URL || 'http://localhost:3004';
const BOOKING_API_BASE = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3003';

const FindChargers = ({ onNavigate, onLogout }) => {
	const [ports, setPorts] = useState([]);
	const [vessels, setVessels] = useState([]);
	const [selectedPort, setSelectedPort] = useState(null);
	const [selectedVesselId, setSelectedVesselId] = useState('');
	const [availableChargers, setAvailableChargers] = useState([]);
	const [bookingStartTime, setBookingStartTime] = useState('');
	const [bookingEndTime, setBookingEndTime] = useState('');
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
			if (vesselList.length > 0) {
				setSelectedVesselId(String(vesselList[0].id));
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

	const createBooking = async (charger) => {
		const user = getStoredUser();
		const token = localStorage.getItem('token');

		if (!token || !user?.id) {
			setError('Missing auth token. Please log in again.');
			return;
		}

		if (!selectedPort?.id) {
			setError('Please select a port first.');
			return;
		}

		if (!selectedVesselId) {
			setError('Please select a vessel before booking.');
			return;
		}

		if (!bookingStartTime || !bookingEndTime) {
			setError('Please choose booking start and end times.');
			return;
		}

		const startDate = new Date(bookingStartTime);
		const endDate = new Date(bookingEndTime);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
			setError('Please provide a valid booking time range.');
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
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					user_id: user.id,
					vessel_id: Number(selectedVesselId),
					port_id: selectedPort.id,
					charger_id: charger.id,
					start_time: startDate.toISOString(),
					end_time: endDate.toISOString(),
				}),
			});

			const data = await parseResponseBody(response);
			if (!response.ok) {
				setError(data.message || `Failed to create booking (HTTP ${response.status}).`);
				return;
			}

			setBookingStatus(`Booking confirmed for charger #${charger.id}.`);
		} catch (err) {
			console.error('Error creating booking:', err);
			setError('Could not connect to booking service.');
		} finally {
			setBookingLoadingChargerId(null);
		}
	};

	useEffect(() => {
		getPorts();
		getVessels();
	}, []);

	return (
		<div className="min-h-screen bg-slate-950 text-white flex">
			<SidebarVO onNavigate={onNavigate} onLogout={onLogout} />

			<main className="flex-1 p-6">
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
								<p className="text-sm text-slate-300">Booking Information</p>
								<select
									value={selectedVesselId}
									onChange={(event) => setSelectedVesselId(event.target.value)}
									className="w-full p-2 rounded bg-slate-900 border border-slate-700"
								>
									<option value="">Select vessel</option>
									{vessels.map((vessel) => (
										<option key={vessel.id} value={String(vessel.id)}>
											{vessel.vessel_name}
										</option>
									))}
								</select>

								<input
									type="datetime-local"
									value={bookingStartTime}
									onChange={(event) => setBookingStartTime(event.target.value)}
									className="w-full p-2 rounded bg-slate-900 border border-slate-700"
								/>

								<input
									type="datetime-local"
									value={bookingEndTime}
									onChange={(event) => setBookingEndTime(event.target.value)}
									className="w-full p-2 rounded bg-slate-900 border border-slate-700"
								/>
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
										<div key={charger.id} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
											<p className="font-medium">Charger #{charger.id}</p>
											<p className="text-sm text-slate-300 mt-1">Type: {charger.type}</p>
											<p className="text-sm text-emerald-400 mt-1">Available</p>
											<button
												type="button"
												onClick={() => createBooking(charger)}
												disabled={bookingLoadingChargerId === charger.id}
												className="mt-3 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
											>
												{bookingLoadingChargerId === charger.id ? 'Booking...' : 'Book Charger'}
											</button>
										</div>
									))}
								</div>
							)}
						</section>
					</div>
				</div>
			</main>
		</div>
	);
};

export default FindChargers;
