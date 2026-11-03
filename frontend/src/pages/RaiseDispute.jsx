
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../language/LanguageContext'

function RaiseDispute() {
  const { t } = useLanguage()

  const [issueType, setIssueType] = useState('Quantity mismatch')
  const [collectionDate, setCollectionDate] = useState('')
  const [session, setSession] = useState('Morning')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setSubmitted(false)

    if (!collectionDate || !description.trim()) {
      setMessage('Please enter the collection date and issue details.')
      return
    }

    const token = localStorage.getItem('farmerToken')

    if (!token) {
      setMessage('Please login as a farmer before submitting a dispute.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          issueType,
          collectionDate,
          session,
          description: description.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to submit dispute.')
      }

      setMessage('Your dispute has been submitted successfully!')
      setSubmitted(true)
      setDescription('')
    } catch (error) {
      setMessage(error.message || 'Unable to submit the dispute. Please try again.')
      setSubmitted(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <Link
            to="/farmer-dashboard"
            className="text-success text-decoration-none"
          >
            ← {t('dashboardOverview')}
          </Link>

          <div className="card border-0 shadow-sm rounded-4 mt-3">
            <div className="card-body p-4 p-md-5">
              <h2 className="fw-bold text-success">{t('raiseDispute')}</h2>

              <p className="text-secondary">
                Report an issue with your milk collection record.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="issueType">
                    {t('disputeReason')}
                  </label>

                  <select
                    id="issueType"
                    className="form-select"
                    value={issueType}
                    onChange={(event) => setIssueType(event.target.value)}
                  >
                    <option value="Quantity mismatch">Quantity mismatch</option>
                    <option value="Fat / SNF mismatch">Fat / SNF mismatch</option>
                    <option value="Incorrect milk rate">Incorrect milk rate</option>
                    <option value="Payment mismatch">Payment mismatch</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="collectionDate">
                      {t('fromDate')}
                    </label>

                    <input
                      id="collectionDate"
                      type="date"
                      className="form-control"
                      value={collectionDate}
                      onChange={(event) =>
                        setCollectionDate(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="session">
                      {t('session')}
                    </label>

                    <select
                      id="session"
                      className="form-select"
                      value={session}
                      onChange={(event) => setSession(event.target.value)}
                    >
                      <option value="Morning">{t('morning')}</option>
                      <option value="Evening">{t('evening')}</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="description">
                    {t('notesOptional')}
                  </label>

                  <textarea
                    id="description"
                    className="form-control"
                    rows="4"
                    placeholder="Explain what is incorrect in your milk record or payment..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-success w-100"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : t('raiseDispute')}
                </button>
              </form>

              {message && (
                <div
                  className={`alert ${submitted ? 'alert-success' : 'alert-warning'} mt-3 mb-0`}
                  role="status"
                >
                  {message}
                </div>
              )}

              {submitted && (
                <div className="mt-3">
                  <h5 className="fw-bold">Dispute Summary</h5>

                  <p className="mb-1">
                    <strong>Issue:</strong> {issueType}
                  </p>

                  <p className="mb-1">
                    <strong>Date:</strong> {collectionDate}
                  </p>

                  <p className="mb-1">
                    <strong>{t('session')}:</strong> {session}
                  </p>

                  <p className="mb-1">
                    <strong>{t('status')}:</strong> Pending
                  </p>

                  <p className="mb-0">
                    Your dispute has been sent to your Dairy Owner.
                  </p>
                </div>
              )}

              <p className="small text-secondary mt-4 mb-0">
                Your dispute is securely submitted to the Dairy Trust database.
                You can check its status in Dispute History.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RaiseDispute
