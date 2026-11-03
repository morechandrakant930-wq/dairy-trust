import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function ManageMilkRates() {
  const [selectedState, setSelectedState] = useState('Maharashtra')
  const [animalType, setAnimalType] = useState('Cow')
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [ratePerLitre, setRatePerLitre] = useState('')
  const [minFat, setMinFat] = useState('')
  const [minSnf, setMinSnf] = useState('')

  const token = localStorage.getItem('dairyToken')
  const headers = { Authorization: `Bearer ${token}` }

  const loadRates = async () => {
    if (!token) return
    try {
      const res = await fetch(`http://localhost:5000/api/rate-charts?state=${selectedState}&animalType=${animalType}`, {
        headers,
      })
      const data = await res.json()
      if (data.success) {
        setRates(data.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadRates()
  }, [selectedState, animalType])

  const handleSaveRate = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/rate-charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          state: selectedState,
          animalType,
          ratePerLitre: Number(ratePerLitre),
          minFat: Number(minFat || 0),
          minSnf: Number(minSnf || 0),
          chartName: `${selectedState} State Rate (${animalType})`
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || 'Rate save zala nahi.')

      setMessage('State rate configuration saved successfully!')
      setRatePerLitre('')
      setMinFat('')
      setMinSnf('')
      loadRates()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid min-vh-100 py-4 px-3 px-md-5" style={{ backgroundColor: '#F8FAFC' }}>
      <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <span className="text-success">📊</span> State Rate Charts & Pricing
          </h2>
          <small className="text-secondary">Manage state-wise government milk rate charts</small>
        </div>
        <Link to="/dairy-dashboard" className="btn btn-outline-secondary btn-sm px-3 rounded-pill fw-semibold">
          Dashboard
        </Link>
      </header>

      {/* State & Animal Selection */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <label className="form-label small fw-semibold text-secondary">Select State (राज्य निवडा)</label>
            <select
              className="form-select rounded-3"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="Maharashtra">Maharashtra (महाराष्ट्र)</option>
              <option value="Gujarat">Gujarat (गुजरात)</option>
              <option value="Karnataka">Karnataka (कर्नाटक)</option>
              <option value="Punjab">Punjab (पंजाब)</option>
              <option value="Haryana">Haryana (हरियाणा)</option>
            </select>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <label className="form-label small fw-semibold text-secondary">Animal Type Filter</label>
            <select
              className="form-select rounded-3"
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value)}
            >
              <option value="Cow">Cow (गाय)</option>
              <option value="Buffalo">Buffalo (म्हैस)</option>
              <option value="Goat">Goat (शेळी)</option>
              <option value="Other">Other (इतर)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3 text-dark">
              Configure Rate for {selectedState} ({animalType})
            </h5>

            {message && (
              <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-danger'} rounded-3 py-2 small mb-3`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSaveRate}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Base Rate / Litre (₹)</label>
                <input
                  type="number"
                  className="form-control rounded-3"
                  placeholder="e.g. 35.00"
                  step="0.01"
                  value={ratePerLitre}
                  onChange={(e) => setRatePerLitre(e.target.value)}
                  required
                />
              </div>

              <div className="row g-2 mb-4">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Min FAT (%)</label>
                  <input
                    type="number"
                    className="form-control rounded-3"
                    placeholder="e.g. 3.5"
                    step="0.1"
                    value={minFat}
                    onChange={(e) => setMinFat(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Min SNF (%)</label>
                  <input
                    type="number"
                    className="form-control rounded-3"
                    placeholder="e.g. 8.5"
                    step="0.1"
                    value={minSnf}
                    onChange={(e) => setMinSnf(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-success w-100 rounded-3 py-2 fw-semibold" disabled={loading}>
                {loading ? 'Saving...' : 'Save State Rate Configuration'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 className="fw-bold mb-3 text-dark">
              Active Rates for {selectedState} ({animalType})
            </h5>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Chart Name</th>
                    <th>Rate / Litre</th>
                    <th>Min FAT</th>
                    <th>Min SNF</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {rates.map((rate) => (
                    <tr key={rate._id}>
                      <td className="fw-bold text-dark">{rate.chartName || `${rate.state} Rate`}</td>
                      <td className="fw-bold text-success fs-6">₹{Number(rate.ratePerLitre || 0).toFixed(2)}</td>
                      <td>{rate.minFat ? `${rate.minFat}%` : '-'}</td>
                      <td>{rate.minSnf ? `${rate.minSnf}%` : '-'}</td>
                      <td><span className="badge bg-success">Active</span></td>
                    </tr>
                  ))}
                  {rates.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">Konta hi active rate configure kelela nahi.</td>
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

export default ManageMilkRates