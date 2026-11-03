
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../language/LanguageContext'

function DisputeHistory() {
  const { t } = useLanguage()

  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchDisputes()
  }, [])

  async function fetchDisputes() {
    const token = localStorage.getItem('farmerToken')

    if (!token) {
      setMessage('Please login as a farmer to view your disputes.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        'http://localhost:5000/api/disputes/farmer',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load disputes.')
      }

      setDisputes(data.disputes || [])
    } catch (error) {
      setMessage(error.message || 'Unable to load dispute history.')
    } finally {
      setLoading(false)
    }
  }

  function getStatusClass(status) {
    switch (status) {
      case 'Resolved':
        return 'text-bg-success'
      case 'Rejected':
        return 'text-bg-danger'
      case 'Under Review':
        return 'text-bg-info'
      default:
        return 'text-bg-warning'
    }
  }

  function formatDate(date) {
    if (!date) return '-'

    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="container py-5">
      <Link
        to="/farmer-dashboard"
        className="text-success text-decoration-none"
      >
        ← {t('dashboardOverview')}
      </Link>

      <div className="mt-3 mb-4">
        <h2 className="fw-bold text-success">{t('disputeHistory')}</h2>

        <p className="text-secondary">
          View your submitted disputes, Owner replies and resolution details.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status" />
          <p className="text-secondary mt-2">Loading dispute history...</p>
        </div>
      ) : message ? (
        <div className="alert alert-warning" role="alert">
          {message}
        </div>
      ) : disputes.length === 0 ? (
        <div className="card border-0 shadow-sm p-4">
          <h5>No disputes found</h5>

          <p className="text-secondary mb-3">
            You have not submitted any disputes yet.
          </p>

          <Link to="/raise-dispute" className="btn btn-success">
            {t('raiseDispute')}
          </Link>
        </div>
      ) : (
        <div className="row g-3">
          {disputes.map((dispute) => (
            <div className="col-12 col-lg-6" key={dispute._id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <h5 className="fw-bold">{dispute.issueType}</h5>

                    <span className={`badge ${getStatusClass(dispute.status)}`}>
                      {dispute.status || 'Pending'}
                    </span>
                  </div>

                  <hr />

                  <p className="mb-2">
                    <strong>{t('date')}:</strong>{' '}
                    {formatDate(dispute.collectionDate)}
                  </p>

                  <p className="mb-2">
                    <strong>{t('session')}:</strong> {dispute.session}
                  </p>

                  <p className="mb-3">
                    <strong>Details:</strong> {dispute.description}
                  </p>

                  <div className="bg-light rounded-3 p-3">
                    <h6 className="fw-bold text-success">
                      Dairy Owner Reply
                    </h6>

                    <p className="mb-0 text-secondary">
                      {dispute.ownerReply || 'No reply from Dairy Owner yet.'}
                    </p>
                  </div>

                  {dispute.resolution && (
                    <div className="bg-light rounded-3 p-3 mt-3">
                      <h6 className="fw-bold text-success">
                        Resolution
                      </h6>

                      <p className="mb-0 text-secondary">
                        {dispute.resolution}
                      </p>
                    </div>
                  )}

                  <p className="small text-secondary mt-3 mb-0">
                    Submitted: {formatDate(dispute.createdAt)}
                  </p>

                  {dispute.reviewedAt && (
                    <p className="small text-secondary mt-1 mb-0">
                      Last reviewed: {formatDate(dispute.reviewedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Link to="/raise-dispute" className="btn btn-success">
          {t('raiseDispute')}
        </Link>
      </div>
    </div>
  )
}

export default DisputeHistory
