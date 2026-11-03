
import { useEffect, useState } from 'react'

function DisputeManagement() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('All')

  const [selectedDispute, setSelectedDispute] = useState(null)
  const [ownerReply, setOwnerReply] = useState('')
  const [resolution, setResolution] = useState('')
  const [status, setStatus] = useState('Under Review')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadDisputes()
  }, [])

  async function loadDisputes() {
    const token = localStorage.getItem('dairyToken')

    if (!token) {
      setMessage('Dairy Owner login token not found. Please login again.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setMessage('')

      const response = await fetch(
        'http://localhost:5000/api/disputes/owner',
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
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  function openDispute(dispute) {
    setSelectedDispute(dispute)
    setOwnerReply(dispute.ownerReply || '')
    setResolution(dispute.resolution || '')
    setStatus(
      dispute.status === 'Pending' ? 'Under Review' : dispute.status
    )
    setMessage('')
  }

  async function handleUpdate(event) {
    event.preventDefault()

    if (!selectedDispute) return

    if (status === 'Resolved' && !resolution.trim()) {
      setMessage('Please enter resolution details before resolving.')
      return
    }

    const token = localStorage.getItem('dairyToken')

    if (!token) {
      setMessage('Please login again.')
      return
    }

    try {
      setSaving(true)
      setMessage('')

      const response = await fetch(
        `http://localhost:5000/api/disputes/${selectedDispute._id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            ownerReply,
            resolution,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update dispute.')
      }

      setDisputes((previous) =>
        previous.map((item) =>
          item._id === data.dispute._id ? data.dispute : item
        )
      )

      setSelectedDispute(data.dispute)
      setMessage('Dispute updated successfully!')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  function getStatusClass(value) {
    switch (value) {
      case 'Resolved':
        return 'bg-success'
      case 'Rejected':
        return 'bg-danger'
      case 'Under Review':
        return 'bg-info text-dark'
      default:
        return 'bg-warning text-dark'
    }
  }

  function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-IN')
  }

  const filteredDisputes = disputes.filter((dispute) => {
    return filter === 'All' || dispute.status === filter
  })

  const counts = {
    All: disputes.length,
    Pending: disputes.filter((d) => d.status === 'Pending').length,
    'Under Review': disputes.filter((d) => d.status === 'Under Review').length,
    Resolved: disputes.filter((d) => d.status === 'Resolved').length,
    Rejected: disputes.filter((d) => d.status === 'Rejected').length,
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h5 className="fw-bold text-dark mb-1">⚖️ Dispute Management</h5>
          <p className="text-secondary small mb-0">
            Review farmer complaints and provide resolutions.
          </p>
        </div>

        <button
          className="btn btn-outline-success btn-sm rounded-pill px-3"
          onClick={loadDisputes}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {message && !selectedDispute && (
        <div className="alert alert-warning py-2">{message}</div>
      )}

      <div className="row g-3 mb-4">
        {[
          { title: 'Total Disputes', value: counts.All, color: 'dark' },
          { title: 'Pending', value: counts.Pending, color: 'warning' },
          { title: 'Under Review', value: counts['Under Review'], color: 'info' },
          { title: 'Resolved', value: counts.Resolved, color: 'success' },
          { title: 'Rejected', value: counts.Rejected, color: 'danger' },
        ].map((item) => (
          <div className="col-6 col-md-4 col-xl" key={item.title}>
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-3">
                <small className="text-secondary">{item.title}</small>
                <h3 className={`fw-bold mb-0 text-${item.color}`}>
                  {item.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h6 className="fw-bold mb-0">Farmer Complaints</h6>

          <select
            className="form-select form-select-sm"
            style={{ maxWidth: '190px' }}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="All">All Disputes</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-success" role="status" />
            <p className="text-secondary mt-2">Loading disputes...</p>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="text-center py-5">
            <div className="fs-1">📭</div>
            <h6 className="fw-bold mt-2">No disputes found</h6>
            <p className="text-secondary small mb-0">
              There are no disputes in this category.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Farmer</th>
                  <th>Issue</th>
                  <th>Collection Date</th>
                  <th>Session</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredDisputes.map((dispute) => (
                  <tr key={dispute._id}>
                    <td>
                      <div className="fw-semibold">{dispute.farmerName}</div>
                      <small className="text-secondary">
                        ID: {dispute.farmerId}
                      </small>
                    </td>

                    <td>{dispute.issueType}</td>

                    <td>{formatDate(dispute.collectionDate)}</td>

                    <td>{dispute.session}</td>

                    <td>
                      <span className={`badge ${getStatusClass(dispute.status)}`}>
                        {dispute.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-outline-success rounded-pill px-3"
                        onClick={() => openDispute(dispute)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedDispute && (
        <div
          className="card border-0 shadow-sm rounded-4 mt-4"
          id="dispute-review"
        >
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="fw-bold mb-0">Review Farmer Dispute</h5>

              <button
                className="btn btn-outline-secondary btn-sm rounded-pill"
                onClick={() => {
                  setSelectedDispute(null)
                  setMessage('')
                }}
              >
                ✕ Close
              </button>
            </div>

            <div className="bg-light rounded-4 p-3 mb-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <small className="text-secondary">Farmer Name</small>
                  <div className="fw-bold">{selectedDispute.farmerName}</div>
                </div>

                <div className="col-md-6">
                  <small className="text-secondary">Farmer ID</small>
                  <div className="fw-bold">{selectedDispute.farmerId}</div>
                </div>

                <div className="col-md-6">
                  <small className="text-secondary">Issue Type</small>
                  <div className="fw-bold">{selectedDispute.issueType}</div>
                </div>

                <div className="col-md-6">
                  <small className="text-secondary">Collection Date</small>
                  <div className="fw-bold">
                    {formatDate(selectedDispute.collectionDate)}
                  </div>
                </div>

                <div className="col-md-6">
                  <small className="text-secondary">Session</small>
                  <div className="fw-bold">{selectedDispute.session}</div>
                </div>

                <div className="col-md-6">
                  <small className="text-secondary">Current Status</small>
                  <div>
                    <span className={`badge ${getStatusClass(selectedDispute.status)}`}>
                      {selectedDispute.status}
                    </span>
                  </div>
                </div>
              </div>

              <hr />

              <small className="text-secondary">Farmer's Complaint</small>
              <p className="mb-0 mt-1">{selectedDispute.description}</p>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Owner Reply
                </label>

                <textarea
                  className="form-control rounded-3"
                  rows="3"
                  placeholder="Write your reply to the farmer..."
                  value={ownerReply}
                  onChange={(event) => setOwnerReply(event.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Resolution Details
                </label>

                <textarea
                  className="form-control rounded-3"
                  rows="3"
                  placeholder="Explain how the issue was resolved..."
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Update Status
                </label>

                <select
                  className="form-select rounded-3"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {message && (
                <div className="alert alert-info py-2" role="status">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-success px-4 rounded-pill"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Reply & Update Status'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DisputeManagement
