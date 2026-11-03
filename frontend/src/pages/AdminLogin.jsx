
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API = 'http://localhost:5000/api/auth/login';

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);

      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.user?.role !== 'admin') {
        throw new Error('Admin account verification failed.');
      }

      localStorage.setItem('dairyToken', data.token);
      localStorage.setItem('dairyUser', JSON.stringify(data.user));

      navigate('/admin-dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <div className="admin-brand">
          <div className="admin-brand-icon">🥛</div>
          <div>
            <h2>Dairy Trust</h2>
            <p>Management Platform</p>
          </div>
        </div>

        <div className="admin-login-heading">
          <span className="admin-eyebrow">SECURE ADMIN PORTAL</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage your Dairy Trust platform.</p>
        </div>

        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label className="admin-label">Email Address</label>
          <input
            type="email"
            className="admin-input"
            placeholder="Enter admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <label className="admin-label mt-3">Password</label>
          <div className="admin-password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              className="admin-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="admin-show-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In to Dashboard →'}
          </button>
        </form>

        <div className="admin-login-footer">
          <span>Protected administrator access</span>
          <Link to="/">Back to Home</Link>
        </div>
      </div>

      <div className="admin-auth-bottom">
        © {new Date().getFullYear()} Dairy Trust. All rights reserved.
      </div>
    </div>
  );
}

export default AdminLogin;
