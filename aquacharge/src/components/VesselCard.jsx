import React, { useState, useEffect } from 'react';

const FLEET_API_BASE = import.meta.env.VITE_FLEET_API_URL || 'http://localhost:3004';

const VesselCard = ({ vessel, onPrimarySet }) => {
	const [showConfirm, setShowConfirm] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Reset dialog state whenever vessel data changes (e.g. after re-fetch)
	useEffect(() => {
		setShowConfirm(false);
		setIsLoading(false);
	}, [vessel.id, vessel.is_primary]);

	const handleSetPrimary = async () => {
		const token = localStorage.getItem('token');

		if (!token) {
			alert('Missing auth token. Please log in again.');
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch(`${FLEET_API_BASE}/vessels/${vessel.id}/set-primary`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});

			if (response.ok) {
				setShowConfirm(false);
				if (onPrimarySet) {
					await onPrimarySet();
				}
			} else {
				const data = await response.json();
				alert(data.message || 'Failed to set vessel as primary');
			}
		} catch (err) {
			console.error('Error setting primary vessel:', err);
			alert('Could not set vessel as primary');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-w-0 w-full max-w-[12rem]">
			<div className="rounded-lg bg-slate-800 border border-slate-700 p-4 flex flex-col gap-3 h-48">
				<div>
					<h3 className="text-xl font-semibold mb-2 break-words">{vessel.vessel_name}</h3>
					<p className="text-sm text-slate-300">Model: {vessel.vessel_model}</p>
					<p className="text-sm text-slate-300">Reg #: {vessel.registration_number}</p>
					<p className="text-sm text-slate-300">Battery: {vessel.battery_capacity} kWh</p>
				</div>

				<div className="space-y-2">
					{vessel.is_primary && (
						<span className="inline-block text-xs px-2 py-1 rounded bg-emerald-700 text-emerald-100">
							Primary
						</span>
					)}

					{!vessel.is_primary && (
						<button
							type="button"
							onClick={() => setShowConfirm(true)}
							disabled={isLoading}
							className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
						>
							{isLoading ? 'Setting...' : 'Set as Primary'}
						</button>
					)}
				</div>
			</div>

			{showConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
					<div className="bg-slate-900 rounded-lg border border-slate-700 max-w-sm w-full p-6">
						<h3 className="text-xl font-semibold mb-2">Set as Primary Vessel?</h3>
						<p className="text-slate-400 mb-6">
							Are you sure you want to set <strong>{vessel.vessel_name}</strong> as your primary vessel?
						</p>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={() => setShowConfirm(false)}
								disabled={isLoading}
								className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSetPrimary}
								disabled={isLoading}
								className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
							>
								{isLoading ? 'Setting...' : 'Yes, Set Primary'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default VesselCard;
