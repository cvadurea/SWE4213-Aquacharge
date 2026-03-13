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

    const getChargers = async (portId) => {
        const token = localStorage.getItem('token');

        if (!portId) {
            setError('No linked port found for this account.');
            return;
        }

        if (!token) {
            setError('Missing auth token. Please log in again.');
            return;
        }

        try {
            setError('');
            const response = await fetch(`${PORT_API_BASE}/ports/${encodeURIComponent(portId)}/chargers`, {
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
            return null;
        }

        try {
            setPortInfoError('');
            setIsPortInfoLoading(true);
            if (user.email) {
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
                        return linkedPort;
                    }
                }
            }

            const directResponse = await fetch(`${PORT_API_BASE}/ports/${encodeURIComponent(user.id)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const directData = await parseResponseBody(directResponse);

            if (directResponse.ok) {
                setPortInfo(directData);
                return directData;
            }

            setPortInfo(null);
            setPortInfoError((directData && directData.message) || `Could not load port details (HTTP ${directResponse.status}).`);
            return null;
        } catch (err) {
            console.error('Error fetching port information:', err);
            setPortInfo(null);
            setPortInfoError('Could not connect to port service for port details.');
            return null;
        } finally {
            setIsPortInfoLoading(false);
        }
    };

    useEffect(() => {
        const loadPageData = async () => {
            const linkedPort = await getPortInfo();
            if (linkedPort?.id) {
                await getChargers(linkedPort.id);
            } else {
                setChargers([]);
            }
        };

        loadPageData();
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
        const token = localStorage.getItem('token');
        let targetPortId = portInfo?.id;

        if (!targetPortId) {
            const linkedPort = await getPortInfo();
            targetPortId = linkedPort?.id;
        }

        if (!token) {
            setError('Missing auth token. Please log in again.');
            return;
        }

        if (!targetPortId) {
            setError('No linked port found for this account.');
            return;
        }

        if (!formData.type) {
            setError('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch(`${PORT_API_BASE}/ports/${encodeURIComponent(targetPortId)}/chargers`, {
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

            await getChargers(targetPortId);
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

            <main className="flex-1 p-6" style={{ marginLeft: 175 }}>
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

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 24,
                            alignItems: 'stretch',
                        }}
                    >
                        <div style={{ width: 192, flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-emerald-500 bg-slate-900 hover:bg-slate-800 transition flex flex-col items-center justify-center"
                                style={{ width: 192, height: 192 }}
                            >
                                <span className="text-5xl leading-none">+</span>
                                <span className="mt-2 font-medium">Add Charger</span>
                            </button>
                        </div>

                        {chargers.map((charger) => (
                            <div key={charger.id} style={{ width: 192, flexShrink: 0 }}>
                                <ChargerCard charger={charger} />
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {isModalOpen && (
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
                            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Add Charger</h2>
                            <button
                                type="button"
                                onClick={closeModal}
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

                        <form onSubmit={createCharger} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>
                                    Charger Type
                                </label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={onInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #334155',
                                        background: '#020617',
                                        color: '#e2e8f0',
                                    }}
                                    required
                                >
                                    <option value="">Select Type</option>
                                    <option value="regular">Regular</option>
                                    <option value="bidirectional">Bi-Directional</option>
                                </select>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#cbd5e1' }}>
                                <input
                                    type="checkbox"
                                    name="is_available"
                                    checked={formData.is_available}
                                    onChange={onInputChange}
                                />
                                Available for booking
                            </label>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                    style={{
                                        border: '1px solid #334155',
                                        background: '#334155',
                                        color: '#e2e8f0',
                                        borderRadius: 10,
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        opacity: isSubmitting ? 0.7 : 1,
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{
                                        border: '1px solid #059669',
                                        background: '#059669',
                                        color: 'white',
                                        borderRadius: 10,
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        opacity: isSubmitting ? 0.7 : 1,
                                    }}
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
