
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChangePassword.css';

function ChangePassword() {
  const navigate = useNavigate();

  const farmerToken = localStorage.getItem('farmerToken');
  const dairyToken = localStorage.getItem('dairyToken');

  const isFarmer = Boolean(farmerToken);
  const token = farmerToken || dairyToken;

  const userKey = isFarmer ? 'farmerUser' : 'dairyUser';

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem(userKey) || '{}');
  } catch {
    user = {};
  }

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage('');
    setMessageType('');

    if (!token) {
      setMessage('Please login first.');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters.');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New password and confirm password do not match.');
      setMessageType('error');
      return;
    }

    if (currentPassword === newPassword) {
      setMessage('New password must be different from current password.');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        'http://localhost:5000/api/auth/change-password',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Password change failed.');
      }

      setMessage('Password changed successfully. Please login again.');
      setMessageType('success');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error) {
      setMessage(error.message || 'Something went wrong.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('farmerToken');
    localStorage.removeItem('farmerUser');
    localStorage.removeItem('dairyToken');
    localStorage.removeItem('dairyUser');

    navigate(isFarmer ? '/farmer-login' : '/');
  };

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-icon">🔐</div>

        <h1>Change Password</h1>

        <p className="change-password-subtitle">
          Secure your {isFarmer ? 'Farmer' : 'Dairy Owner'} account
        </p>

        <form onSubmit={handleSubmit}>
          <div className="password-form-group">
            <label>Current Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="password-form-group">
            <label>New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="password-form-group">
            <label>Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <label className="show-password-option">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            Show Password
          </label>

          {message && (
            <div className={`password-message ${messageType}`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading || !token}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {messageType === 'success' && (
          <button
            type="button"
            className="password-logout-button"
            onClick={handleLogout}
          >
            Logout and Login Again
          </button>
        )}
      </div>
    </div>
  );
}

export default ChangePassword;
