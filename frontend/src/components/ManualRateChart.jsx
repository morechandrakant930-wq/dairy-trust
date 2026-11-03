import { useEffect, useState } from 'react';

const API = 'http://localhost:5000/api/rate-charts';

const ANIMALS = ['Cow', 'Buffalo', 'Goat', 'Other'];

function ManualRateChart() {
  const [animalType, setAnimalType] = useState('Cow');
  const [chartName, setChartName] = useState('Manual FAT SNF Rate Chart');

  const [fatValues, setFatValues] = useState([3, 3.5, 4, 4.5, 5]);
  const [snfValues, setSnfValues] = useState([7, 7.5, 8, 8.5, 9]);

  const [rateMatrix, setRateMatrix] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const token = localStorage.getItem('dairyToken');

  const loadChart = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}?animalType=${encodeURIComponent(animalType)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not load rate chart.');
      }

      const chart = data.data?.find((item) => item.isActive);

      if (chart) {
        setChartName(chart.chartName);
        setFatValues(chart.fatValues || []);
        setSnfValues(chart.snfValues || []);
        setRateMatrix(chart.rateMatrix || {});
      } else {
        setChartName(`${animalType} Manual Rate Chart`);
        setFatValues([3, 3.5, 4, 4.5, 5]);
        setSnfValues([7, 7.5, 8, 8.5, 9]);
        setRateMatrix({});
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChart();
  }, [animalType]);

  const updateRate = (fat, snf, value) => {
    setRateMatrix((previous) => ({
      ...previous,
      [String(fat)]: {
        ...(previous[String(fat)] || {}),
        [String(snf)]: value,
      },
    }));
  };

  const addFat = () => {
    const value = prompt('Enter new FAT value (example: 5.5):');
    if (value === null || value.trim() === '') return;

    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0 || fatValues.includes(number)) {
      setMessage('Enter a valid, unique FAT value.');
      setMessageType('danger');
      return;
    }

    setFatValues((previous) =>
      [...previous, number].sort((a, b) => a - b)
    );
  };

  const addSnf = () => {
    const value = prompt('Enter new SNF value (example: 9.5):');
    if (value === null || value.trim() === '') return;

    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0 || snfValues.includes(number)) {
      setMessage('Enter a valid, unique SNF value.');
      setMessageType('danger');
      return;
    }

    setSnfValues((previous) =>
      [...previous, number].sort((a, b) => a - b)
    );
  };

  const saveChart = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage('');

      const response = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          animalType,
          chartName,
          fatValues,
          snfValues,
          rateMatrix,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not save rate chart.');
      }

      setMessage('Manual FAT/SNF rate chart saved successfully!');
      setMessageType('success');

      await loadChart();
    } catch (error) {
      setMessage(error.message);
      setMessageType('danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h5 className="fw-bold mb-1">🥛 Manual FAT/SNF Rate Chart</h5>
          <small className="text-secondary">
            Set your own milk rate for every FAT and SNF combination.
          </small>
        </div>

        <span className="badge bg-success rounded-pill px-3 py-2">
          Manual Rate System
        </span>
      </div>

      {message && (
        <div className={`alert alert-${messageType} py-2`}>
          {message}
        </div>
      )}

      <form onSubmit={saveChart}>
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Animal Type</label>
            <select
              className="form-select"
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value)}
              disabled={saving}
            >
              {ANIMALS.map((animal) => (
                <option key={animal} value={animal}>
                  {animal}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Chart Name</label>
            <input
              className="form-control"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={addFat}
            disabled={saving}
          >
            + Add FAT Value
          </button>

          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={addSnf}
            disabled={saving}
          >
            + Add SNF Value
          </button>
        </div>

        {loading ? (
          <p className="text-secondary">Loading rate chart...</p>
        ) : (
          <>
            <div className="alert alert-info py-2 small">
              Enter the rate per litre for each FAT/SNF combination.
              All rate cells are required before saving.
            </div>

            <div className="table-responsive border rounded-3">
              <table className="table table-bordered table-sm text-center align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>FAT \ SNF</th>
                    {snfValues.map((snf) => (
                      <th key={snf}>{snf}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {fatValues.map((fat) => (
                    <tr key={fat}>
                      <th className="table-light">{fat}</th>

                      {snfValues.map((snf) => (
                        <td key={snf} style={{ minWidth: 95 }}>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center"
                            min="0.01"
                            step="0.01"
                            placeholder="₹ Rate"
                            value={rateMatrix[String(fat)]?.[String(snf)] ?? ''}
                            onChange={(e) =>
                              updateRate(fat, snf, e.target.value)
                            }
                            required
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="submit"
              className="btn btn-success mt-3 px-4 fw-semibold"
              disabled={saving || fatValues.length === 0 || snfValues.length === 0}
            >
              {saving ? 'Saving...' : 'Save Manual Rate Chart'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default ManualRateChart;