import React from 'react';

const ChargerCard = ({ charger }) => {
	return (
		<div className="aspect-square rounded-lg bg-slate-800 border border-slate-700 p-4 flex flex-col justify-between">
			<div>
				<h3 className="text-xl font-semibold mb-2 break-words">Charger #{charger.id}</h3>
				<p className="text-sm text-slate-300">Type: {charger.type}</p>
				<p className="text-sm text-slate-300">Port ID: {charger.port_id}</p>
			</div>

			<div className="mt-3">
				{charger.is_available ? (
					<span className="inline-block text-xs px-2 py-1 rounded bg-emerald-700 text-emerald-100">
						Available
					</span>
				) : (
					<span className="inline-block text-xs px-2 py-1 rounded bg-red-700 text-red-100">
						Booked
					</span>
				)}
			</div>
		</div>
	);
};

export default ChargerCard;
