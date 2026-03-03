import React from 'react';

const VesselCard = ({ vessel }) => {
	return (
		<div className="aspect-square rounded-lg bg-slate-800 border border-slate-700 p-4 flex flex-col justify-between">
			<div>
				<h3 className="text-xl font-semibold mb-2 break-words">{vessel.vessel_name}</h3>
				<p className="text-sm text-slate-300">Model: {vessel.vessel_model}</p>
				<p className="text-sm text-slate-300">Reg #: {vessel.registration_number}</p>
				<p className="text-sm text-slate-300">Battery: {vessel.battery_capacity} kWh</p>
			</div>

			<div className="mt-3">
				{vessel.is_primary ? (
					<span className="inline-block text-xs px-2 py-1 rounded bg-emerald-700 text-emerald-100">
						Primary
					</span>
				) : (
					<span className="inline-block text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
						Secondary
					</span>
				)}
			</div>
		</div>
	);
};

export default VesselCard;
