
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/dairies/register';

function DairyRegister() {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') || 'basic';

  const [form, setForm] = useState({
    dairyName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    plan: planParam,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setForm((prev) => ({ ...prev, plan: planParam }));
  }, [planParam]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (form.password.length < 8) {
      setMessage('Password must contain at least 8 characters.');
      return;
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      setMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          dairyName: form.dairyName.trim(),
          ownerName: form.ownerName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
        }),
      });

      // Read response as text first, then parse JSON
      const responseText = await response.text();

      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        console.error('Non-JSON backend response:', responseText);

        throw new Error(
          `Server returned an invalid response. Check API URL and backend. Status: ${response.status}`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Registration failed.');
      }

      setMessage('Dairy registered successfully! Redirecting to login...');

      setForm({
        dairyName: '',
        ownerName: '',
        email: '',
        phone: '',
        password: '',
        plan: planParam,
      });

      setTimeout(() => {
        navigate('/farmer-login');
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      setMessage(err.message || 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container-fluid min-vh-100 d-flex align-items-center justify-content-center py-5 px-3"
      style={{ backgroundColor: '#F8FAFC' }}
    >
      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden bg-white"
        style={{ maxWidth: '520px', width: '100%' }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Link
              to="/"
              className="text-secondary small text-decoration-none fw-semibold"
            >
              ← Back to Home
            </Link>

            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill text-uppercase">
              Plan: {form.plan}
            </span>
          </div>

          <div className="text-center mb-4">
            <span className="fs-1">🥛</span>
            <h3 className="fw-bold text-dark mt-2 mb-1">
              Register Your Dairy
            </h3>
            <p className="text-secondary small">
              Create your Dairy Trust enterprise account.
            </p>
          </div>

          {message && (
            <div
              className={`alert ${
                message.includes('successfully')
                  ? 'alert-success'
                  : 'alert-danger'
              } rounded-3 py-2 small mb-3`}
              role="alert"
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">
                Dairy Name
              </label>
              <input
                type="text"
                name="dairyName"
                className="form-control rounded-3 py-2"
                placeholder="e.g. Gokul Dairy Farm"
                value={form.dairyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">
                Owner Full Name
              </label>
              <input
                type="text"
                name="ownerName"
                className="form-control rounded-3 py-2"
                placeholder="Enter owner full name"
                value={form.ownerName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                className="form-control rounded-3 py-2"
                placeholder="e.g. owner@gmail.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">
                Contact Number
              </label>
              <input
                type="tel"
                name="phone"
                className="form-control rounded-3 py-2"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={handleChange}
                maxLength={10}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary">
                Create Password
              </label>

              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-control rounded-start-3 py-2"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-end-3"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small className="text-secondary">
                Password must contain at least 8 characters.
              </small>
            </div>

            <button
              type="submit"
              className="btn btn-success w-100 rounded-3 py-2 fw-semibold shadow-sm"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Dairy Account'}
            </button>
          </form>

          <p className="text-center text-secondary small mt-4 mb-0">
            Your password is securely hashed by the backend before storage.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DairyRegister;
