
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminFarmers.css';

function AdminFarmers() {
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchFarmers = async () => {
      const token = localStorage.getItem('dairyToken');

      if (!token) {
        navigate('/admin-login');
        return;
      }

      try {
        const response = await fetch(
          'http://localhost:5000/api/admin/farmers',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load farmers.');
        }

        setFarmers(data.farmers || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmers();
  }, [navigate]);

  const filteredFarmers = farmers.filter((farmer) => {
    const searchText = search.toLowerCase();

    return [
      farmer.farmerId,
      farmer.name,
      farmer.mobileNumber,
      farmer.village,
      farmer.dairyId,
    ].some((value) =>
      String(value || '').toLowerCase().includes(searchText)
    );
  });

  return (
    <div className="admin-farmers-page">
      <div className="admin-farmers-heading">
        <div>
          <p>ADMINISTRATION / FARMERS</p>
          <h1>Farmer Management</h1>
          <span>View and monitor all registered farmers</span>
        </div>

        <button onClick={() => navigate('/admin-dashboard')}>
          ← Dashboard
        </button>
      </div>

      <div className="admin-farmer-summary">
        <div>
          <span>Total Registered Farmers</span>
          <h2>{farmers.length}</h2>
        </div>
        <span className="farmer-summary-icon">👨‍🌾</span>
      </div>

      <div className="admin-farmer-toolbar">
        <input
          type="search"
          placeholder="Search by farmer name, ID, mobile, village or dairy ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span>{filteredFarmers.length} farmers found</span>
      </div>

      {loading ? (
        <p className="admin-farmer-message">Loading farmers...</p>
      ) : error ? (
        <p className="admin-farmer-error">{error}</p>
      ) : filteredFarmers.length === 0 ? (
        <p className="admin-farmer-message">
          {farmers.length === 0
            ? 'No farmers registered yet.'
            : 'No farmers match your search.'}
        </p>
      ) : (
        <div className="admin-farmer-table-wrap">
          <table className="admin-farmer-table">
            <thead>
              <tr>
                <th>Farmer ID</th>
                <th>Farmer Name</th>
                <th>Mobile</th>
                <th>Village</th>
                <th>Animal</th>
                <th>Dairy ID</th>
                <th>Payment Mode</th>
                <th>Registered On</th>
              </tr>
            </thead>

            <tbody>
              {filteredFarmers.map((farmer) => (
                <tr key={farmer._id}>
                  <td>{farmer.farmerId}</td>
                  <td>{farmer.name}</td>
                  <td>{farmer.mobileNumber}</td>
                  <td>{farmer.village}</td>
                  <td>{farmer.animalType}</td>
                  <td>{farmer.dairyId}</td>
                  <td>
                    <span className="admin-farmer-plan">
                      {farmer.paymentMode || 'cash'}
                    </span>
                  </td>
                  <td>
                    {farmer.createdAt
                      ? new Date(farmer.createdAt).toLocaleDateString('en-IN')
                      : '—'}
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

export default AdminFarmers;
