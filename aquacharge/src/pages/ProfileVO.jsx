import React, { useState, useEffect } from 'react';
import SidebarVO from '../components/SidebarVO';

const USER_API_BASE = 'http://localhost:3007';

const ProfileVO = ({ onNavigate, onLogout }) => {
  const [user, setUser] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);

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

  const loadUserProfile = async () => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setAvatarPreview(storedUser.avatar_url);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditField = (field) => {
    setEditingField(field);
    if (field === 'first_name') {
      setEditValue(user.first_name || '');
    } else if (field === 'last_name') {
      setEditValue(user.last_name || '');
    } else if (field === 'email') {
      setEditValue(user.email || '');
    }
    setError('');
    setSuccessMessage('');
  };

  const handleSaveField = async () => {
    if (!editValue.trim()) {
      setError('Field cannot be empty');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');

      const updatedUser = { ...user };
      if (editingField === 'first_name') {
        updatedUser.first_name = editValue;
      } else if (editingField === 'last_name') {
        updatedUser.last_name = editValue;
      } else if (editingField === 'email') {
        updatedUser.email = editValue;
      }

      if (avatarPreview && avatarPreview !== user.avatar_url) {
        updatedUser.avatar_url = avatarPreview;
      }

      const response = await fetch(`${USER_API_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          avatar_url: updatedUser.avatar_url,
          type: updatedUser.type,
        }),
      });

      if (response.ok) {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setEditingField(null);
        setSuccessMessage(`${editingField.replace('_', ' ')} updated successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Could not connect to server');
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatarPreview || avatarPreview === user.avatar_url) {
      setError('Please select a new avatar');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');

      const updatedUser = { ...user, avatar_url: avatarPreview };

      const response = await fetch(`${USER_API_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          avatar_url: updatedUser.avatar_url,
          type: updatedUser.type,
        }),
      });

      if (response.ok) {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setSuccessMessage('Avatar updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update avatar');
      }
    } catch (err) {
      console.error('Error updating avatar:', err);
      setError('Could not connect to server');
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
    setError('');
    if (avatarPreview !== user.avatar_url) {
      setAvatarPreview(user.avatar_url);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a' }}>
        <SidebarVO onNavigate={onNavigate} onLogout={onLogout} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a' }}>
        <SidebarVO onNavigate={onNavigate} onLogout={onLogout} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <p>User not found. Please log in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a' }}>
      <SidebarVO onNavigate={onNavigate} onLogout={onLogout} />
      
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', color: '#fff' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '40px' }}>My Profile</h1>

        {error && (
          <div style={{
            backgroundColor: '#dc2626',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            backgroundColor: '#16a34a',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {successMessage}
          </div>
        )}

        {/* Avatar Section */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Profile Picture</h2>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              backgroundColor: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '4px solid #475569'
            }}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <span style={{ fontSize: '60px' }}>👤</span>
              )}
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{
              display: 'none',
              cursor: 'pointer'
            }}
            id="avatar-input"
          />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => document.getElementById('avatar-input').click()}
              style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Choose Image
            </button>

            {avatarPreview && avatarPreview !== user.avatar_url && (
              <>
                <button
                  onClick={handleSaveAvatar}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Save Avatar
                </button>
                <button
                  onClick={() => {
                    setAvatarPreview(user.avatar_url);
                    document.getElementById('avatar-input').value = '';
                  }}
                  style={{
                    backgroundColor: '#6b7280',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Information Section */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '32px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Personal Information</h2>

          {/* First Name */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>First Name</label>
              {editingField !== 'first_name' && (
                <button
                  onClick={() => handleEditField('first_name')}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#3b82f6',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'underline'
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingField === 'first_name' ? (
              <div>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    marginBottom: '12px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSaveField}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    style={{
                      backgroundColor: '#6b7280',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '16px', color: '#e2e8f0' }}>{user.first_name}</p>
            )}
          </div>

          {/* Last Name */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Last Name</label>
              {editingField !== 'last_name' && (
                <button
                  onClick={() => handleEditField('last_name')}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#3b82f6',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'underline'
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingField === 'last_name' ? (
              <div>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    marginBottom: '12px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSaveField}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    style={{
                      backgroundColor: '#6b7280',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '16px', color: '#e2e8f0' }}>{user.last_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Email</label>
              {editingField !== 'email' && (
                <button
                  onClick={() => handleEditField('email')}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#3b82f6',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'underline'
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingField === 'email' ? (
              <div>
                <input
                  type="email"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    marginBottom: '12px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSaveField}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    style={{
                      backgroundColor: '#6b7280',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '16px', color: '#e2e8f0' }}>{user.email}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileVO;
