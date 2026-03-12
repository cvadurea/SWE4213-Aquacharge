import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const BOOKING_API_BASE = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3003';
const DRAWER_WIDTH = 175;
const SLOT_MINUTES = 15;
const MAX_BOOKING_MINUTES = 4 * 60;

const TimeslotCalendar = ({ charger, port, onClose, onSelectTimeslot }) => {
	const [timeslots, setTimeslots] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedRange, setSelectedRange] = useState(null); // { startIdx: number, endIdx: number } endIdx is boundary (exclusive)
	const [selectedDate, setSelectedDate] = useState(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	});
	const [selectionRect, setSelectionRect] = useState(null); // { top, left, width, height }

	const gridRef = useRef(null);
	const slotRefs = useRef([]);

	const selectedIndicesSet = useMemo(() => {
		if (!selectedRange) return new Set();
		const set = new Set();
		for (let i = selectedRange.startIdx; i < selectedRange.endIdx; i++) {
			set.add(i);
		}
		return set;
	}, [selectedRange]);

	useLayoutEffect(() => {
		const gridEl = gridRef.current;
		if (!gridEl || !selectedRange) {
			setSelectionRect(null);
			return;
		}

		const containerRect = gridEl.getBoundingClientRect();
		let minLeft = Infinity;
		let minTop = Infinity;
		let maxRight = -Infinity;
		let maxBottom = -Infinity;
		let found = false;

		for (let i = selectedRange.startIdx; i < selectedRange.endIdx; i++) {
			const el = slotRefs.current[i];
			if (!el) continue;
			const r = el.getBoundingClientRect();
			found = true;
			minLeft = Math.min(minLeft, r.left);
			minTop = Math.min(minTop, r.top);
			maxRight = Math.max(maxRight, r.right);
			maxBottom = Math.max(maxBottom, r.bottom);
		}

		if (!found) {
			setSelectionRect(null);
			return;
		}

		const padding = 6;
		setSelectionRect({
			left: minLeft - containerRect.left - padding,
			top: minTop - containerRect.top - padding,
			width: maxRight - minLeft + padding * 2,
			height: maxBottom - minTop + padding * 2,
		});
	}, [selectedRange, timeslots.length]);

	const buildDaySlots = (availabilityMap, startOfDay) => {
		const slots = [];
		for (let i = 0; i < (24 * 60) / SLOT_MINUTES; i++) {
			const slotStart = new Date(startOfDay.getTime() + i * SLOT_MINUTES * 60 * 1000);
			const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60 * 1000);
			const key = slotStart.toISOString();
			slots.push({
				start: key,
				end: slotEnd.toISOString(),
				available: availabilityMap.get(key) !== false, // default true unless explicitly false
			});
		}
		return slots;
	};

	const fetchTimeslots = async () => {
		try {
			setLoading(true);
			setError('');

			const todayStart = new Date();
			todayStart.setHours(0, 0, 0, 0);

			const start = new Date(selectedDate);
			start.setHours(0, 0, 0, 0);
			const end = new Date(start);
			end.setDate(start.getDate() + 1);

			// Prevent fetching past days
			if (start < todayStart) {
				setSelectedDate(todayStart);
				setTimeslots([]);
				setSelectedRange(null);
				return;
			}

			const response = await fetch(
				`${BOOKING_API_BASE}/chargers/${charger.id}/timeslots?start_date=${start.toISOString()}&end_date=${end.toISOString()}`,
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
			const raw = Array.isArray(data.timeslots) ? data.timeslots : [];
			const availabilityMap = new Map();
			raw.forEach((s) => {
				if (s?.start) {
					availabilityMap.set(String(s.start), Boolean(s.available));
				}
			});

			// Build a full day (12:00am onward) in 15-min increments.
			// Booked times remain visible but disabled, to allow range selection logic to validate gaps.
			let daySlots = buildDaySlots(availabilityMap, start);

			// Requirement: available slots shown should not be in the past relative to current time
			const now = new Date();
			if (start.getTime() === todayStart.getTime()) {
				daySlots = daySlots.filter((s) => new Date(s.end) > now);
			}

			setTimeslots(daySlots);
			setSelectedRange(null);
		} catch (err) {
			console.error('Error fetching timeslots:', err);
			setError('Could not load timeslots. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchTimeslots();
	}, [selectedDate, charger.id]);

	const handlePreviousDay = () => {
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);
		const d = new Date(selectedDate);
		d.setDate(d.getDate() - 1);
		d.setHours(0, 0, 0, 0);
		if (d < todayStart) return;
		setSelectedDate(d);
	};

	const handleNextDay = () => {
		const d = new Date(selectedDate);
		d.setDate(d.getDate() + 1);
		d.setHours(0, 0, 0, 0);
		setSelectedDate(d);
	};

	const formatTime = (isoString) => {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
	};

	const formatDate = (date) => {
		return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
	};

	const isRangeValid = (startIdx, endIdx) => {
		if (endIdx <= startIdx) return false;
		const minutes = (endIdx - startIdx) * SLOT_MINUTES;
		if (minutes > MAX_BOOKING_MINUTES) return false;
		for (let i = startIdx; i < endIdx; i++) {
			if (!timeslots[i]?.available) return false;
		}
		return true;
	};

	const handleSlotClick = (slotIndex) => {
		// Clicking a time represents choosing a boundary.
		// First click selects a 15-min booking (slotIndex -> slotIndex+1).
		// Subsequent clicks set the end boundary (exclusive) to allow selecting further out (e.g. 1:00 to 2:00).
		setSelectedRange((prev) => {
			if (!prev) {
				const startIdx = slotIndex;
				const endIdx = slotIndex + 1;
				return isRangeValid(startIdx, endIdx) ? { startIdx, endIdx } : null;
			}

			const { startIdx } = prev;
			let nextStart = startIdx;
			let nextEnd = prev.endIdx;

			if (slotIndex === startIdx && prev.endIdx === startIdx + 1) {
				// Toggle off a single-slot selection
				return null;
			}

			if (slotIndex < startIdx) {
				nextStart = slotIndex;
				nextEnd = Math.max(prev.endIdx, startIdx + 1);
			} else if (slotIndex === startIdx) {
				// Shrink from the start by moving start forward one slot (if possible)
				nextStart = Math.min(prev.endIdx - 1, startIdx + 1);
			} else {
				// Include the clicked "end" slot in the booking range
				nextEnd = slotIndex + 1;
				if (nextEnd <= nextStart) nextEnd = nextStart + 1;
			}

			// Ensure end is always at least one slot after start
			if (nextEnd <= nextStart) nextEnd = nextStart + 1;

			if (!isRangeValid(nextStart, nextEnd)) {
				return prev;
			}

			return { startIdx: nextStart, endIdx: nextEnd };
		});
	};

	const handleConfirm = () => {
		if (!onSelectTimeslot || !selectedRange) return;
		const { startIdx, endIdx } = selectedRange;
		const first = timeslots[startIdx];
		const computedEnd = timeslots[endIdx - 1]?.end;
		if (!first?.start || !computedEnd) return;
		onSelectTimeslot({ start: first.start, end: computedEnd });
	};

	const selectedSummary = (() => {
		if (!selectedRange) return null;
		const first = timeslots[selectedRange.startIdx];
		const computedEnd = timeslots[selectedRange.endIdx - 1]?.end;
		if (!first?.start || !computedEnd) return null;
		return `${formatDate(new Date(first.start))} • ${formatTime(first.start)} - ${formatTime(computedEnd)}`;
	})();

	return (
		<div
			className="fixed bg-black bg-opacity-75 flex items-center justify-center p-4"
			style={{
				inset: 0,
				paddingLeft: DRAWER_WIDTH,
				zIndex: 1300,
			}}
		>
			<div className="bg-slate-900 rounded-lg border border-slate-700 max-w-3xl w-full max-h-[90vh] flex flex-col">
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

				{/* Day Navigation */}
				<div className="p-4 border-b border-slate-700 flex justify-between items-center">
					{(() => {
						const todayStart = new Date();
						todayStart.setHours(0, 0, 0, 0);
						const canGoPrev = selectedDate.getTime() > todayStart.getTime();
						return (
					<button
						onClick={handlePreviousDay}
						disabled={!canGoPrev}
						className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600"
						type="button"
					>
						← Previous Day
					</button>
						);
					})()}
					<span className="font-semibold">
						{formatDate(selectedDate)}
					</span>
					<button
						onClick={handleNextDay}
						className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600"
						type="button"
					>
						Next Day →
					</button>
				</div>

				{/* Calendar Content */}
				<div className="flex-1 overflow-auto p-4">
					{loading ? (
						<p className="text-center text-slate-300">Loading timeslots...</p>
					) : error ? (
						<p className="text-center text-red-400">{error}</p>
					) : timeslots.length === 0 ? (
						<p className="text-center text-slate-300">No available slots for this day.</p>
					) : (
						<div className="relative">
							{selectionRect && (
								<div
									style={{
										position: 'absolute',
										left: selectionRect.left,
										top: selectionRect.top,
										width: selectionRect.width,
										height: selectionRect.height,
										border: '3px solid black',
										borderRadius: 12,
										pointerEvents: 'none',
										boxSizing: 'border-box',
										zIndex: 1,
									}}
								/>
							)}

							<div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
							{timeslots.map((slot, idx) => {
								const isSelected = selectedIndicesSet.has(idx);
								return (
									<button
										key={`${slot.start}-${slot.end}`}
										type="button"
										onClick={() => handleSlotClick(idx)}
										disabled={!slot.available}
										ref={(el) => {
											slotRefs.current[idx] = el;
										}}
										className="p-2 text-xs rounded border transition text-left"
										style={{
											backgroundColor: !slot.available
												? '#ffffff'
												: isSelected
													? '#bae6fd'
													: 'transparent',
											borderColor: !slot.available ? '#e5e7eb' : isSelected ? '#000000' : '#e5e7eb',
											color: !slot.available ? '#9ca3af' : isSelected ? '#1d4ed8' : '#0f172a',
											cursor: !slot.available ? 'not-allowed' : 'pointer',
										}}
									>
										{formatTime(slot.start)}
									</button>
								);
							})}
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-slate-700 flex justify-between items-center">
					<div className="text-sm text-slate-400">
						{selectedSummary ? (
							<span>Selected: {selectedSummary}</span>
						) : (
							<span>Select a start time, then click a later time to set the end (max 4 hours)</span>
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
							disabled={!selectedRange}
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
