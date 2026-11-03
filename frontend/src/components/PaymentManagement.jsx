import { useEffect, useState } from 'react'
import YouPiCheckoutModal from './YouPiCheckoutModal'

const API = 'http://localhost:5000/api'

function PaymentManagement() {
  const [requests, setRequests] = useState([])
  const [payments, setPayments] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [activeUpiPayment, setActiveUpiPayment] = useState(null)

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
      const [requestData, paymentData] = await Promise.all([
        request('/payment-management/owner/payment-mode-requests'),
        request('/pend-management/payments'),
      ])
      setRequests(requestData.requests || [])
      setPayments(paymentData.data || [])
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const reviewRequest = async (farmerMongoId, action) => {
    try {
      setMessage('')
      await request(
        `/payment-management/owner/payment-mode-requests/${farmerMongoId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action }),
        }
      )
      setMessage(`Payment mode request ${action}d successfully.`)
      loadData()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const markCashPaid = async (paymentId) => {
    if (!window.confirm('Confirm that cash has physically been given to this farmer?')) {
      return
    }

    try {
      setMessage('')
      await request(`/pend-management/payment/${paymentId}/mark-paid`, {
        method: 'PATCH',
      })
      setMessage('Cash payment marked as paid.')
      loadData()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const money = (value) =>
    `₹${(Number(value) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const visiblePayments = payments.filter((p) =>
    filter === 'all' || p.paymentStatus === filter
  )

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
      {/* YouPI Checkout Modal */}
      {activeUpiPayment && (
        <YouPiCheckoutModal
          payment={activeUpiPayment}
          onClose={() => setActiveUpiPayment(null)}
          onSuccess={(utr) => {
            setMessage(`Payment settled successfully via YouPI-PG (UTR: ${utr})!`)
            setActiveUpiPayment(null)
            loadData()
          }}
        />
      )}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <h5 className="fw-bold mb-0">💳 Payment & UPI Settlement Management</h5>
          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
            ⚡ YouPI-PG Enabled
          </span>
        </div>
        <button className="btn btn-outline-success btn-sm" onClick={loadData}>
          Refresh
        </button>
      </div>

      {message && <div className="alert alert-info py-2 small">{message}</div>}
      {loading && <p className="text-muted small">Loading payment information...</p>}

      <h6 className="fw-bold mt-2">Farmer Payment Mode Requests</h6>
      <div className="table-responsive mb-4">
        <table className="table table-sm table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Farmer</th>
              <th>Farmer ID</th>
              <th>Current Mode</th>
              <th>Requested Mode</th>
              <th>Bank / UPI Details</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((f) => (
              <tr key={f._id}>
                <td>{f.name}</td>
                <td>{f.farmerId}</td>
                <td className="text-capitalize">
                  <span className={`badge ${f.paymentMode === 'upi' ? 'bg-primary' : f.paymentMode === 'auto' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                    {f.paymentMode}
                  </span>
                </td>
                <td className="fw-bold text-success text-capitalize">
                  {f.paymentModeRequest?.mode}
                </td>
                <td className="small">
                  {f.paymentModeRequest?.mode === 'upi' || f.bankDetails?.upiId ? (
                    <div>
                      <strong>UPI ID:</strong> {f.bankDetails?.upiId || 'Not provided'}<br />
                      <span className="text-muted">A/C Name: {f.bankDetails?.accountHolderName || f.name}</span>
                    </div>
                  ) : f.paymentModeRequest?.mode === 'auto' ? (
                    <>
                      {f.bankDetails?.accountHolderName || '-'}<br />
                      {f.bankDetails?.bankName || '-'}<br />
                      IFSC: {f.bankDetails?.ifscCode || '-'}
                    </>
                  ) : '-'}
                </td>
                <td>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => reviewRequest(f._id, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => reviewRequest(f._id, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-muted py-3">
                  No pending payment mode requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <hr />

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h6 className="fw-bold mb-0">Farmer Payment History & UPI Settlements</h6>
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: '180px' }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Payments</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Farmer ID</th>
              <th>Gross</th>
              <th>Pend Deduction</th>
              <th>Loan Deduction</th>
              <th>Final Payable</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Action / Reference</th>
            </tr>
          </thead>
          <tbody>
            {visiblePayments.map((p) => (
              <tr key={p._id}>
                <td>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                <td className="fw-semibold">{p.farmerId}</td>
                <td>{money(p.grossPayment)}</td>
                <td>{money(p.pendDeduction)}</td>
                <td>{money(p.loanDeduction)}</td>
                <td className="fw-bold text-success">{money(p.finalPayable)}</td>
                <td className="text-capitalize">
                  <span className={`badge ${p.paymentMode === 'upi' ? 'bg-primary' : p.paymentMode === 'auto' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                    {p.paymentMode}
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    p.paymentStatus === 'paid' ? 'bg-success' :
                    p.paymentStatus === 'failed' ? 'bg-danger' :
                    p.paymentStatus === 'processing' ? 'bg-primary' :
                    'bg-warning text-dark'
                  }`}>
                    {p.paymentStatus}
                  </span>
                </td>
                <td>
                  {p.paymentStatus === 'paid' ? (
                    <small className="text-muted d-block font-monospace">
                      Ref: {p.paymentReference || p.utr || 'Cash Settlement'}
                    </small>
                  ) : (
                    <div className="d-flex gap-1 flex-wrap">
                      {/* YouPI UPI Instant Checkout */}
                      <button
                        className="btn btn-sm text-white fw-semibold px-2.5 py-1 d-flex align-items-center gap-1 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', border: 'none' }}
                        onClick={() => setActiveUpiPayment(p)}
                        title="Open YouPI QR Code and UPI Intent Modal"
                      >
                        <span>⚡</span> Pay via YouPI (UPI)
                      </button>

                      {/* Cash Fallback */}
                      {p.paymentMode === 'cash' && (
                        <button
                          className="btn btn-outline-secondary btn-sm py-1 px-2"
                          onClick={() => markCashPaid(p._id)}
                        >
                          Mark Cash Paid
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visiblePayments.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center text-muted py-3">
                  No payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="alert alert-success small mt-3 mb-0 d-flex align-items-center gap-2">
        <span>⚡</span>
        <div>
          <strong>YouPI-PG Gateway Active:</strong> 0% transaction fee direct peer-to-bank settlements enabled.
          Scan dynamic vector QR codes or launch UPI apps (Google Pay, PhonePe, Paytm, CRED). Confirmations reconcile automatically via UTR or webhooks.
        </div>
      </div>
    </div>
  )
}

export default PaymentManagement
