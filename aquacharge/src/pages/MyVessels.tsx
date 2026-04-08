import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getVONavigation } from '@/lib/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Plus, Ship, CheckCircle, Loader2, X, Star, Trash2 } from 'lucide-react';

const FLEET_API_BASE = 'http://localhost:3004';

interface Vessel {
  id: string;
  vessel_name: string;
  vessel_model: string;
  registration_number: string;
  battery_capacity: number;
  is_primary: boolean;
}

interface MyVesselsProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const initialFormState = {
  vessel_name: '',
  vessel_model: '',
  registration_number: '',
  battery_capacity: '',
  is_primary: false,
};

export default function MyVessels({ onNavigate, onLogout }: MyVesselsProps) {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Detail modal state
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editedVesselName, setEditedVesselName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const getStoredUser = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    try {
      return JSON.parse(userData);
    } catch (err) {
      console.error('Error parsing user data:', err);
      return null;
    }
  };

  const parseResponseBody = async (response: Response) => {
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
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError('Missing auth token. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const response = await fetch(`${FLEET_API_BASE}/vessels/${encodeURIComponent(user.id)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponseBody(response);

      if (response.ok) {
        const vesselList = Array.isArray(data) ? data : [];
        setVessels(vesselList.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)));
      } else {
        if (response.status === 401) {
          setError('Session expired or unauthorized. Please log in again.');
        } else {
          setError(data.message || `Failed to fetch vessels (HTTP ${response.status}).`);
        }
      }
    } catch (err) {
      console.error('Error fetching vessels:', err);
      setError('Could not connect to fleet service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setError('');
  };

  const createVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getStoredUser();
    const token = localStorage.getItem('token');

    if (!user?.id || !token) {
      setError('Unable to create vessel. Please log in again.');
      return;
    }

    if (!formData.vessel_name || !formData.registration_number) {
      setError('Please fill in all required fields.');
      return;
    }

    const existingReg = vessels.some(
      (v) => v.registration_number.toLowerCase() === formData.registration_number.toLowerCase()
    );
    if (existingReg) {
      setError('A vessel with this registration number already exists.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      const response = await fetch(`${FLEET_API_BASE}/vessels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner_id: user.id,
          vessel_name: formData.vessel_name,
          vessel_model: formData.vessel_model,
          registration_number: formData.registration_number,
          battery_capacity: formData.battery_capacity ? parseFloat(formData.battery_capacity) : null,
          is_primary: formData.is_primary,
        }),
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        setError(data.message || `Failed to create vessel (HTTP ${response.status}).`);
        return;
      }

      setSuccess(`Vessel "${formData.vessel_name}" created successfully!`);
      resetForm();
      setIsModalOpen(false);
      await getVessels();
    } catch (err) {
      console.error('Error creating vessel:', err);
      setError('Could not connect to fleet service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetailModal = (vessel: Vessel) => {
    setSelectedVessel(vessel);
    setEditedVesselName(vessel.vessel_name);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedVessel(null);
    setEditedVesselName('');
    setError('');
  };

  const updateVesselName = async () => {
    if (!selectedVessel || !editedVesselName.trim()) {
      setError('Vessel name cannot be empty.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Missing auth token. Please log in again.');
      return;
    }

    try {
      setIsUpdating(true);
      setError('');

      const response = await fetch(`${FLEET_API_BASE}/vessels/${selectedVessel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vessel_name: editedVesselName.trim(),
          vessel_model: selectedVessel.vessel_model,
          registration_number: selectedVessel.registration_number,
          battery_capacity: selectedVessel.battery_capacity,
          is_primary: selectedVessel.is_primary,
        }),
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        setError(data.message || `Failed to update vessel (HTTP ${response.status}).`);
        return;
      }

      setSuccess(`Vessel name updated successfully!`);
      closeDetailModal();
      await getVessels();
    } catch (err) {
      console.error('Error updating vessel:', err);
      setError('Could not connect to fleet service.');
    } finally {
      setIsUpdating(false);
    }
  };

  const setPrimaryVessel = async () => {
    if (!selectedVessel) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Missing auth token. Please log in again.');
      return;
    }

    try {
      setIsUpdating(true);
      setError('');

      const response = await fetch(`${FLEET_API_BASE}/vessels/${selectedVessel.id}/set-primary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        setError(data.message || `Failed to set primary vessel (HTTP ${response.status}).`);
        return;
      }

      setSuccess(`${selectedVessel.vessel_name} set as primary vessel!`);
      closeDetailModal();
      await getVessels();
    } catch (err) {
      console.error('Error setting primary vessel:', err);
      setError('Could not connect to fleet service.');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteVessel = async () => {
    if (!selectedVessel) return;

    if (!confirm(`Are you sure you want to delete "${selectedVessel.vessel_name}"? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Missing auth token. Please log in again.');
      return;
    }

    try {
      setIsUpdating(true);
      setError('');

      const response = await fetch(`${FLEET_API_BASE}/vessels/${selectedVessel.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await parseResponseBody(response);
        setError(data.message || `Failed to delete vessel (HTTP ${response.status}).`);
        return;
      }

      setSuccess(`Vessel "${selectedVessel.vessel_name}" deleted successfully!`);
      closeDetailModal();
      await getVessels();
    } catch (err) {
      console.error('Error deleting vessel:', err);
      setError('Could not connect to fleet service.');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    getVessels();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const navigation = getVONavigation();

  return (
    <DashboardLayout
      title="My Vessels"
      subtitle="Manage your vessel fleet"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="my-vessels"
      onNavigate={onNavigate}
      userType="vessel_owner"
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-accent/10 p-4 border border-accent/20">
          <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-accent">{success}</p>
        </div>
      )}

      {/* Add Vessel Button */}
      <div className="mb-8">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Vessel
        </Button>
      </div>

      {/* Vessels Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-secondary animate-spin mr-3" />
          <p className="text-muted-foreground">Loading vessels...</p>
        </div>
      ) : vessels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ship className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No vessels yet</p>
            <Button onClick={() => setIsModalOpen(true)}>
              Add Your First Vessel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vessels.map((vessel) => (
            <Card
              key={vessel.id}
              onClick={() => openDetailModal(vessel)}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-secondary/50"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {vessel.vessel_name}
                      </h3>
                      {vessel.is_primary && (
                        <span className="px-2 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-semibold">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {vessel.vessel_model}
                    </p>
                  </div>
                  <Ship className="h-8 w-8 text-secondary/50 flex-shrink-0" />
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Registration Number
                    </p>
                    <p className="font-mono text-sm text-foreground">
                      {vessel.registration_number}
                    </p>
                  </div>

                  {vessel.battery_capacity && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Battery Capacity
                      </p>
                      <p className="font-semibold text-foreground">
                        {vessel.battery_capacity} kWh
                      </p>
                    </div>
                  )}
                </div>

                {vessel.is_primary && (
                  <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
                    <p className="text-xs text-accent font-medium">
                      This is your primary vessel for bookings
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vessel Detail Modal */}
      {isDetailModalOpen && selectedVessel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-border">
              <div className="flex-1">
                <CardTitle>Vessel Details</CardTitle>
                <CardDescription>{selectedVessel.registration_number}</CardDescription>
              </div>
              <button
                onClick={closeDetailModal}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Vessel Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Vessel Name (Edit)
                  </label>
                  <Input
                    value={editedVesselName}
                    onChange={(e) => setEditedVesselName(e.target.value)}
                    placeholder="Enter vessel name"
                    disabled={isUpdating}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Click the save button below to update
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Vessel Model</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVessel.vessel_model || 'Not specified'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Registration Number</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {selectedVessel.registration_number}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Battery Capacity</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVessel.battery_capacity ? `${selectedVessel.battery_capacity} kWh` : 'Not specified'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Primary Vessel</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVessel.is_primary ? 'Yes - This is your primary vessel' : 'No - Not set as primary'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-6 border-t border-border">
                <button
                  onClick={updateVesselName}
                  disabled={isUpdating || editedVesselName === selectedVessel.vessel_name}
                  className="w-full px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isUpdating ? 'Saving...' : 'Save Name Changes'}
                </button>

                {!selectedVessel.is_primary && (
                  <button
                    onClick={setPrimaryVessel}
                    disabled={isUpdating}
                    className="w-full px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                  >
                    <Star className="h-4 w-4" />
                    {isUpdating ? 'Setting...' : 'Set as Primary Vessel'}
                  </button>
                )}

                <button
                  onClick={deleteVessel}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isUpdating ? 'Deleting...' : 'Delete Vessel'}
                </button>

                <button
                  onClick={closeDetailModal}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Close
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Vessel Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Vessel</CardTitle>
              <CardDescription>Register a new vessel to your fleet</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createVessel} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Vessel Name *
                  </label>
                  <Input
                    name="vessel_name"
                    placeholder="e.g., MV Aqua One"
                    value={formData.vessel_name}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Vessel Model
                  </label>
                  <Input
                    name="vessel_model"
                    placeholder="e.g., Tesla Semi"
                    value={formData.vessel_model}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Registration Number *
                  </label>
                  <Input
                    name="registration_number"
                    placeholder="e.g., REG-2024-001"
                    value={formData.registration_number}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Battery Capacity (kWh)
                  </label>
                  <Input
                    name="battery_capacity"
                    type="number"
                    placeholder="e.g., 500"
                    value={formData.battery_capacity}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    step="0.1"
                    min="0"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    name="is_primary"
                    checked={formData.is_primary}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-foreground">
                    Set as primary vessel for bookings
                  </span>
                </label>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Vessel'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
