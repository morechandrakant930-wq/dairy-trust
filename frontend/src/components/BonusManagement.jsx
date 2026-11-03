import { useEffect, useState } from 'react'

const API = 'http://localhost:5000/api/bonus-management'

function BonusManagement({ farmers = [] }) {
  const [rates, setRates] = useState([])
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [manual, setManual] = useState({
    farmerId: '',
    amount: '',
    reason: '',
    bonusDate: new Date().toISOString().slice(0, 10),
  })

  const [rateForm, setRateForm] = useState({
    animalType: 'Cow',
    fat: '',
    snf: '',
    bonusPerLitre: '',
  })

  const [calc, setCalc] = useState({
    farmerId: '',
    startDate: '',
    endDate: '',
  })
  const [calculation, setCalculation] = useState(null)

  const token = () => localStorage.getItem('dairyToken')

  const request = async (url, options = {}) => {
    const res = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token()}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Request failed')
    return data
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [rateData, historyData] = await Promise.all([
        request('/rates'),
        request('/history'),
      ])
      setRates(rateData.rates || [])
      setHistory(historyData.bonuses || [])
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const addManualBonus = async (e) => {
    e.preventDefault()
    try {
      setMessage('')
      await request('/manual', {
        method: 'POST',
        body: JSON.stringify({
          ...manual,
          amount: Number(manual.amount),
        }),
      })
      setMessage('Manual bonus added successfully.')
      setManual({
        farmerId: '',
        amount: '',
        reason: '',
        bonusDate: new Date().toISOString().slice(0, 10),
      })
      loadData()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const saveRate = async (e) => {
    e.preventDefault()
    try {
      setMessage('')
      await request('/rates', {
        method: 'POST',
        body: JSON.stringify({
          ...rateForm,
          fat: Number(rateForm.fat),
          snf: Number(rateForm.snf),
          bonusPerLitre: Number(rateForm.bonusPerLitre),
        }),
      })
      setMessage('Quality bonus rate saved successfully.')
      setRateForm({
        animalType: 'Cow',
        fat: '',
        snf: '',
        bonusPerLitre: '',
      })
      loadData()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const deactivateRate = async (id) => {
    if (!window.confirm('Deactivate this bonus rate?')) return
    try {
      await request(`/rates/${id}/deactivate`, { method: 'PATCH' })
      setMessage('Bonus rate deactivated.')
      loadData()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const calculateBonus = async (e) => {
    e.preventDefault()
    try {
      setMessage('')
      const params = new URLSearchParams(calc)
      const data = await request(`/calculate?${params.toString()}`)
      setCalculation(data)
    } catch (err) {
      setCalculation(null)
      setMessage(err.message)
    }
  }

  const money = (value) =>
    `₹${(Number(value) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
      <h5 className="fw-bold mb-3">🎁 Bonus Management</h5>

      {message && (
        <div className="alert alert-info py-2 small">{message}</div>
      )}
      {loading && <p className="text-muted small">Loading bonus data...</p>}

      <div className="row g-4">
        <div className="col-lg-6">
          <form onSubmit={addManualBonus} className="border rounded-4 p-3 h-100">
            <h6 className="fw-bold mb-3">Add Manual Bonus</h6>

            <label className="form-label small">Select Farmer</label>
            <select
              className="form-select mb-2"
              value={manual.farmerId}
              onChange={(e) => setManual({ ...manual, farmerId: e.target.value })}
              required
            >
              <option value="">Select Farmer</option>
              {farmers.map((f) => (
                <option key={f.farmerId} value={f.farmerId}>
                  {f.name} ({f.farmerId})
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0.01"
              step="0.01"
              className="form-control mb-2"
              placeholder="Bonus Amount ₹"
              value={manual.amount}
              onChange={(e) => setManual({ ...manual, amount: e.target.value })}
              required
            />

            <input
              className="form-control mb-2"
              placeholder="Reason"
              value={manual.reason}
              onChange={(e) => setManual({ ...manual, reason: e.target.value })}
            />

            <input
              type="date"
              className="form-control mb-3"
              value={manual.bonusDate}
              onChange={(e) => setManual({ ...manual, bonusDate: e.target.value })}
              required
            />

            <button className="btn btn-success w-100">Add Manual Bonus</button>
          </form>
        </div>

        <div className="col-lg-6">
          <form onSubmit={saveRate} className="border rounded-4 p-3 h-100">
            <h6 className="fw-bold mb-3">FAT/SNF Quality Bonus Rate</h6>

            <label className="form-label small">Animal Type</label>
            <select
              className="form-select mb-2"
              value={rateForm.animalType}
              onChange={(e) => setRateForm({ ...rateForm, animalType: e.target.value })}
            >
              {['Cow', 'Buffalo', 'Goat', 'Other'].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>

            <div className="row g-2">
              <div className="col-6">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="form-control"
                  placeholder="FAT"
                  value={rateForm.fat}
                  onChange={(e) => setRateForm({ ...rateForm, fat: e.target.value })}
                  required
                />
              </div>
              <div className="col-6">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="form-control"
                  placeholder="SNF"
                  value={rateForm.snf}
                  onChange={(e) => setRateForm({ ...rateForm, snf: e.target.value })}
                  required
                />
              </div>
            </div>

            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control my-2"
              placeholder="Bonus per Litre ₹"
              value={rateForm.bonusPerLitre}
              onChange={(e) => setRateForm({ ...rateForm, bonusPerLitre: e.target.value })}
              required
            />

            <button className="btn btn-primary w-100">Save Quality Rate</button>
          </form>
        </div>
      </div>

      <hr className="my-4" />

      <h6 className="fw-bold">Quality Bonus Rates</h6>
      <div className="table-responsive mb-4">
        <table className="table table-sm table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Animal</th><th>FAT</th><th>SNF</th>
              <th>Bonus/Litre</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r._id}>
                <td>{r.animalType}</td>
                <td>{r.fat}</td>
                <td>{r.snf}</td>
                <td>{money(r.bonusPerLitre)}</td>
                <td>
                  <span className={`badge ${r.isActive ? 'bg-success' : 'bg-secondary'}`}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {r.isActive && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deactivateRate(r._id)}
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr><td colSpan="6" className="text-center text-muted">No rates found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <hr />

      <h6 className="fw-bold">Calculate Farmer Bonus</h6>
      <form onSubmit={calculateBonus} className="row g-2 mb-3">
        <div className="col-md-4">
          <select
            className="form-select"
            value={calc.farmerId}
            onChange={(e) => setCalc({ ...calc, farmerId: e.target.value })}
            required
          >
            <option value="">Select Farmer</option>
            {farmers.map((f) => (
              <option key={f.farmerId} value={f.farmerId}>
                {f.name} ({f.farmerId})
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <input
            type="date"
            className="form-control"
            value={calc.startDate}
            onChange={(e) => setCalc({ ...calc, startDate: e.target.value })}
            required
          />
        </div>
        <div className="col-md-3">
          <input
            type="date"
            className="form-control"
            value={calc.endDate}
            onChange={(e) => setCalc({ ...calc, endDate: e.target.value })}
            required
          />
        </div>
        <div className="col-md-2">
          <button className="btn btn-dark w-100">Calculate</button>
        </div>
      </form>

      {calculation && (
        <div className="row g-3 mb-4">
          {[
            ['Milk Payment', calculation.milkPayment],
            ['Quality Bonus', calculation.qualityBonus],
            ['Manual Bonus', calculation.manualBonus],
            ['Gross Payment', calculation.grossPayment],
          ].map(([label, value]) => (
            <div className="col-6 col-lg-3" key={label}>
              <div className="border rounded-3 p-3">
                <small className="text-muted">{label}</small>
                <h5 className="fw-bold mb-0">{money(value)}</h5>
              </div>
            </div>
          ))}
        </div>
      )}

      <h6 className="fw-bold mt-3">Bonus History</h6>
      <div className="table-responsive">
        <table className="table table-sm table-hover">
          <thead className="table-light">
            <tr><th>Date</th><th>Farmer ID</th><th>Type</th><th>Reason</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {history.map((b) => (
              <tr key={b._id}>
                <td>{b.bonusDate ? new Date(b.bonusDate).toLocaleDateString('en-IN') : '-'}</td>
                <td>{b.farmerId}</td>
                <td>{b.bonusType}</td>
                <td>{b.reason || '-'}</td>
                <td>{money(b.amount)}</td>
                <td>{b.status}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan="6" className="text-center text-muted">No bonus history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default BonusManagement