
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminOperations.css';

function AdminCollections() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('dairyToken');
    if (!token) {
      navigate('/admin-login');
      return;
    }

    fetch('http://localhost:5000/api/admin/collections', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load collections');
        }
        setRecords(data.collections || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const filtered = records.filter(item =>
    [
      item.farmerName,
      item.farmerId,
      item.dairyName,
      item.dairyId,
    ].some(value =>
      String(value || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalLitres = records.reduce(
    (sum, item) => sum + Number(item.quantity || 0), 0
  );

  return (
    <div className="admin-operations">
      <div className="operations-heading">
        <div>
          <p>ADMINISTRATION / COLLECTIONS</p>
          <h1>Milk Collection</h1>
          <span>All dairy milk collection records</span>
        </div>
        <button onClick={() => navigate('/admin-dashboard')}>← Dashboard</button>
      </div>

      <div className="operations-summary">
        <div>
          <span>Total Collections</span>
          <h2>{records.length}</h2>
        </div>
        <div>
          <span>Total Milk Collected</span>
          <h2>{totalLitres.toFixed(2)} L</h2>
        </div>
      </div>

      <input
        className="operations-search"
        placeholder="Search farmer, dairy or ID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? <p>Loading collections...</p> :
        error ? <p className="operations-error">{error}</p> :
        filtered.length === 0 ? <p>No collection records found.</p> : (
          <div className="operations-table-wrap">
            <table className="operations-table">
              <thead>
                <tr>
                  <th>Date</th><th>Farmer</th><th>Farmer ID</th>
                  <th>Dairy</th><th>Animal</th><th>Quantity</th>
                  <th>Fat</th><th>SNF</th><th>Rate/L</th>
                  <th>Amount</th><th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item._id}>
                    <td>{new Date(item.collectionTime).toLocaleString('en-IN')}</td>
                    <td>{item.farmerName}</td>
                    <td>{item.farmerId}</td>
                    <td>{item.dairyName}</td>
                    <td>{item.animalType}</td>
                    <td>{Number(item.quantity).toFixed(2)} L</td>
                    <td>{item.fat}%</td>
                    <td>{item.snf}%</td>
                    <td>₹{item.ratePerLitre}</td>
                    <td>₹{Number(item.totalPayment).toFixed(2)}</td>
                    <td>
                      <span className={`operations-status ${item.paymentStatus}`}>
                        {item.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

export default AdminCollections;
