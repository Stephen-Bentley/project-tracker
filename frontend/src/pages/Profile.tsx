import React, { FormEvent, useEffect, useState } from 'react';
import { getCurrentUser, updateCurrentUser } from '../api/users';
import { User } from '../types';
import './Profile.css';

interface ProfileProps {
  darkMode: boolean;
  onThemeChange: (darkMode: boolean) => void;
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const Profile: React.FC<ProfileProps> = ({ darkMode, onThemeChange }) => {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setName(currentUser.name);
        setAvatarUrl(currentUser.avatarUrl || '');
      })
      .catch(() => setMessage('Unable to load your profile.'));
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const updatedUser = await updateCurrentUser(name, avatarUrl);
      setUser(updatedUser);
      setName(updatedUser.name);
      setAvatarUrl(updatedUser.avatarUrl || '');
      setMessage('Profile saved.');
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Unable to save your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const displayName = name || user?.name || 'User';

  return (
    <main className="profile-page">
      <div className="profile-intro">
        <p>Account settings</p>
        <h1>Make Project Tracker yours.</h1>
        <span>
          Update your identity and choose the interface that feels right for
          you.
        </span>
      </div>
      <div className="profile-grid">
        <section className="profile-card profile-preview">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              initials(displayName)
            )}
          </div>
          <h2>{displayName}</h2>
          <p>{user?.email || 'Loading account details...'}</p>
        </section>
        <form className="profile-card profile-form" onSubmit={saveProfile}>
          <h2>Profile</h2>
          <label>
            Display name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Profile image URL
            <input
              type="url"
              placeholder="https://example.com/me.jpg"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
          </label>
          <p className="form-help">
            Use a public image URL. Leave it empty to show your initials.
          </p>
          <div className="theme-choice">
            <div>
              <strong>Dark mode</strong>
              <span>Use a darker, lower-glare interface.</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(event) => onThemeChange(event.target.checked)}
              />
              <span />
            </label>
          </div>
          {message && <p className="profile-message">{message}</p>}
          <button className="primary-action" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default Profile;
