
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDairies.css';

function AdminDairies() {
  const navigate = useNavigate();

  const [dairies, setDairies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDairies = async () => {
      const token = localStorage.getItem('dairyToken');

      if (!token) {
        navigate('/admin-login');
        return;
      }

      try {
        const response = await fetch(
          'http://localhost:5000/api/admin/dairies',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load dairies');
        }

        setDairies(data.dairies || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDairies();
  }, [navigate]);

  return (
    <div className="dairies-page">
      <div className="dairies-heading">
        <div>
          <p>ADMINISTRATION / DAIRIES</p>
          <h1>Dairy Management</h1>
          <span>Manage all registered dairy accounts</span>
        </div>

        <button onClick={() => navigate('/admin-dashboard')}>
          ← Dashboard
        </button>
      </div>

      <div className="dairies-summary">
        <div>
          <span>Total Registered Dairies</span>
          <h2>{dairies.length}</h2>
        </div>
        <span>🏢</span>
      </div>

      {loading ? (
        <p className="dairies-message">Loading dairy accounts...</p>
      ) : error ? (
        <p className="dairies-error">{error}</p>
      ) : dairies.length === 0 ? (
        <p className="dairies-message">No dairy accounts registered yet.</p>
      ) : (
        <div className="dairies-table-wrapper">
          <table className="dairies-table">
            <thead>
              <tr>
                <th>Dairy ID</th>
                <th>Dairy Name</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Plan</th>
                <th>Registered On</th>
              </tr>
            </thead>

            <tbody>
              {dairies.map((dairy) => (
                <tr key={dairy._id}>
                  <td>{dairy.dairyId}</td>
                  <td>{dairy.dairyName}</td>
                  <td>{dairy.ownerName}</td>
                  <td>{dairy.email}</td>
                  <td>{dairy.phone}</td>
                  <td>
                    <span className="dairy-plan">
                      {dairy.plan}
                    </span>
                  </td>
                  <td>
                    {dairy.createdAt
                      ? new Date(dairy.createdAt).toLocaleDateString('en-IN')
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

export default AdminDairies;
