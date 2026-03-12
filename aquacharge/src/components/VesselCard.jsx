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
								<h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Set as Primary Vessel?</h3>
								<p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: 13 }}>
									Are you sure you want to set <strong>{vessel.vessel_name}</strong> as your primary vessel?
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowConfirm(false)}
								disabled={isLoading}
								style={{
									border: '1px solid #334155',
									background: 'transparent',
									color: '#e2e8f0',
									borderRadius: 8,
									padding: '6px 10px',
									cursor: isLoading ? 'not-allowed' : 'pointer',
									opacity: isLoading ? 0.6 : 1,
								}}
							>
								✕
							</button>
						</div>

						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
							<button
								type="button"
								onClick={() => setShowConfirm(false)}
								disabled={isLoading}
								style={{
									border: '1px solid #334155',
									background: '#334155',
									color: '#e2e8f0',
									borderRadius: 10,
									padding: '10px 12px',
									cursor: isLoading ? 'not-allowed' : 'pointer',
									opacity: isLoading ? 0.6 : 1,
								}}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSetPrimary}
								disabled={isLoading}
								style={{
									border: '1px solid #0ea5e9',
									background: '#0284c7',
									color: 'white',
									borderRadius: 10,
									padding: '10px 12px',
									cursor: isLoading ? 'not-allowed' : 'pointer',
									opacity: isLoading ? 0.6 : 1,
								}}
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
