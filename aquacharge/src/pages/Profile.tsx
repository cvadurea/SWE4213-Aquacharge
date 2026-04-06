import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getPONavigation, getVONavigation } from '@/lib/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Upload } from 'lucide-react';

const USER_API_BASE = 'http://localhost:3007';

interface ProfileProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function Profile({ onLogout, onNavigate }: ProfileProps) {
  const [user, setUser] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [editingField, setEditingField] = useState<'first_name' | 'last_name' | 'email' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setAvatarPreview(parsed.avatar_url || '');
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  const persistUser = (updatedUser: any) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleAvatarPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const saveProfile = async (nextUser: any) => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${USER_API_BASE}/users/${nextUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextUser),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      persistUser(data);
      setSuccess('Profile updated successfully');
      setEditingField(null);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Could not connect to user service');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveField = async () => {
    if (!user || !editingField) return;
    if (!editValue.trim()) {
      setError('This field cannot be empty');
      return;
    }

    const nextUser = { ...user, [editingField]: editValue.trim() };
    await saveProfile(nextUser);
  };

  const handleSaveAvatar = async () => {
    if (!user) return;
    await saveProfile({ ...user, avatar_url: avatarPreview });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!deletePassword.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`${USER_API_BASE}/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to delete account');
        return;
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      onLogout();
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Could not connect to user service');
    } finally {
      setIsDeleting(false);
    }
  };

  const userType = user?.type === 'port_operator' ? 'port_operator' : 'vessel_owner';

  const navigation = userType === 'port_operator' ? getPONavigation() : getVONavigation();

  if (!user) {
    return (
      <DashboardLayout
        title="My Profile"
        subtitle="Manage your account details"
        onLogout={onLogout}
        navigation={navigation}
        currentPage="profile"
        onNavigate={onNavigate}
        userType={userType}
      >
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Unable to load profile. Please log in again.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Profile"
      subtitle="Manage your account details"
      onLogout={onLogout}
      navigation={navigation}
      currentPage="profile"
      onNavigate={onNavigate}
      userType={userType}
    >
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-lg border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl">👤</span>
              )}
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              <Upload className="h-4 w-4" />
              Change avatar
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
            </label>
            <div className="flex gap-2">
              <Button onClick={handleSaveAvatar} disabled={isSaving || !avatarPreview} className="flex-1">
                {isSaving ? 'Saving...' : 'Save Avatar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setAvatarPreview(user.avatar_url || '')}
                className="flex-1"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {(['first_name', 'last_name', 'email'] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium capitalize text-muted-foreground">
                      {field.replace('_', ' ')}
                    </label>
                    {editingField !== field && (
                      <button
                        type="button"
                        className="text-sm font-medium text-secondary hover:text-secondary/80"
                        onClick={() => {
                          setEditingField(field);
                          setEditValue(user[field] || '');
                          setError('');
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {editingField === field ? (
                    <div className="space-y-3">
                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveField} disabled={isSaving} className="flex-1">
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setEditingField(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
                      {user[field] || '—'}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Permanently delete your account. This cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  Delete Account
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}