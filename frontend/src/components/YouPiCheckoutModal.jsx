import { useState, useEffect } from 'react';
import './YouPiCheckoutModal.css';

const API_BASE = 'http://localhost:5000/api';

function YouPiCheckoutModal({ payment, onClose, onSuccess }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('qr');
  const [utrInput, setUtrInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins
  const [paymentComplete, setPaymentComplete] = useState(false);

  const token = localStorage.getItem('dairyToken') || localStorage.getItem('farmerToken');

  // 1. Initialize YouPI UPI Session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_BASE}/payment-management/upi/create-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentId: payment._id,
            customVpa: payment.upiVpa || payment.bankDetails?.upiId,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to initialize YouPI UPI session');
        }

        if (isMounted) {
          setSession(data.session);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (payment?._id) {
      initSession();
    }

    return () => {
      isMounted = false;
    };
  }, [payment, token]);

  // 2. Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || paymentComplete) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, paymentComplete]);

  // 3. Poll for status (auto-detection from webhooks / observers)
  useEffect(() => {
    if (!session?.sessionId || paymentComplete) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/payment-management/upi/session/${session.sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success && (data.status === 'OBSERVED_SUCCESS' || data.status === 'RECONCILED')) {
          setPaymentComplete(true);
          setTimeout(() => {
            if (onSuccess) onSuccess(data.utr);
          }, 1800);
        }
      } catch (e) {
        // Silent polling failure
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [session, paymentComplete, token, onSuccess]);

  // Handle UTR Verification
  const handleVerifyUtr = async (e) => {
    e.preventDefault();
    if (!utrInput.trim()) {
      setError('Please enter the 12-digit UPI UTR number.');
      return;
    }

    if (!/^\d{12}$/.test(utrInput.trim())) {
      setError('UTR must be exactly 12 digits (numeric).');
      return;
    }

    try {
      setVerifying(true);
      setError('');

      const res = await fetch(`${API_BASE}/payment-management/upi/verify-utr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId: payment._id,
          sessionId: session?.sessionId,
          utr: utrInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to verify UTR.');
      }

      setPaymentComplete(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(utrInput.trim());
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(`${label} copied!`);
    setTimeout(() => setCopyStatus(''), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="youpi-overlay" onClick={onClose}>
      <div className="youpi-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="youpi-header">
          <div className="youpi-brand">
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <div>
              <div className="fw-bold fs-6">YouPI Payment Gateway</div>
              <div className="small opacity-75" style={{ fontSize: '0.75rem' }}>
                Zero Fee Direct UPI Payouts
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="youpi-badge">0% MDR</span>
            <button className="youpi-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="youpi-body">
          {paymentComplete ? (
            <div className="youpi-success-state">
              <div className="youpi-success-icon">✓</div>
              <h5 className="fw-bold text-success mb-1">Payment Successfully Verified!</h5>
              <p className="small text-muted mb-0">
                The settlement has been marked as <strong>PAID</strong> with UPI UTR reference.
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
              <p className="text-muted small mt-3">Generating secure dynamic UPI QR code...</p>
            </div>
          ) : error && !session ? (
            <div className="alert alert-danger py-3 small">
              <strong>Error:</strong> {error}
              <div className="mt-3">
                <button className="btn btn-sm btn-outline-danger" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Amount & Timer Card */}
              <div className="youpi-amount-card">
                <div>
                  <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                    PAYABLE TO: <strong>{session?.payeeName}</strong>
                  </small>
                  <div className="youpi-amount-value">
                    ₹{(Number(session?.amount) || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="text-end">
                  <div className="youpi-timer">
                    <span>⏱️</span> {timeFormatted}
                  </div>
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Session Active
                  </small>
                </div>
              </div>

              {copyStatus && (
                <div className="alert alert-success py-1 px-3 small text-center mb-0">
                  {copyStatus}
                </div>
              )}

              {/* Tabs */}
              <div className="youpi-tabs">
                <button
                  className={`youpi-tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
                  onClick={() => setActiveTab('qr')}
                >
                  Scan QR Code
                </button>
                <button
                  className={`youpi-tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
                  onClick={() => setActiveTab('apps')}
                >
                  Pay via UPI App
                </button>
              </div>

              {/* TAB 1: QR Code */}
              {activeTab === 'qr' && (
                <div className="youpi-qr-container">
                  <div
                    className="youpi-qr-box"
                    dangerouslySetInnerHTML={{ __html: session?.qrSvg || '' }}
                  />

                  <div
                    className="youpi-vpa-pill"
                    onClick={() => handleCopy(session?.payeeVpa, 'UPI ID')}
                    title="Click to copy UPI ID"
                  >
                    <span>VPA: <strong>{session?.payeeVpa}</strong></span>
                    <span style={{ fontSize: '0.75rem' }}>📋</span>
                  </div>

                  <p className="text-muted small text-center mb-0" style={{ fontSize: '0.75rem' }}>
                    Scan with any UPI app (GPay, PhonePe, Paytm, BHIM, CRED)
                  </p>
                </div>
              )}

              {/* TAB 2: Direct App Buttons */}
              {activeTab === 'apps' && (
                <div className="d-flex flex-column gap-3">
                  <p className="text-muted small mb-0 text-center">
                    Open your preferred UPI app directly on this device:
                  </p>
                  <div className="youpi-apps-grid">
                    <a href={session?.intents?.phonepe} className="youpi-app-btn phonepe">
                      <span>🟣</span> PhonePe
                    </a>
                    <a href={session?.intents?.gpay} className="youpi-app-btn gpay">
                      <span>🔵</span> Google Pay
                    </a>
                    <a href={session?.intents?.paytm} className="youpi-app-btn paytm">
                      <span>🔷</span> Paytm
                    </a>
                    <a href={session?.intents?.bhim} className="youpi-app-btn bhim">
                      <span>🟠</span> BHIM UPI
                    </a>
                  </div>
                  <div className="text-center mt-1">
                    <button
                      className="btn btn-link btn-sm text-decoration-none text-muted"
                      onClick={() => handleCopy(session?.upiUri, 'Payment Link')}
                    >
                      🔗 Copy Direct UPI Intent Link
                    </button>
                  </div>
                </div>
              )}

              {/* Verification / UTR Section */}
              <div className="youpi-utr-section">
                <label className="fw-semibold small d-block mb-1 text-dark">
                  Enter 12-Digit Bank UTR / Reference
                </label>
                <small className="text-muted d-block mb-2" style={{ fontSize: '0.75rem' }}>
                  Once payment is completed in the UPI app, enter the 12-digit UTR from the receipt:
                </small>

                <form onSubmit={handleVerifyUtr} className="d-flex gap-2">
                  <input
                    type="text"
                    maxLength={12}
                    className="form-control form-control-sm youpi-utr-input"
                    placeholder="e.g. 423512345678"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, ''))}
                  />
                  <button
                    type="submit"
                    className="btn btn-success btn-sm px-3 fw-semibold text-nowrap"
                    disabled={verifying || utrInput.length !== 12}
                  >
                    {verifying ? 'Verifying...' : 'Confirm'}
                  </button>
                </form>

                {error && <div className="text-danger small mt-2">{error}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default YouPiCheckoutModal;
