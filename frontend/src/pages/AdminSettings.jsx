
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminSettings.css';

function AdminSettings() {
  const navigate = useNavigate();

  const [admin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dairyUser') || '{}');
    } catch {
      return {};
    }
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (newPassword !== confirmPassword) {
      setMessage('New password and confirm password do not match.');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 8) {
      setMessage('New password must contain at least 8 characters.');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('dairyToken');

      if (!token) {
        navigate('/admin-login');
        return;
      }

      const response = await fetch(
        'http://localhost:5000/api/admin/change-password',
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

      setMessage(data.message || 'Password changed successfully.');
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
    localStorage.removeItem('dairyToken');
    localStorage.removeItem('dairyUser');
    navigate('/admin-login');
  };

  return (
    <div className="admin-settings-page">
      <div className="settings-heading">
        <div>
          <p>ADMINISTRATION / SETTINGS</p>
          <h1>Settings</h1>
          <span>Manage your administrator account</span>
        </div>

        <button onClick={() => navigate('/admin-dashboard')}>
          ← Dashboard
        </button>
      </div>

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon">👤</span>
          <div>
            <h2>Admin Profile</h2>
            <p>Your administrator account information</p>
          </div>
        </div>

        <div className="settings-details">
          <div>
            <label>Full Name</label>
            <strong>{admin.name || 'Administrator'}</strong>
          </div>

          <div>
            <label>Email Address</label>
            <strong>{admin.email || 'Not available'}</strong>
          </div>

          <div>
            <label>Account Role</label>
            <strong>Administrator</strong>
          </div>

          <div>
            <label>Account Status</label>
            <strong className="settings-active">Active</strong>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon">🔐</span>
          <div>
            <h2>Change Password</h2>
            <p>Update your administrator account password</p>
          </div>
        </div>

        <form className="settings-password-form" onSubmit={handlePasswordChange}>
          <div className="settings-password-field">
            <label>Current Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="settings-password-field">
            <label>New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (minimum 8 characters)"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="settings-password-field">
            <label>Confirm New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <label className="settings-show-password">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />
            Show passwords
          </label>

          {message && (
            <div className={`settings-message ${messageType}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="settings-change-button"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon">🚪</span>
          <div>
            <h2>Session Management</h2>
            <p>Sign out from your administrator account</p>
          </div>
        </div>

        <div className="settings-action">
          <div>
            <strong>Sign Out</strong>
            <p>End your current administrator session.</p>
          </div>

          <button className="settings-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}

export default AdminSettings;
