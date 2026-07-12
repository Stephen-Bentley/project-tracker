import React, { FormEvent, useEffect, useState } from 'react';
import {
  changeCurrentUserPassword,
  getCurrentUser,
  uploadCurrentUserAvatar,
  updateCurrentUser,
} from '../api/users';
import { User } from '../types';
import { avatarSource } from '../utils/avatar';
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
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setName(currentUser.name);
        setAvatarUrl(currentUser.avatarUrl || '');
        setAvatarLoadFailed(false);
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
      setAvatarLoadFailed(false);
      setMessage('Profile saved.');
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Unable to save your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;

    setUploadingAvatar(true);
    setMessage('');
    try {
      const updatedUser = await uploadCurrentUserAvatar(file);
      setUser(updatedUser);
      setAvatarUrl(updatedUser.avatarUrl || '');
      setAvatarLoadFailed(false);
      setMessage('Profile image uploaded.');
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || 'Unable to upload your image.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated successfully.');
    } catch (error: any) {
      setPasswordMessage(
        error.response?.data?.message || 'Unable to update your password.'
      );
    } finally {
      setChangingPassword(false);
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
            {avatarUrl && !avatarLoadFailed ? (
              <img
                src={avatarSource(avatarUrl)}
                alt="Profile"
                onError={() => setAvatarLoadFailed(true)}
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
            Profile image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploadingAvatar}
              onChange={(event) => {
                setAvatarLoadFailed(false);
                uploadAvatar(event.target.files?.[0]);
              }}
            />
          </label>
          <p className="form-help">
            {uploadingAvatar
              ? 'Uploading image...'
              : 'Upload a JPG, PNG, WebP, or GIF image up to 5 MB.'}
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
        <form
          className="profile-card profile-form password-form"
          onSubmit={changePassword}
        >
          <h2>Reset password</h2>
          <p className="form-help">
            Choose a new password with at least six characters.
          </p>
          <label>
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label>
            New password
            <input
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm new password
            <input
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {passwordMessage && (
            <p className="profile-message">{passwordMessage}</p>
          )}
          <button className="primary-action" disabled={changingPassword}>
            {changingPassword ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default Profile;
