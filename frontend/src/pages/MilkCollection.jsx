import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../language/LanguageContext'
import milkCollectionBg from '../assets/milk-collection-bg.png'
import './MilkCollection.css'

function interpolateRate(chart, fat, snf) {
  const fats = [...chart.fatValues].map(Number).sort((a, b) => a - b);
  const snfs = [...chart.snfValues].map(Number).sort((a, b) => a - b);

  if (
    !fats.length ||
    !snfs.length ||
    fat < fats[0] ||
    fat > fats[fats.length - 1] ||
    snf < snfs[0] ||
    snf > snfs[snfs.length - 1]
  ) {
    return null;
  }

  function getBounds(values, value) {
    const exact = values.find(v => Math.abs(v - value) < 0.000001);
    if (exact !== undefined) return [exact, exact];

    for (let i = 0; i < values.length - 1; i++) {
      if (value > values[i] && value < values[i + 1]) {
        return [values[i], values[i + 1]];
      }
    }
    return null;
  }

  const fatBounds = getBounds(fats, fat);
  const snfBounds = getBounds(snfs, snf);

  if (!fatBounds || !snfBounds) return null;

  const getRate = (f, s) => {
    const row = chart.rateMatrix?.[String(f)];
    const value = row?.[String(s)];
    return value !== undefined && value !== '' &&
      Number.isFinite(Number(value)) && Number(value) > 0
      ? Number(value)
      : null;
  };

  const [f1, f2] = fatBounds;
  const [s1, s2] = snfBounds;

  const r11 = getRate(f1, s1);
  const r12 = getRate(f1, s2);
  const r21 = getRate(f2, s1);
  const r22 = getRate(f2, s2);

  if ([r11, r12, r21, r22].some(v => v === null)) return null;

  if (f1 === f2 && s1 === s2) return r11;

  if (f1 === f2) {
    return r11 + ((snf - s1) / (s2 - s1)) * (r12 - r11);
  }

  if (s1 === s2) {
    return r11 + ((fat - f1) / (f2 - f1)) * (r21 - r11);
  }

  const t = (fat - f1) / (f2 - f1);
  const u = (snf - s1) / (s2 - s1);

  return (
    r11 * (1 - t) * (1 - u) +
    r21 * t * (1 - u) +
    r12 * (1 - t) * u +
    r22 * t * u
  );
}

