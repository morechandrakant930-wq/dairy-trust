
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminOperations.css';

function AdminPayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('dairyToken');
    if (!token) {
      navigate('/admin-login');
      return;
    }

    fetch('http://localhost:5000/api/admin/payments', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load payments');
        }
        setPayments(data.payments || []);
        setSummary(data.summary || {});
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const filtered = payments.filter(item => {
    const matchesSearch = [
      item.farmerName,
      item.farmerId,
      item.dairyName,
      item.dairyId,
      item.paymentReference,
    ].some(value =>
      String(value || '').toLowerCase().includes(search.toLowerCase())
    );

    return matchesSearch &&
      (status === 'all' || item.paymentStatus === status);
  });

  const money = value =>
    `₹${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="admin-operations">
      <div className="operations-heading">
        <div>
          <p>ADMINISTRATION / FINANCE</p>
          <h1>Payments & Reports</h1>
          <span>Payment status and collection-based payment summary</span>
        </div>
        <button onClick={() => navigate('/admin-dashboard')}>← Dashboard</button>
      </div>

      <div className="payment-summary-grid">
        <div><span>Total Amount</span><h2>{money(summary.totalAmount)}</h2></div>
        <div><span>Paid Amount</span><h2>{money(summary.paidAmount)}</h2></div>
        <div><span>Pending Amount</span><h2>{money(summary.pendingAmount)}</h2></div>
        <div><span>Processing Amount</span><h2>{money(summary.processingAmount)}</h2></div>
      </div>

      <div className="operations-filters">
        <input
          className="operations-search"
          placeholder="Search farmer, dairy or reference..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
        </select>
      </div>

      {loading ? <p>Loading payment reports...</p> :
        error ? <p className="operations-error">{error}</p> :
        filtered.length === 0 ? <p>No payment records found.</p> : (
          <div className="operations-table-wrap">
            <table className="operations-table">
              <thead>
                <tr>
                  <th>Collection Date</th><th>Farmer</th><th>Farmer ID</th>
                  <th>Dairy</th><th>Quantity</th><th>Amount</th>
                  <th>Status</th><th>Payment Date</th><th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item._id}>
                    <td>{new Date(item.collectionTime).toLocaleDateString('en-IN')}</td>
                    <td>{item.farmerName}</td>
                    <td>{item.farmerId}</td>
                    <td>{item.dairyName}</td>
                    <td>{Number(item.quantity).toFixed(2)} L</td>
                    <td>{money(item.totalPayment)}</td>
                    <td>
                      <span className={`operations-status ${item.paymentStatus}`}>
                        {item.paymentStatus}
                      </span>
                    </td>
                    <td>
                      {item.paymentDate
                        ? new Date(item.paymentDate).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td>{item.paymentReference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <p className="operations-footnote">
        {summary.totalRecords || 0} payment-linked collection records.
        Paid: {summary.paidCount || 0} · Pending: {summary.pendingCount || 0}
        {' '}· Processing: {summary.processingCount || 0}
      </p>
    </div>
  );
}

export default AdminPayments;
