import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../language/LanguageContext'
import './FarmerDashboard.css'

function FarmerDashboard() {
  const { t } = useLanguage()
  const [farmer, setFarmer] = useState(null)
  const [milkRecords, setMilkRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentModeInfo, setPaymentModeInfo] = useState(null)
  const [upiInput, setUpiInput] = useState('')
  const [upiMessage, setUpiMessage] = useState('')
  const [upiSubmitting, setUpiSubmitting] = useState(false)
  const navigate = useNavigate()

  const loadPaymentMode = async (token) => {
    try {
      const res = await fetch('http://localhost:5000/api/payment-management/farmer/payment-mode', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setPaymentModeInfo(data)
        if (data.bankDetails?.upiId) {
          setUpiInput(data.bankDetails.upiId)
        }
      }
    } catch (e) {
      // Ignore background fetch error
    }
  }

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem('farmerToken')
        const savedFarmer = localStorage.getItem('farmerUser')

        if (!token || !savedFarmer) {
          setError(t('loginError'))
          return
        }

        const user = JSON.parse(savedFarmer)
        setFarmer(user)

        const response = await fetch(
          'http://localhost:5000/api/milk-collections',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load milk records.')
        }

        setMilkRecords(result.data || [])
        await loadPaymentMode(token)
      } catch (err) {
        setError(err.message || 'Could not connect to the backend.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [t])

  const handleRequestUpi = async (e) => {
    e.preventDefault()
    if (!upiInput.trim() || !upiInput.includes('@')) {
      setUpiMessage('Please enter a valid UPI ID (e.g. yourname@okaxis).')
      return
    }

    try {
      setUpiSubmitting(true)
      setUpiMessage('')
      const token = localStorage.getItem('farmerToken')

      const res = await fetch('http://localhost:5000/api/payment-management/farmer/payment-mode-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: 'upi',
          bankDetails: {
            upiId: upiInput.trim().toLowerCase(),
            accountHolderName: farmer?.name,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Request failed')

      setUpiMessage('UPI payout request submitted successfully! Pending Dairy Owner approval.')
      await loadPaymentMode(token)
    } catch (err) {
      setUpiMessage(err.message)
    } finally {
      setUpiSubmitting(false)
    }
  }

  const totalMilk = milkRecords.reduce(
    (total, record) => total + Number(record.quantity || 0),
    0
  )

  const totalEarnings = milkRecords.reduce(
    (total, record) => total + Number(record.totalPayment || 0),
    0
  )

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const formatRupees = (amount) =>
    `₹${(Number(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return (
    <div className="container-fluid min-vh-100 p-0 farmer-dashboard">
      {/* Top Navbar */}
      <header className="farmer-dashboard-navbar bg-white border-bottom py-3 px-4 px-md-5 d-flex justify-content-between align-items-center shadow-sm">
        <Link to="/" className="text-success fw-bold fs-4 text-decoration-none d-flex align-items-center gap-2 farmer-dashboard-brand">
          <span>🥛</span> Dairy Trust
        </Link>

        <div className="d-flex align-items-center gap-2">
          <Link
            to="/change-password"
            className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
          >
            🔐 Change Password
          </Link>

          <button
            className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-semibold shadow-sm"
            onClick={() => {
              localStorage.removeItem('farmerToken')
              localStorage.removeItem('farmerUser')
              navigate('/farmer-login')
            }}
          >
            {t('logout')}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="container py-4 farmer-dashboard-content" style={{ maxWidth: '1000px' }}>
        
        {/* Welcome Hero Banner */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 text-white farmer-dashboard-hero">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <span className="badge bg-white text-success px-3 py-1 rounded-pill fw-bold mb-2">{t('verifiedFarmer')}</span>
              <h3 className="fw-bold mb-1">{t('welcomeBack')}, {farmer?.name || 'Farmer'}! 👋</h3>
              <p className="mb-0 text-white-50 small">
                {t('farmerId')}: <strong>{farmer?.farmerId || farmer?.id || t('notAvailable')}</strong>
              </p>
            </div>
            <div className="fs-1 d-none d-md-block">
              🌾🥛
            </div>
          </div>
        </div>

        {loading && (
          <div className="alert alert-info rounded-4 border-0 shadow-sm p-4">{t('loadingRecords')}</div>
        )}

        {error && (
          <div className="alert alert-danger rounded-4 border-0 shadow-sm p-4">
            {error}
            <div className="mt-3">
              <Link to="/farmer-login" className="btn btn-sm btn-outline-danger rounded-pill px-3">
                {t('goToLogin')}
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPI Overview Cards */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white border-start border-success border-4 farmer-dashboard-kpi">
                  <div className="card-body p-4">
                    <small className="text-secondary fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>{t('totalMilkCollected')}</small>
                    <h2 className="fw-bold text-success mt-1 mb-0">
                      {totalMilk.toFixed(1)} <span className="fs-5 text-muted">{t('litres')}</span>
                    </h2>
                    <small className="text-secondary mt-2 d-block">{t('savedRecordsNote')}</small>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white border-start border-primary border-4 farmer-dashboard-kpi">
                  <div className="card-body p-4">
                    <small className="text-secondary fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>{t('totalEstimatedPayout')}</small>
                    <h2 className="fw-bold text-primary mt-1 mb-0">
                      {formatRupees(totalEarnings)}
                    </h2>
                    <small className="text-secondary mt-2 d-block">{t('payoutNote')}</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Milk Records Table Card */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="fw-bold text-dark mb-0">{t('recentCollection')}</h4>
                  <span className="badge bg-light text-dark border rounded-pill px-3">{t('totalEntries')}: {milkRecords.length}</span>
                </div>

                {milkRecords.length === 0 ? (
                  <p className="text-secondary py-3 mb-0 text-center">
                    {t('noMilkRecords')}
                  </p>
                ) : (
                  <div className="farmer-dashboard-table-wrap table-responsive">
                    <table className="table table-hover align-middle mb-0 farmer-dashboard-table">
                      <thead className="table-light small text-muted">
                        <tr>
                          <th>{t('date')}</th>
                          <th>{t('session')}</th>
                          <th>{t('quantity')}</th>
                          <th>{t('fat')}</th>
                          <th>{t('snf')}</th>
                          <th>{t('ratePerL')}</th>
                          <th className="text-end">{t('payment')}</th>
                        </tr>
                      </thead>

                      <tbody className="small">
                        {milkRecords.name ? null : milkRecords.map((record) => {
                          const hour = new Date(record.collectionTime).getHours()
                          const sessionText = hour < 12 ? t('morning') : t('evening')
                          return (
                            <tr key={record._id}>
                              <td className="fw-semibold">{formatDate(record.collectionTime)}</td>
                              <td>
                                <span className={`badge ${hour < 12 ? 'bg-warning-subtle text-warning border border-warning-subtle' : 'bg-primary-subtle text-primary border border-primary-subtle'} rounded-pill`}>
                                  {sessionText}
                                </span>
                              </td>
                              <td className="fw-bold text-dark">{Number(record.quantity).toFixed(1)} L</td>
                              <td>{record.fat}%</td>
                              <td>{record.snf}%</td>
                              <td>₹{Number(record.ratePerLitre || 0).toFixed(2)}</td>
                              <td className="text-end fw-bold text-success">
                                {formatRupees(record.totalPayment)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* UPI Payout Preference Card (YouPI-PG) */}
            <div className="card border-0 shadow-sm rounded-4 bg-white border-start border-success border-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">⚡</span>
                    <h5 className="fw-bold text-dark mb-0">Direct UPI Payout Preference (YouPI-PG)</h5>
                  </div>
                  <span className={`badge ${paymentModeInfo?.paymentMode === 'upi' ? 'bg-success' : 'bg-secondary'} rounded-pill px-3`}>
                    Active Mode: {paymentModeInfo?.paymentMode?.toUpperCase() || 'CASH'}
                  </span>
                </div>
                <p className="text-secondary small mb-3">
                  Receive zero-fee instant milk payments directly into your bank account via your UPI ID (Google Pay, PhonePe, Paytm, BHIM).
                </p>

                {upiMessage && (
                  <div className="alert alert-info py-2 small mb-3">{upiMessage}</div>
                )}

                {paymentModeInfo?.request?.status === 'pending' && (
                  <div className="alert alert-warning py-2 small mb-3">
                    ⏳ <strong>Request Pending:</strong> You requested switch to <strong>{paymentModeInfo.request.mode?.toUpperCase()}</strong> mode. Waiting for Dairy Owner confirmation.
                  </div>
                )}

                <form onSubmit={handleRequestUpi} className="row g-2 align-items-center" style={{ maxWidth: '600px' }}>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Enter your UPI ID (e.g. mobile@paytm or name@okaxis)"
                      value={upiInput}
                      onChange={(e) => setUpiInput(e.target.value)}
                    />
                  </div>
                  <div className="col-sm-4">
                    <button
                      type="submit"
                      className="btn btn-success btn-sm w-100 fw-semibold rounded-pill"
                      disabled={upiSubmitting}
                    >
                      {upiSubmitting ? 'Saving...' : 'Set UPI Payout'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Dispute Section */}
            <div className="card border-0 shadow-sm rounded-4 bg-white border-start border-warning border-4 mb-4 farmer-dashboard-dispute">
              <div className="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <h5 className="fw-bold text-dark mb-1">⚖️ {t('disputeTitle')}</h5>
                  <p className="text-secondary small mb-0">
                    {t('disputeDesc')}
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <Link to="/dispute-history" className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold">
                    {t('disputeHistory')}
                  </Link>
                  <Link to="/raise-dispute" className="btn btn-warning btn-sm rounded-pill px-3 fw-semibold text-dark shadow-sm">
                    {t('raiseDispute')}
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-secondary small mt-4 farmer-dashboard-footer">
          {t('footer')}
        </p>
      </div>
    </div>
  )
}

export default FarmerDashboard