function MilkCollection() {
  const { t } = useLanguage()
  const getNowDateTime = () => {
    const now = new Date()
    const tzOffset = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
  }

  const [form, setForm] = useState({
    farmerId: '',
    animalType: 'Cow',
    quantity: '',
    fat: '',
    snf: '',
    collectionTime: getNowDateTime(),
  })

  const [farmers, setFarmers] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [activeChart, setActiveChart] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError, setChartError] = useState('')

  const token = localStorage.getItem('dairyToken')

  useEffect(() => {
    if (!token) {
      setChartError('Please login as Dairy Owner.')
      setChartLoading(false)
      return
    }

    async function loadFarmers() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/farmers',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load farmers.')
        }

        setFarmers(result.data || [])
      } catch (error) {
        setMessage(error.message)
      }
    }

    loadFarmers()
  }, [token])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    async function loadChart() {
      setChartLoading(true)
      setChartError('')
      setActiveChart(null)

      try {
        const response = await fetch(
          `http://localhost:5000/api/rate-charts?animalType=${encodeURIComponent(form.animalType)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load rate chart.')
        }

        const charts = result.data || []
        const chart = charts.find(
          (item) =>
            item.animalType === form.animalType &&
            item.isActive === true &&
            item.chartType === 'manual'
        ) || charts[0]

        if (!chart) {
          throw new Error(
            `No active manual rate chart found for ${form.animalType}. Please configure it from Dashboard -> Manual FAT/SNF Rate.`
          )
        }

        if (!cancelled) {
          setActiveChart(chart)
          setChartError('')
        }
      } catch (error) {
        if (!cancelled) {
          setActiveChart(null)
          setChartError(error.message)
        }
      } finally {
        if (!cancelled) {
          setChartLoading(false)
        }
      }
    }

    loadChart()

    return () => {
      cancelled = true
    }
  }, [form.animalType, token])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setMessage('')
  }

  const ratePreview = useMemo(() => {
    if (!activeChart || form.fat === '' || form.snf === '') {
      return null
    }

    const fat = Number(form.fat)
    const snf = Number(form.snf)

    if (!Number.isFinite(fat) || !Number.isFinite(snf)) {
      return { error: 'Enter valid FAT and SNF values.' }
    }

    const rateValue = interpolateRate(activeChart, fat, snf)

    if (
      rateValue === null ||
      !Number.isFinite(rateValue) ||
      rateValue <= 0
    ) {
      return {
        error: `Rate chart coverage not available for FAT ${fat} and SNF ${snf}. Please add surrounding FAT/SNF values and rates in your chart.`,
      }
    }

    const rate = Number(rateValue.toFixed(2))
    const quantity = Number(form.quantity)
    const payment =
      Number.isFinite(quantity) && quantity > 0
        ? Math.round(quantity * rate * 100) / 100
        : null

    return {
      rate,
      payment,
    }
  }, [activeChart, form.fat, form.snf, form.quantity])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!token) {
      setMessage('Please login as Dairy Owner.')
      return
    }

    if (!activeChart) {
      setMessage('Please configure an active manual rate chart first.')
      return
    }

    if (!ratePreview || ratePreview.error) {
      setMessage(ratePreview?.error || 'Please enter valid FAT and SNF values.')
      return
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      setMessage('Please enter a valid milk quantity.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:5000/api/milk-collections',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            farmerId: form.farmerId,
            animalType: form.animalType,
            quantity: Number(form.quantity),
            fat: Number(form.fat),
            snf: Number(form.snf),
            collectionTime: form.collectionTime,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save collection.')
      }

      const savedPayment =
        result.data?.totalPayment ??
        result.totalPayment ??
        ratePreview.payment

      setMessage(
        `Milk collection saved successfully! Total Payment: ₹${Number(savedPayment).toFixed(2)}`
      )

      setForm({
        farmerId: '',
        animalType: form.animalType,
        quantity: '',
        fat: '',
        snf: '',
        collectionTime: getNowDateTime(),
      })
    } catch (error) {
      setMessage(error.message || 'Could not connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="milk-collection-page container-fluid min-vh-100 py-5"
      style={{
        backgroundImage: `linear-gradient(rgba(246, 250, 247, 0.45), rgba(246, 250, 247, 0.55)), url(${milkCollectionBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="container" style={{ maxWidth: '780px' }}>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-3">🥛</span>
            <div>
              <h4 className="fw-bold text-success mb-0">Dairy Trust</h4>
              <small className="text-muted">Smart Collection Entry</small>
            </div>
          </div>

          <Link
            to="/dairy-dashboard"
            className="btn btn-outline-secondary btn-sm px-3 rounded-pill fw-semibold"
          >
            {t('dashboardOverview')}
          </Link>
        </div>

        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-success text-white py-3 px-4">
            <h5 className="fw-bold mb-1">{t('milkCollectionTitle')}</h5>
            <small className="text-white-50">
              FAT/SNF based manual milk rate calculation
            </small>
          </div>

          <div className="card-body p-4 p-md-5 bg-white">

            {message && (
              <div
                className={`alert ${
                  message.includes('successfully')
                    ? 'alert-success'
                    : 'alert-danger'
                } rounded-3 py-2 px-3 small mb-4`}
                role="alert"
              >
                {message}
              </div>
            )}

            <div className="mb-4">
              {chartLoading ? (
                <div className="alert alert-info small">
                  Loading manual rate chart...
                </div>
              ) : chartError ? (
                <div className="alert alert-warning small">
                  {chartError}
                </div>
              ) : (
                <div className="alert alert-success small">
                  <strong>Active Rate Chart:</strong>{' '}
                  {activeChart?.chartName}
                  <br />
                  <strong>Animal Type:</strong>{' '}
                  {activeChart?.animalType}
                  <br />
                  <strong>Rate System:</strong> Manual FAT/SNF
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">
                    {t('searchFarmer')}
                  </label>

                  {farmers.length > 0 ? (
                    <select
                      className="form-select rounded-3 py-2"
                      name="farmerId"
                      value={form.farmerId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- {t('selectFarmer')} --</option>

                      {farmers.map((farmer) => (
                        <option
                          key={farmer.farmerId}
                          value={farmer.farmerId}
                        >
                          {farmer.name} ({farmer.farmerId})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-control rounded-3 py-2"
                      name="farmerId"
                      value={form.farmerId}
                      onChange={handleChange}
                      placeholder={t('searchPlaceholder')}
                      required
                    />
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">
                    {t('animalType')}
                  </label>

                  <select
                    className="form-select rounded-3 py-2"
                    name="animalType"
                    value={form.animalType}
                    onChange={handleChange}
                    required
                  >
                    <option value="Cow">Cow (गाय)</option>
                    <option value="Buffalo">Buffalo (म्हैस)</option>
                    <option value="Goat">Goat (शेळी)</option>
                    <option value="Other">Other (इतर)</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">
                    {t('litres')}
                  </label>

                  <input
                    className="form-control rounded-3 py-2"
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 10.5"
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">
                    {t('fatPercentage')}
                  </label>

                  <input
                    className="form-control rounded-3 py-2"
                    type="number"
                    name="fat"
                    value={form.fat}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 4.0"
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">
                    {t('snfPercentage')}
                  </label>

                  <input
                    className="form-control rounded-3 py-2"
                    type="number"
                    name="snf"
                    value={form.snf}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 8.5"
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">
                    {t('fromDate')} &amp; Time
                  </label>

                  <input
                    className="form-control rounded-3 py-2"
                    type="datetime-local"
                    name="collectionTime"
                    value={form.collectionTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="card border-success rounded-4 mt-4">
                <div className="card-body">
                  <h6 className="fw-bold text-success mb-3">
                    FAT / SNF Rate Preview
                  </h6>

                  {!activeChart ? (
                    <p className="text-muted small mb-0">
                      Set an active manual rate chart for {form.animalType}.
                    </p>
                  ) : !form.fat || !form.snf ? (
                    <p className="text-muted small mb-0">
                      Enter FAT and SNF to calculate milk rate.
                    </p>
                  ) : ratePreview?.error ? (
                    <p className="text-danger small mb-0">
                      {ratePreview.error}
                    </p>
                  ) : ratePreview ? (
                    <>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">{t('ratePerLitre')}</span>
                        <strong>₹{ratePreview.rate.toFixed(2)}</strong>
                      </div>

                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">{t('litres')}</span>
                        <strong>{form.quantity || '—'} L</strong>
                      </div>

                      <hr />

                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">{t('totalAmount')}</span>
                        <span className="fs-4 fw-bold text-success">
                          {ratePreview.payment !== null
                            ? `₹${ratePreview.payment.toFixed(2)}`
                            : '—'}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <button
                className="btn btn-success w-100 rounded-3 py-2 mt-4 fw-semibold shadow-sm"
                type="submit"
                disabled={
                  loading ||
                  chartLoading ||
                  !activeChart ||
                  Boolean(ratePreview?.error)
                }
              >
                {loading ? t('saving') : t('saveCollection')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MilkCollection