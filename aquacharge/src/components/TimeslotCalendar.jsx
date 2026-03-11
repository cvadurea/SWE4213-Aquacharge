import React, { useEffect, useState } from 'react';

const BOOKING_API_BASE = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3003';

const TimeslotCalendar = ({ charger, port, onClose, onSelectTimeslot }) => {
	const [timeslots, setTimeslots] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedSlot, setSelectedSlot] = useState(null);
	const [weekStart, setWeekStart] = useState(new Date());

	// Initialize to start of current week (Monday)
	useEffect(() => {
		const now = new Date();
		const dayOfWeek = now.getDay();
		const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
		const monday = new Date(now);
		monday.setDate(now.getDate() + diff);
		monday.setHours(0, 0, 0, 0);
		setWeekStart(monday);
	}, []);

	const fetchTimeslots = async () => {
		try {
			setLoading(true);
			setError('');

			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekStart.getDate() + 7);

			const response = await fetch(
				`${BOOKING_API_BASE}/chargers/${charger.id}/timeslots?start_date=${weekStart.toISOString()}&end_date=${weekEnd.toISOString()}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch timeslots (HTTP ${response.status})`);
			}

			const data = await response.json();
			setTimeslots(data.timeslots || []);
		} catch (err) {
			console.error('Error fetching timeslots:', err);
			setError('Could not load timeslots. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (weekStart) {
			fetchTimeslots();
		}
	}, [weekStart, charger.id]);

	const handlePreviousWeek = () => {
		const newStart = new Date(weekStart);
		newStart.setDate(weekStart.getDate() - 7);
		setWeekStart(newStart);
	};

	const handleNextWeek = () => {
		const newStart = new Date(weekStart);
		newStart.setDate(weekStart.getDate() + 7);
		setWeekStart(newStart);
	};

	const getDayLabels = () => {
		const days = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(weekStart);
			day.setDate(weekStart.getDate() + i);
			days.push(day);
		}
		return days;
	};

	const getTimeslotsByDay = () => {
		const daySlots = {};
		timeslots.forEach((slot) => {
			const slotDate = new Date(slot.start);
			const dayKey = slotDate.toISOString().split('T')[0];
			if (!daySlots[dayKey]) {
				daySlots[dayKey] = [];
			}
			daySlots[dayKey].push(slot);
		});
		return daySlots;
	};

	const formatTime = (isoString) => {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
	};

	const formatDate = (date) => {
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	};

	const handleSlotClick = (slot) => {
		if (!slot.available) return;
		setSelectedSlot(slot);
	};

	const handleConfirm = () => {
		if (selectedSlot && onSelectTimeslot) {
			onSelectTimeslot(selectedSlot);
		}
	};

	const daySlots = getTimeslotsByDay();
	const dayLabels = getDayLabels();

	return (
		<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
			<div className="bg-slate-900 rounded-lg border border-slate-700 max-w-6xl w-full max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="p-4 border-b border-slate-700 flex justify-between items-center">
					<div>
						<h2 className="text-2xl font-bold">Select Time Slot</h2>
						<p className="text-slate-400 text-sm mt-1">
							Charger #{charger.id} at {port.port_name}
						</p>
					</div>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-white text-2xl leading-none"
						type="button"
					>
						×
					</button>
				</div>

				{/* Week Navigation */}
				<div className="p-4 border-b border-slate-700 flex justify-between items-center">
					<button
						onClick={handlePreviousWeek}
						className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600"
						type="button"
					>
						← Previous Week
					</button>
					<span className="font-semibold">
						{formatDate(dayLabels[0])} - {formatDate(dayLabels[6])}
					</span>
					<button
						onClick={handleNextWeek}
						className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600"
						type="button"
					>
						Next Week →
					</button>
				</div>

				{/* Calendar Content */}
				<div className="flex-1 overflow-auto p-4">
					{loading ? (
						<p className="text-center text-slate-300">Loading timeslots...</p>
					) : error ? (
						<p className="text-center text-red-400">{error}</p>
					) : (
						<div className="grid grid-cols-7 gap-2">
							{dayLabels.map((day) => {
								const dayKey = day.toISOString().split('T')[0];
								const slots = daySlots[dayKey] || [];

								return (
									<div key={dayKey} className="border border-slate-700 rounded-lg overflow-hidden">
										{/* Day Header */}
										<div className="bg-slate-800 p-2 text-center font-semibold text-sm">
											{formatDate(day)}
										</div>

										{/* Timeslots */}
										<div className="max-h-96 overflow-y-auto">
											{slots.length === 0 ? (
												<p className="text-xs text-slate-400 p-2 text-center">No slots</p>
											) : (
												slots.map((slot, idx) => (
													<button
														key={idx}
														type="button"
														onClick={() => handleSlotClick(slot)}
														disabled={!slot.available}
														className={`w-full p-2 text-xs border-t border-slate-700 text-left transition ${
															selectedSlot === slot
																? 'bg-emerald-600 text-white'
																: slot.available
																? 'bg-slate-800 hover:bg-slate-700 cursor-pointer'
																: 'bg-slate-900 text-slate-500 cursor-not-allowed'
														}`}
													>
														{formatTime(slot.start)}
														{!slot.available && (
															<span className="block text-xs text-red-400">Booked</span>
														)}
													</button>
												))
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-slate-700 flex justify-between items-center">
					<div className="text-sm text-slate-400">
						{selectedSlot ? (
							<span>
								Selected: {formatDate(new Date(selectedSlot.start))} at {formatTime(selectedSlot.start)}
							</span>
						) : (
							<span>Select an available time slot</span>
						)}
					</div>
					<div className="flex gap-2">
						<button
							onClick={onClose}
							className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded"
							type="button"
						>
							Cancel
						</button>
						<button
							onClick={handleConfirm}
							disabled={!selectedSlot}
							className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
							type="button"
						>
							Confirm Booking
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TimeslotCalendar;
