import React, { useEffect, useState } from 'react';
import SidebarPO from '../components/SidebarPO';
import ChargerCard from '../components/ChargerCard';

const PORT_API_BASE = import.meta.env.VITE_PORT_API_URL || 'http://localhost:3006';

const initialFormState = {
    type: '',
    is_available: true,
};

const MyPort = ({ onNavigate, onLogout }) => {
    const [chargers, setChargers] = useState([]);
    const [portInfo, setPortInfo] = useState(null);
    const [isPortInfoLoading, setIsPortInfoLoading] = useState(true);
    const [portInfoError, setPortInfoError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    const getChargers = async () => {
        const user = getStoredUser();
        const token = localStorage.getItem('token');

        if (!user?.id) {
            setError('Unable to load user session. Please log in again.');
            return;
        }

        if (!token) {
            setError('Missing auth token. Please log in again.');
            return;
        }

        try {
            setError('');
            const response = await fetch(`${PORT_API_BASE}/ports/${encodeURIComponent(user.id)}/chargers`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await parseResponseBody(response);

            if (response.ok) {
                setChargers(Array.isArray(data) ? data : []);
            } else {
                if (response.status === 401) {
                    setError('Session expired or unauthorized. Please log in again.');
                } else {
                    setError(data.message || `Failed to fetch chargers (HTTP ${response.status}).`);
                }
            }
        } catch (err) {
            console.error('Error fetching chargers:', err);
            setError('Could not connect to port service.');
        }
    };

    const getPortInfo = async () => {
        const user = getStoredUser();

        if (!user?.id) {
            setPortInfoError('Unable to load linked port information.');
            setIsPortInfoLoading(false);
            return;
        }

        try {
            setPortInfoError('');
            setIsPortInfoLoading(true);

            const directResponse = await fetch(`${PORT_API_BASE}/ports/${encodeURIComponent(user.id)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const directData = await parseResponseBody(directResponse);

            if (directResponse.ok) {
                setPortInfo(directData);
                return;
            }

            if (directResponse.status === 404 && user.email) {
                const listResponse = await fetch(`${PORT_API_BASE}/ports`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const listData = await parseResponseBody(listResponse);

                if (listResponse.ok && Array.isArray(listData)) {
                    const linkedPort = listData.find((port) => port.owner_email === user.email);
                    if (linkedPort) {
                        setPortInfo(linkedPort);
                        return;
                    }
                }
            }

            setPortInfo(null);
            setPortInfoError(
                (directData && directData.message) ||
                    `Could not load port details (HTTP ${directResponse.status}).`
            );
        } catch (err) {
            console.error('Error fetching port information:', err);
            setPortInfo(null);
            setPortInfoError('Could not connect to port service for port details.');
        } finally {
            setIsPortInfoLoading(false);
        }
    };

    useEffect(() => {
        getChargers();
        getPortInfo();
    }, []);

    const onInputChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData(initialFormState);
        setError('');
    };

    const createCharger = async (event) => {
        event.preventDefault();
        const user = getStoredUser();
        const token = localStorage.getItem('token');

        if (!user?.id) {
            setError('Unable to load user session. Please log in again.');
            return;
        }

        if (!token) {
            setError('Missing auth token. Please log in again.');
            return;
        }

        if (!formData.type) {
            setError('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch(`${PORT_API_BASE}/ports/${encodeURIComponent(user.id)}/chargers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type: formData.type,
                    is_available: formData.is_available,
                }),
            });

            const data = await parseResponseBody(response);

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Session expired or unauthorized. Please log in again.');
                } else {
                    setError(data.message || `Failed to create charger (HTTP ${response.status}).`);
                }
                return;
            }

            await getChargers();
            closeModal();
        } catch (err) {
            console.error('Error creating charger:', err);
            setError('Could not connect to port service.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
            <SidebarPO onNavigate={onNavigate} onLogout={onLogout} />

            <main className="flex-1 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-4xl font-bold">My Port</h1>
                            <p className="text-gray-400 mt-2">Manage your charging stations</p>
                        </div>

                        <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm">
                            <p className="text-slate-400 mb-2">Port Information</p>

                            {isPortInfoLoading ? (
                                <p className="text-slate-300">Loading port details...</p>
                            ) : portInfo ? (
                                <div className="space-y-1 text-slate-200">
                                    <p>
                                        <span className="text-slate-400">Name:</span> {portInfo.port_name}
                                    </p>
                                    <p>
                                        <span className="text-slate-400">Address:</span> {portInfo.address}
                                    </p>
                                    <p>
                                        <span className="text-slate-400">Capacity:</span> {portInfo.capacity}
                                    </p>
                                    <p>
                                        <span className="text-slate-400">Available Points:</span>{' '}
                                        {portInfo.available_charging_points}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-amber-300">{portInfoError || 'No linked port found.'}</p>
                            )}
                        </div>
                    </div>

                    {error && <p className="text-red-400 mb-4">{error}</p>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-emerald-500 bg-slate-900 hover:bg-slate-800 transition flex flex-col items-center justify-center"
                        >
                            <span className="text-5xl leading-none">+</span>
                            <span className="mt-2 font-medium">Add Charger</span>
                        </button>

                        {chargers.map((charger) => (
                            <ChargerCard key={charger.id} charger={charger} />
                        ))}
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-lg bg-slate-900 rounded-lg p-6 border border-slate-700">
                        <h2 className="text-2xl font-semibold mb-4">Add Charger</h2>

                        <form onSubmit={createCharger} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Charger Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={onInputChange}
                                    className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                                    required
                                >
                                    <option value="">Select Type</option>
                                    <option value="regular">Regular</option>
                                    <option value="bidirectional">Bi-Directional</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-slate-300">
                                <input
                                    type="checkbox"
                                    name="is_available"
                                    checked={formData.is_available}
                                    onChange={onInputChange}
                                />
                                Available for booking
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Adding...' : 'Add Charger'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPort;
