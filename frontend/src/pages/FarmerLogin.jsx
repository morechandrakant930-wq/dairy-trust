import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react'
import './FarmerLogin.css'

function FarmerLogin() {
  const [role, setRole] = useState('dairyOwner')
  const [email, setEmail] = useState('')
  const [farmerId, setFarmerId] = useState('')
  const [dairyId, setDairyId] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()

  async function handleLogin(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          email,
          farmerId,
          dairyId,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setMessage(data.message || 'Login failed. Please check your credentials.')
        return
      }

      if (role === 'dairyOwner') {
        localStorage.setItem('dairyToken', data.token)
        localStorage.setItem('dairyUser', JSON.stringify(data.user))
      } else {
        localStorage.setItem('farmerToken', data.token)
        localStorage.setItem('farmerUser', JSON.stringify(data.user))
      }

      if (role === 'farmer' && data.user.mustChangePassword) {
        setMessage('Login successful! Redirecting to change password...')
        setTimeout(() => navigate('/change-password'), 1000)
      } else if (role === 'farmer') {
        setMessage(`Login successful! Welcome, ${data.user.name || ''}.`)
        setTimeout(() => navigate('/farmer-dashboard'), 1000)
      } else {
        setMessage(`Login successful! Welcome, ${data.user.dairyName || ''}.`)
        setTimeout(() => navigate('/dairy-dashboard'), 1000)
      }
    } catch {
      setMessage('Cannot connect to backend. Please check if the server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      <div className="login-background-shape login-shape-one"></div>
      <div className="login-background-shape login-shape-two"></div>

      <Link to="/" className="login-back-home">
        <ArrowLeft size={17} />
        Back to Home
      </Link>

      <div className="login-layout">

        <div className="login-intro">
          <div className="login-brand">
            <span className="login-brand-icon">🥛</span>
            <span>Dairy <strong>Trust</strong></span>
          </div>

          <div className="login-intro-content">
            <span className="login-intro-label">WELCOME TO DAIRY TRUST</span>

            <h1>
              Your Dairy.
              <span>Your Digital Partner.</span>
            </h1>

            <p>
              Manage milk collection, farmer records and payments through
              one simple and transparent platform.
            </p>

            <div className="login-benefits">
              <div><span>✓</span> Digital dairy management</div>
              <div><span>✓</span> Transparent payment records</div>
              <div><span>✓</span> Secure user access</div>
            </div>
          </div>

          <div className="login-intro-footer">
            Smart Dairy Management • Trusted Payments
          </div>
        </div>

        <div className="login-form-side">

          <div className="login-card">

            <div className="login-card-heading">
              <div className="login-card-icon">🥛</div>
              <h2>Sign In</h2>
              <p>Access your Dairy Trust account</p>
            </div>

            <form onSubmit={handleLogin}>

              <div className="login-field">
                <label htmlFor="login-role">Login as</label>

                <select
                  id="login-role"
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value)
                    setMessage('')
                  }}
                  className="login-input"
                >
                  <option value="dairyOwner">Dairy Owner (मालक)</option>
                  <option value="farmer">Farmer (शेतकरी)</option>
                </select>
              </div>

              {role === 'dairyOwner' ? (
                <div className="login-field">
                  <label htmlFor="login-email">Registered Email</label>

                  <input
                    id="login-email"
                    type="email"
                    className="login-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="owner@gmail.com"
                    autoComplete="email"
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="login-field">
                    <label htmlFor="login-dairy-id">Dairy ID</label>

                    <input
                      id="login-dairy-id"
                      type="text"
                      className="login-input"
                      value={dairyId}
                      onChange={(event) => setDairyId(event.target.value)}
                      placeholder="Enter Dairy ID"
                      required
                    />
                  </div>

                  <div className="login-field">
                    <label htmlFor="login-farmer-id">Farmer ID</label>

                    <input
                      id="login-farmer-id"
                      type="text"
                      className="login-input"
                      value={farmerId}
                      onChange={(event) => setFarmerId(event.target.value)}
                      placeholder="Enter Farmer ID"
                      required
                    />
                  </div>
                </>
              )}

              <div className="login-field">
                <label htmlFor="login-password">Password</label>

                <div className="login-password-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="login-eye-button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                {!loading && <span>→</span>}
              </button>

            </form>

            {message && (
              <div
                className={`login-message ${
                  message.includes('successful') ? 'login-success' : 'login-error'
                }`}
                role="status"
              >
                {message}
              </div>
            )}

            <div className="login-security">
              <ShieldCheck size={17} />
              Secure login for registered users
            </div>

            <div className="login-card-footer">
              <Link to="/">
                <ArrowLeft size={15} />
                Back to Home & Plans
              </Link>
            </div>

          </div>

          <p className="login-copyright">
            © {new Date().getFullYear()} Dairy Trust. All rights reserved.
          </p>

        </div>
      </div>
    </div>
  )
}

export default FarmerLogin