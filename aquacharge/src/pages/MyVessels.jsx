import React, { useEffect, useState } from 'react';
import SidebarVO from '../components/SidebarVO';
import VesselCard from '../components/VesselCard';

const FLEET_API_BASE = import.meta.env.VITE_FLEET_API_URL || 'http://localhost:3004';

const initialFormState = {
    vessel_name: '',
    vessel_model: '',
    registration_number: '',
    battery_capacity: '',
    is_primary: false,
};

const MyVessels = ({ onNavigate }) => {
    const [vessels, setVessels] = useState([]);
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

    const getVessels = async () => {
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
        const response = await fetch(`${FLEET_API_BASE}/vessels/${encodeURIComponent(user.id)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
                },
            });

        const data = await parseResponseBody(response);

            if (response.ok) {
                setVessels(Array.isArray(data) ? data : []);
            } else {
          if (response.status === 401) {
            setError('Session expired or unauthorized. Please log in again.');
          } else {
            setError(data.message || `Failed to fetch vessels (HTTP ${response.status}).`);
          }
            }
        } catch (err) {
            console.error('Error fetching vessels:', err);
            setError('Could not connect to vessel service.');
        }
    };

    useEffect(() => {
        getVessels();
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

    const createVessel = async (event) => {
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

        if (!formData.vessel_name || !formData.vessel_model || !formData.registration_number || !formData.battery_capacity) {
            setError('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
          const response = await fetch(`${FLEET_API_BASE}/vessels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    owner_id: String(user.id),
                    vessel_name: formData.vessel_name,
                    vessel_model: formData.vessel_model,
                    registration_number: formData.registration_number,
                    battery_capacity: Number(formData.battery_capacity),
                    is_primary: formData.is_primary,
                }),
            });

                const data = await parseResponseBody(response);

            if (!response.ok) {
                  if (response.status === 401) {
                    setError('Session expired or unauthorized. Please log in again.');
                  } else {
                    setError(data.message || `Failed to create vessel (HTTP ${response.status}).`);
                  }
                return;
            }

                await getVessels();
            closeModal();
        } catch (err) {
            console.error('Error creating vessel:', err);
            setError('Could not connect to vessel service.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
      <SidebarVO onNavigate={onNavigate} />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold">My Vessels</h1>
              <p className="text-gray-400 mt-2">Manage your vessel fleet</p>
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
              <span className="mt-2 font-medium">Create Vessel</span>
            </button>

            {vessels.map((vessel) => (
              <VesselCard key={vessel.id} vessel={vessel} />
            ))}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-4">Create Vessel</h2>

            <form onSubmit={createVessel} className="space-y-4">
              <input
                name="vessel_name"
                value={formData.vessel_name}
                onChange={onInputChange}
                placeholder="Vessel Name"
                className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                required
              />
              <input
                name="vessel_model"
                value={formData.vessel_model}
                onChange={onInputChange}
                placeholder="Vessel Model"
                className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                required
              />
              <input
                name="registration_number"
                value={formData.registration_number}
                onChange={onInputChange}
                placeholder="Registration Number"
                className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                required
              />
              <input
                name="battery_capacity"
                value={formData.battery_capacity}
                onChange={onInputChange}
                type="number"
                min="1"
                placeholder="Battery Capacity (kWh)"
                className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                required
              />

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="is_primary"
                  checked={formData.is_primary}
                  onChange={onInputChange}
                />
                Set as primary vessel
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
                  {isSubmitting ? 'Creating...' : 'Create Vessel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyVessels;
                
