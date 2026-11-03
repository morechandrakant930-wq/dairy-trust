import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function FarmerRegistration() {
  const [form, setForm] = useState({
    farmerId: '',
    name: '',
    mobileNumber: '',
    village: '',
    temporaryPassword: '',
    animalType: 'Cow',
  })

  const [farmers, setFarmers] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const token = localStorage.getItem('dairyToken')

  const loadFarmers = () => {
    if (!token) return
    fetch('http://localhost:5000/api/farmers', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFarmers(data.data || [])
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    loadFarmers()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/farmers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })

      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || 'Nondani fail zali.')

      setMessage('Shetkari safalpane nondavla gela!')
      setForm({
        farmerId: '',
        name: '',
        mobileNumber: '',
        village: '',
        temporaryPassword: '',
        animalType: 'Cow',
      })
      loadFarmers()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid min-vh-100 py-4 px-3 px-md-5" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <span className="text-warning">👨‍🌾</span> Farmer Registration & Directory
          </h2>
          <small className="text-secondary">Register farmers and manage KYC profiles</small>
        </div>
        <Link to="/dairy-dashboard" className="btn btn-outline-secondary btn-sm px-3 rounded-pill fw-semibold">
          Dashboard
        </Link>
      </header>

      <div className="row g-4">
        {/* Left: Registration Form */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3 text-dark">Register New Farmer</h5>

            {message && (
              <div className={`alert ${message.includes('safal') ? 'alert-success' : 'alert-danger'} rounded-3 py-2 small mb-3`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Farmer ID / Code</label>
                <input
                  type="text"
                  name="farmerId"
                  className="form-control rounded-3"
                  placeholder="e.g. 003"
                  value={form.farmerId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Full Name (Purna Naav)</label>
                <input
                  type="text"
                  name="name"
                  className="form-control rounded-3"
                  placeholder="e.g. Ramesh Patil"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Mobile Number</label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    className="form-control rounded-3"
                    placeholder="10-digit number"
                    value={form.mobileNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Village (Gaav)</label>
                  <input
                    type="text"
                    name="village"
                    className="form-control rounded-3"
                    placeholder="e.g. Vita"
                    value={form.village}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Temporary Password</label>
                <div className="input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="temporaryPassword"
                    className="form-control rounded-start-3"
                    placeholder="Set temporary password"
                    value={form.temporaryPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-end-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-secondary">Animal Type</label>
                <select
                  name="animalType"
                  className="form-select rounded-3"
                  value={form.animalType}
                  onChange={handleChange}
                >
                  <option value="Cow">Cow (गाय)</option>
                  <option value="Buffalo">Buffalo (म्हैस)</option>
                  <option value="Goat">Goat (शेळी)</option>
                  <option value="Other">Other (इतर)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-success w-100 rounded-3 py-2 fw-semibold" disabled={loading}>
                {loading ? 'Nondani chalu ahe...' : 'Register Farmer'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Farmer Directory Table */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold mb-0 text-dark">Registered Farmers</h5>
                <small className="text-muted">Total: {farmers.length} farmers</small>
              </div>
              <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={loadFarmers}>
                Refresh
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Village</th>
                    <th>Animal</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {farmers.map((farmer) => (
                    <tr key={farmer.farmerId}>
                      <td className="fw-bold text-success">{farmer.farmerId}</td>
                      <td className="fw-semibold text-dark">{farmer.name}</td>
                      <td>{farmer.mobileNumber || '-'}</td>
                      <td><span className="badge bg-light text-secondary border">{farmer.village || '-'}</span></td>
                      <td>{farmer.animalType || 'Cow'}</td>
                    </tr>
                  ))}
                  {farmers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">Eka hi shetkarayachi nond nahi.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FarmerRegistration