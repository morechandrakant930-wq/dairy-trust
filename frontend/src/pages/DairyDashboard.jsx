import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import logoImage from '../assets/logo.png'
import dairyOwnerBg from '../assets/dairy-owner-bg.png'
import ManualRateChart from '../components/ManualRateChart'
import BonusManagement from '../components/BonusManagement'
import PaymentManagement from '../components/PaymentManagement'
import { useLanguage } from '../language/LanguageContext'
import DisputeManagement from '../components/DisputeManagement'
import './DairyDashboard.css'

function DairyDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const { t } = useLanguage()

  const todayStr = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, '0'),
    String(new Date().getDate()).padStart(2, '0'),
  ].join('-')

  const [summary, setSummary] = useState(null)
  const [summaryDate, setSummaryDate] = useState(todayStr)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryMessage, setSummaryMessage] = useState('')

  const [farmerHistory, setFarmerHistory] = useState({ farmers: [], collections: [] })
  const [selectedFarmer, setSelectedFarmer] = useState('all')
  const [farmerSearch, setFarmerSearch] = useState('')
  const [ledgerStartDate, setLedgerStartDate] = useState('')
  const [ledgerEndDate, setLedgerEndDate] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyMessage, setHistoryMessage] = useState('')

  // Pend States
  const [pendStock, setPendStock] = useState([])
  const [pendLoading, setPendLoading] = useState(false)
  const [pendMessage, setPendMessage] = useState('')
  const [pendName, setPendName] = useState('')
  const [purchaseBags, setPurchaseBags] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayStr)

  const [saleFarmerId, setSaleFarmerId] = useState('')
  const [salePendName, setSalePendName] = useState('')
  const [saleBags, setSaleBags] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [saleDate, setSaleDate] = useState(todayStr)

  // Loan States
  const [loanFarmerId, setLoanFarmerId] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [loanDate, setLoanDate] = useState(todayStr)
  const [loanNotes, setLoanNotes] = useState('')
  const [loanLoading, setLoanLoading] = useState(false)
  const [loanMessage, setLoanMessage] = useState('')
  const [loanHistory, setLoanHistory] = useState([])

  const dairy = JSON.parse(localStorage.getItem('dairyUser') || '{}')
  const planNames = { basic: 'Basic', standard: 'Standard', premium: 'Premium' }
  const planPrices = { basic: '₹299/month', standard: '₹599/month', premium: '₹999/month' }
  const plan = (dairy.plan || 'basic').toLowerCase()

  // Load Farmer History
  useEffect(() => {
    const loadFarmerHistory = async () => {
      const token = localStorage.getItem('dairyToken');

      if (!token) {
        setHistoryMessage('Dairy login token not found. Please login again.');
        return;
      }

      try {
        setHistoryLoading(true);
        setHistoryMessage('');

        const response = await fetch(
          'http://localhost:5000/api/milk-collections/farmer-history',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Farmer history API failed');
        }

        if (!data.success) {
          throw new Error(data.message || 'Farmer history data not found');
        }

        setFarmerHistory({
          farmers: data.data?.farmers || [],
          collections: data.data?.collections || [],
        });
      } catch (error) {
        setHistoryMessage(error.message);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadFarmerHistory();
  }, []);

  // Load Pend Stock
  const loadPendStock = () => {
    const token = localStorage.getItem('dairyToken')
    if (!token) return

    setPendLoading(true)
    fetch('http://localhost:5000/api/pend-management/stock', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPendStock(data.data)
      })
      .catch((err) => setPendMessage(err.message))
      .finally(() => setPendLoading(false))
  }

  useEffect(() => {
    loadPendStock()
  }, [])

  // Load Loan History
  const loadLoanHistory = () => {
    const token = localStorage.getItem('dairyToken')
    if (!token) return

    fetch('http://localhost:5000/api/pend-management/loan-history', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLoanHistory(data.data)
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    loadLoanHistory()
  }, [])

  // Handle Loan
  const handleGiveLoan = async (e) => {
    e.preventDefault()
    try {
      setLoanLoading(true)
      setLoanMessage('')

      const token = localStorage.getItem('dairyToken')
      const response = await fetch('http://localhost:5000/api/pend-management/loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          farmerId: loanFarmerId,
          loanAmount: Number(loanAmount),
          loanDate,
          notes: loanNotes,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || 'Loan save hou shakle nahi.')

      setLoanMessage('Loan granted to farmer successfully!')
      setLoanFarmerId('')
      setLoanAmount('')
      setLoanNotes('')
      loadLoanHistory()
    } catch (err) {
      setLoanMessage(err.message)
    } finally {
      setLoanLoading(false)
    }
  }

  // Load Daily Summary
  useEffect(() => {
    const token = localStorage.getItem('dairyToken')
    if (!token || !summaryDate) return

    setSummaryLoading(true)
    fetch(`http://localhost:5000/api/milk-collections/daily-summary?date=${encodeURIComponent(summaryDate)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSummary(data.data)
      })
      .catch((err) => setSummaryMessage(err.message))
      .finally(() => setSummaryLoading(false))
  }, [summaryDate])

  // Pend Actions
  const handlePendPurchase = async (e) => {
    e.preventDefault()
    try {
      setPendMessage('')
      const token = localStorage.getItem('dairyToken')
      const res = await fetch('http://localhost:5000/api/pend-management/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pendName,
          quantityBags: Number(purchaseBags),
          purchasePricePerBag: Number(purchasePrice),
          purchaseDate,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message)
      setPendMessage('Pend purchase saved successfully!')
      setPendName('')
      setPurchaseBags('')
      setPurchasePrice('')
      loadPendStock()
    } catch (err) {
      setPendMessage(err.message)
    }
  }

  const handlePendSale = async (e) => {
    e.preventDefault()
    try {
      setPendMessage('')
      const token = localStorage.getItem('dairyToken')
      const res = await fetch('http://localhost:5000/api/pend-management/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farmerId: saleFarmerId,
          pendName: salePendName,
          quantityBags: Number(saleBags),
          salePricePerBag: Number(salePrice),
          saleDate,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message)
      setPendMessage('Pend sold to farmer successfully!')
      setSaleFarmerId('')
      setSalePendName('')
      setSaleBags('')
      setSalePrice('')
      loadPendStock()
    } catch (err) {
      setPendMessage(err.message)
    }
  }

  const formatRupees = (amt) =>
    `₹${(Number(amt) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return (
    <div 
      className="container-fluid min-vh-100 p-0 dairy-dashboard" 
      style={{
        backgroundImage: `linear-gradient(rgba(245, 250, 247, 0.82), rgba(245, 250, 247, 0.88)), url(${dairyOwnerBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="row g-0 min-vh-100">

        {/* ================= PREMIUM SIDEBAR NAVBAR ================= */}
        <div
          className="col-12 col-lg-3 col-xl-2 text-white p-4 d-flex flex-column justify-content-between shadow-lg dairy-dashboard-sidebar"
          style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            {/* Brand Logo & Name */}
            <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom border-secondary border-opacity-50">
              <img
                src={logoImage}
                alt="Dairy Trust Logo"
                className="rounded-3 shadow-sm bg-white p-1 object-fit-contain"
                style={{ width: '44px', height: '44px' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h5 className="fw-bold mb-0 text-white tracking-wide" style={{ letterSpacing: '0.5px' }}>Dairy Trust</h5>
                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 rounded-pill px-2" style={{ fontSize: '0.6rem' }}>
                  ENTERPRISE
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="list-group list-group-flush gap-1.5 bg-transparent">
              <button
                className={`list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 transition ${activeTab === 'overview' ? 'text-white shadow-sm' : 'bg-transparent text-white-50'}`}
                style={activeTab === 'overview' ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' } : {}}
                onClick={() => setActiveTab('overview')}
              >
                <span className="fs-6">🏠</span> {t('dashboardOverview')}
              </button>

              <Link
                to="/milk-collection"
                className="list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 bg-transparent text-white-50 text-decoration-none transition hover-light"
              >
                <span className="fs-6">🥛</span> {t('recordMilkEntry')}
              </Link>

              <Link
                to="/milk-reports"
                className="list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 bg-transparent text-white-50 text-decoration-none transition"
              >
                <span className="fs-6">📊</span> {t('reportsAndBills')}
              </Link>

              <button
                className={`list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 transition ${activeTab === 'ledger' ? 'text-white shadow-sm' : 'bg-transparent text-white-50'}`}
                style={activeTab === 'ledger' ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' } : {}}
                onClick={() => setActiveTab('ledger')}
              >
                <span className="fs-6">📜</span> {t('farmerLedger')}
              </button>

              <button
                className={`list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 transition ${activeTab === 'pend' ? 'text-white shadow-sm' : 'bg-transparent text-white-50'}`}
                style={activeTab === 'pend' ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' } : {}}
                onClick={() => setActiveTab('pend')}
              >
                <span className="fs-6">🌾</span> {t('pendStockSales')}
              </button>

              <button
                className={`list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 transition ${activeTab === 'loans' ? 'text-white shadow-sm' : 'bg-transparent text-white-50'}`}
                style={activeTab === 'loans' ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' } : {}}
                onClick={() => setActiveTab('loans')}
              >
                <span className="fs-6">💸</span> {t('farmerLoans')}
              </button>

              <button
                className={`list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 transition ${activeTab === 'rates' ? 'text-white shadow-sm' : 'bg-transparent text-white-50'}`}
                style={activeTab === 'rates' ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' } : {}}
                onClick={() => setActiveTab('rates')}
              >
                <span className="fs-6">🥛</span> {t('manualRate')}
              </button>

              <button
                className={`list-group-item list-group-item-action border-0 rounded-3 py-2 px-3 fw-semibold small d-flex align-items-center gap-3 ${activeTab === 'bonus' ? 'text-white shadow-sm' : 'bg-transparent text-white-50'}`}
                style={activeTab === 'bonus' ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' } : {}}
                onClick={() => setActiveTab('bonus')}
              >
                <span className="fs-6">🎁</span> {t('bonusMgmt')}
              </button>

              <button
                className={`list-group-item list-group-item-action border-0 rounded-3 py-2 px-3 fw-semibold small d-flex align-items-center gap-3 ${activeTab === 'payments' ? 'text-white shadow-sm' : 'bg-transparent text-white-50'}`}
                style={activeTab === 'payments' ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' } : {}}
                onClick={() => setActiveTab('payments')}
              >
                <span className="fs-6">💳</span> {t('paymentMgmt')}
              </button>

              <Link
                to="/farmer-registration"
                className="list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 bg-transparent text-white-50 text-decoration-none transition"
              >
                <span className="fs-6">👨‍🌾</span> {t('farmerDirectory')}
              </Link>

              <button
                className={`list-group-item list-group-item-action border-0 rounded-3 py-2.5 px-3 fw-semibold small d-flex align-items-center gap-3 transition ${
                  activeTab === 'disputes'
                    ? 'text-white shadow-sm'
                    : 'bg-transparent text-white-50'
                }`}
                style={
                  activeTab === 'disputes'
                    ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }
                    : {}
                }
                onClick={() => setActiveTab('disputes')}
              >
                <span className="fs-6">⚖️</span> {t('disputeCenter')}
              </button>
            </div>
          </div>

          {/* Sidebar Footer / User Profile */}
          <div className="pt-3 mt-4 border-top border-secondary border-opacity-50">
            <div className="small text-truncate mb-2 text-white-50">
              {t('activeOwner')}:<br />
              <strong className="text-white">{dairy.ownerName || 'Dairy Owner'}</strong>
            </div>
            <Link
              to="/change-password"
              className="btn btn-outline-light btn-sm w-100 rounded-pill fw-semibold mb-2 text-decoration-none"
            >
              🔐 Change Password
            </Link>
            <button
              className="btn btn-outline-danger btn-sm w-100 rounded-pill fw-semibold shadow-sm"
              onClick={() => {
                localStorage.removeItem('dairyToken')
                localStorage.removeItem('dairyUser')
                window.location.href = '/farmer-login'
              }}
            >
              {t('logoutPlatform')}
            </button>
          </div>
        </div>

        {/* ================= MAIN CONTENT AREA ================= */}
        <div className="col-12 col-lg-9 col-xl-10 p-4 p-md-5 overflow-auto dairy-dashboard-main">

          {/* Top Bar inside Main Dashboard */}
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom flex-wrap gap-2 bg-white p-3 rounded-4 shadow-sm border">
            <div>
              <h3 className="fw-bold text-dark mb-0">
                {activeTab === 'overview' && t('dashboardOverview')}
                {activeTab === 'ledger' && t('farmerLedger')}
                {activeTab === 'pend' && t('pendStockSales')}
                {activeTab === 'loans' && t('farmerLoans')}
                {activeTab === 'rates' && t('manualRate')}
                {activeTab === 'bonus' && t('bonusMgmt')}
                {activeTab === 'payments' && t('paymentMgmt')}
                {activeTab === 'disputes' && t('disputeCenter')}
              </h3>
              <small className="text-secondary">{t('welcomeOwner')}, {dairy.dairyName || 'Dairy Owner'}!</small>
            </div>

            <div className="d-flex align-items-center gap-3">
              <span className="badge bg-success text-white px-3 py-2 rounded-pill shadow-sm">
                {planNames[plan] || 'Basic'} Plan ({planPrices[plan]})
              </span>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & MILK COLLECTION QUICK LAUNCH */}
          {activeTab === 'overview' && (
            <>
              {/* Hero Call to Action for Milk Collection */}
              <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 text-white dairy-dashboard-hero" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h3 className="fw-bold mb-2">{t('readyForCollection')}</h3>
                    <p className="mb-3 text-white-50">{t('recordEntryDesc')}</p>
                    <Link to="/milk-collection" className="btn btn-light text-success fw-bold px-4 py-2 rounded-pill shadow-sm text-decoration-none">
                      {t('recordNewEntryBtn')}
                    </Link>
                  </div>
                  <div className="col-md-4 text-center d-none d-md-block fs-1">
                    🥛✨
                  </div>
                </div>
              </div>

              {/* Daily KPI Summary Cards */}
              <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">{t('dailyPerformance')}</h5>
                    <small className="text-muted">{t('sessionBreakdown')}</small>
                  </div>
                  <div>
                    <input
                      type="date"
                      className="form-control form-control-sm rounded-3"
                      value={summaryDate}
                      onChange={(e) => setSummaryDate(e.target.value)}
                    />
                  </div>
                </div>

                {summaryLoading && <p className="text-muted py-2 small">{t('loadingSummary')}</p>}
                {summaryMessage && <div className="alert alert-danger py-2 small">{summaryMessage}</div>}

                {!summaryLoading && summary && (
                  <div className="row g-3">
                    {[
                      { title: t('morningCollection'), key: 'morning', badge: 'bg-success' },
                      { title: t('eveningCollection'), key: 'evening', badge: 'bg-primary' },
                      { title: t('outsideSession'), key: 'outsideSession', badge: 'bg-warning text-dark' },
                      { title: t('fullDayTotal'), key: 'wholeDay', badge: 'bg-dark' },
                    ].map((col) => {
                      const data = summary[col.key]
                      return (
                        <div className="col-12 col-md-6 col-lg-3" key={col.key}>
                          <div className="p-3 bg-light rounded-4 h-100 border">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="small fw-semibold text-secondary">{col.title}</span>
                              <span className={`badge ${col.badge} rounded-pill`}>
                                {data?.collectionEntries || 0} {t('entries')}
                              </span>
                            </div>
                            <h3 className="fw-bold mb-1 text-dark">
                              {(Number(data?.totalLitres) || 0).toFixed(1)} <span className="fs-6 fw-normal text-muted">L</span>
                            </h3>
                            <div className="d-flex justify-content-between align-items-center mt-2 small">
                              <span className="text-success fw-bold">{formatRupees(data?.totalPayment)}</span>
                              <span className="text-muted">{t('farmersCount')}: {data?.uniqueFarmers || 0}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: ADVANCED FARMER LEDGER HISTORY */}
          {activeTab === 'ledger' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div>
                  <h5 className="fw-bold mb-1 text-dark">
                    📜 {t('farmerLedger')}
                  </h5>
                  <small className="text-secondary">
                    {t('recordEntryDesc')}
                  </small>
                </div>

                <button
                  className="btn btn-outline-success btn-sm rounded-pill px-3"
                  onClick={() => {
                    setFarmerSearch('')
                    setSelectedFarmer('all')
                    setLedgerStartDate('')
                    setLedgerEndDate('')
                  }}
                >
                  {t('resetFilters')}
                </button>
              </div>

              {/* SEARCH AND FILTERS */}
              <div className="row g-3 mb-4">

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    {t('searchFarmer')}
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder={t('searchPlaceholder')}
                    value={farmerSearch}
                    onChange={(e) => setFarmerSearch(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    {t('selectFarmer')}
                  </label>
                  <select
                    className="form-select rounded-3"
                    value={selectedFarmer}
                    onChange={(e) => setSelectedFarmer(e.target.value)}
                  >
                    <option value="all">{t('allFarmers')}</option>
                    {farmerHistory.farmers.map((farmer) => (
                      <option key={farmer.farmerId} value={farmer.farmerId}>
                        {farmer.name} ({farmer.farmerId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    {t('fromDate')}
                  </label>
                  <input
                    type="date"
                    className="form-control rounded-3"
                    value={ledgerStartDate}
                    onChange={(e) => setLedgerStartDate(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    {t('toDate')}
                  </label>
                  <input
                    type="date"
                    className="form-control rounded-3"
                    min={ledgerStartDate || undefined}
                    value={ledgerEndDate}
                    onChange={(e) => setLedgerEndDate(e.target.value)}
                  />
                </div>

              </div>

              {historyLoading && (
                <div className="alert alert-info">
                  {t('loadingHistory')}
                </div>
              )}

              {historyMessage && (
                <div className="alert alert-danger">
                  {historyMessage}
                </div>
              )}

              {(() => {
                const searchText = farmerSearch.trim().toLowerCase()

                const matchingFarmerIds = farmerHistory.farmers
                  .filter((farmer) =>
                    `${farmer.name} ${farmer.farmerId}`
                      .toLowerCase()
                      .includes(searchText)
                  )
                  .map((farmer) => farmer.farmerId)

                const selectedCollections = farmerHistory.collections.filter((item) => {
                  const matchesSelected =
                    selectedFarmer === 'all' ||
                    item.farmerId === selectedFarmer

                  const matchesSearch =
                    !searchText ||
                    matchingFarmerIds.includes(item.farmerId)

                  const collectionDate = new Date(item.collectionTime)

                  const itemDate = [
                    collectionDate.getFullYear(),
                    String(collectionDate.getMonth() + 1).padStart(2, '0'),
                    String(collectionDate.getDate()).padStart(2, '0'),
                  ].join('-')

                  const matchesStartDate =
                    !ledgerStartDate || itemDate >= ledgerStartDate

                  const matchesEndDate =
                    !ledgerEndDate || itemDate <= ledgerEndDate

                  return (
                    matchesSelected &&
                    matchesSearch &&
                    matchesStartDate &&
                    matchesEndDate
                  )
                })

                const totalLitres = selectedCollections.reduce(
                  (sum, item) => sum + (Number(item.quantity) || 0),
                  0
                )

                const totalPayment = selectedCollections.reduce(
                  (sum, item) => sum + (Number(item.totalPayment) || 0),
                  0
                )

                const averageFat = totalLitres > 0
                  ? selectedCollections.reduce(
                      (sum, item) =>
                        sum +
                        (Number(item.fat) || 0) *
                        (Number(item.quantity) || 0),
                      0
                    ) / totalLitres
                  : 0

                const averageSnf = totalLitres > 0
                  ? selectedCollections.reduce(
                      (sum, item) =>
                        sum +
                        (Number(item.snf) || 0) *
                        (Number(item.quantity) || 0),
                      0
                    ) / totalLitres
                  : 0

                const averageRate =
                  totalLitres > 0 ? totalPayment / totalLitres : 0

                const selectedFarmerData = farmerHistory.farmers.find(
                  (farmer) => farmer.farmerId === selectedFarmer
                )

                return (
                  <>
                    {/* SELECTED FARMER PROFILE */}
                    {selectedFarmerData && (
                      <div className="bg-light border rounded-4 p-3 mb-4">
                        <h6 className="fw-bold text-success mb-3">
                          {t('farmerProfile')}
                        </h6>

                        <div className="row g-3 small">
                          <div className="col-md-3">
                            <span className="text-muted">{t('farmerName')}</span>
                            <div className="fw-bold">
                              {selectedFarmerData.name}
                            </div>
                          </div>

                          <div className="col-md-3">
                            <span className="text-muted">{t('farmerId')}</span>
                            <div className="fw-bold">
                              {selectedFarmerData.farmerId}
                            </div>
                          </div>

                          <div className="col-md-3">
                            <span className="text-muted">{t('village')}</span>
                            <div className="fw-bold">
                              {selectedFarmerData.village || '-'}
                            </div>
                          </div>

                          <div className="col-md-3">
                            <span className="text-muted">{t('animalType')}</span>
                            <div className="fw-bold">
                              {selectedFarmerData.animalType || '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUMMARY CARDS */}
                    <div className="row g-3 mb-4">

                      <div className="col-6 col-lg-3">
                        <div className="p-3 rounded-4 bg-light border h-100">
                          <small className="text-muted">{t('totalEntriesCount')}</small>
                          <h4 className="fw-bold mb-0 text-dark">
                            {selectedCollections.length}
                          </h4>
                        </div>
                      </div>

                      <div className="col-6 col-lg-3">
                        <div className="p-3 rounded-4 bg-light border h-100">
                          <small className="text-muted">{t('totalMilk')}</small>
                          <h4 className="fw-bold mb-0 text-primary">
                            {totalLitres.toFixed(1)} L
                          </h4>
                        </div>
                      </div>

                      <div className="col-6 col-lg-3">
                        <div className="p-3 rounded-4 bg-light border h-100">
                          <small className="text-muted">{t('totalPayment')}</small>
                          <h4 className="fw-bold mb-0 text-success">
                            {formatRupees(totalPayment)}
                          </h4>
                        </div>
                      </div>

                      <div className="col-6 col-lg-3">
                        <div className="p-3 rounded-4 bg-light border h-100">
                          <small className="text-muted">{t('avgRatePerL')}</small>
                          <h4 className="fw-bold mb-0 text-dark">
                            ₹{averageRate.toFixed(2)}
                          </h4>
                        </div>
                      </div>

                    </div>

                    {/* QUALITY SUMMARY */}
                    <div className="row g-3 mb-4">

                      <div className="col-6">
                        <div className="p-3 border rounded-4">
                          <small className="text-muted">{t('avgFat')}</small>
                          <h5 className="fw-bold text-warning mb-0">
                            {averageFat.toFixed(2)}%
                          </h5>
                        </div>
                      </div>

                      <div className="col-6">
                        <div className="p-3 border rounded-4">
                          <small className="text-muted">{t('avgSnf')}</small>
                          <h5 className="fw-bold text-primary mb-0">
                            {averageSnf.toFixed(2)}%
                          </h5>
                        </div>
                      </div>

                    </div>

                    {/* COLLECTION HISTORY TABLE */}
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                      <h6 className="fw-bold mb-0">
                        {t('collectionTransactions')}
                      </h6>
                      <small className="text-muted">
                        {selectedCollections.length} {t('entries')}
                      </small>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-sm table-hover align-middle mb-0">

                        <thead className="table-light small text-muted">
                          <tr>
                            <th>{t('fromDate')}</th>
                            <th>{t('farmerId')}</th>
                            <th>{t('animalType')}</th>
                            <th>{t('litres')}</th>
                            <th>FAT</th>
                            <th>SNF</th>
                            <th>{t('avgRatePerL')}</th>
                            <th>{t('totalPayment')}</th>
                          </tr>
                        </thead>

                        <tbody className="small">
                          {selectedCollections.map((item) => (
                            <tr key={item._id}>
                              <td>
                                {new Date(item.collectionTime).toLocaleString(
                                  'en-IN',
                                  {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  }
                                )}
                              </td>

                              <td className="fw-bold text-success">
                                {item.farmerId}
                              </td>

                              <td>{item.animalType || '-'}</td>

                              <td>
                                {Number(item.quantity || 0).toFixed(1)} L
                              </td>

                              <td>{Number(item.fat || 0)}%</td>

                              <td>{Number(item.snf || 0)}%</td>

                              <td>
                                ₹{Number(item.ratePerLitre || 0).toFixed(2)}
                              </td>

                              <td className="fw-bold text-dark">
                                {formatRupees(item.totalPayment)}
                              </td>
                            </tr>
                          ))}

                          {selectedCollections.length === 0 && (
                            <tr>
                              <td colSpan="8" className="text-center py-4 text-muted">
                                {t('noCollectionRecords')}
                              </td>
                            </tr>
                          )}
                        </tbody>

                      </table>
                    </div>
                  </>
                )
              })()}

            </div>
          )}

          {/* TAB 3: PEND MANAGEMENT */}
          {activeTab === 'pend' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h5 className="fw-bold mb-3 text-dark">{t('pendStockMgmt')}</h5>

              <div className="row g-4">
                <div className="col-lg-6">
                  <form onSubmit={handlePendPurchase} className="bg-light p-3 rounded-4 mb-3 border">
                    <h6 className="fw-semibold small text-muted mb-2">{t('purchasePendStock')}</h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <input type="text" className="form-control form-control-sm" placeholder={t('pendName')} value={pendName} onChange={(e) => setPendName(e.target.value)} required />
                      </div>
                      <div className="col-6">
                        <input type="number" className="form-control form-control-sm" placeholder={t('quantityBags')} value={purchaseBags} onChange={(e) => setPurchaseBags(e.target.value)} required />
                      </div>
                      <div className="col-6">
                        <input type="number" className="form-control form-control-sm" placeholder={t('pricePerBag')} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required />
                      </div>
                      <div className="col-6">
                        <button type="submit" className="btn btn-success btn-sm w-100 fw-semibold">{t('savePurchase')}</button>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="col-lg-6">
                  <form onSubmit={handlePendSale} className="bg-light p-3 rounded-4 mb-3 border">
                    <h6 className="fw-semibold small text-muted mb-2">{t('sellPendToFarmer')}</h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <select className="form-select form-select-sm" value={saleFarmerId} onChange={(e) => setSaleFarmerId(e.target.value)} required>
                          <option value="">{t('selectFarmer')}</option>
                          {farmerHistory.farmers.map((f) => (
                            <option key={f.farmerId} value={f.farmerId}>{f.name} ({f.farmerId})</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-6">
                        <select className="form-select form-select-sm" value={salePendName} onChange={(e) => setSalePendName(e.target.value)} required>
                          <option value="">{t('selectPend')}</option>
                          {pendStock.map((p) => (
                            <option key={p.pendName} value={p.pendName}>{p.pendName} ({p.remainingBags} left)</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-4">
                        <input type="number" className="form-control form-control-sm" placeholder={t('bags')} value={saleBags} onChange={(e) => setSaleBags(e.target.value)} required />
                      </div>
                      <div className="col-4">
                        <input type="number" className="form-control form-control-sm" placeholder={t('rate')} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required />
                      </div>
                      <div className="col-4">
                        <button type="submit" className="btn btn-primary btn-sm w-100 fw-semibold">{t('sellPend')}</button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {pendMessage && <div className="alert alert-info py-2 small mb-3">{pendMessage}</div>}

              <h6 className="fw-semibold small text-muted mb-2">{t('availablePendStock')}</h6>
              <div className="table-responsive">
                <table className="table table-sm table-borderless align-middle mb-0">
                  <thead className="table-light small text-muted">
                    <tr><th>{t('product')}</th><th>{t('in')}</th><th>{t('sold')}</th><th>{t('stock')}</th></tr>
                  </thead>
                  <tbody>
                    {pendStock.map((item, idx) => (
                      <tr key={idx} className="small border-bottom">
                        <td className="fw-semibold">{item.pendName}</td>
                        <td>{item.purchasedBags}</td>
                        <td>{item.soldBags}</td>
                        <td className="fw-bold text-success">{item.remainingBags} {t('bags')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LOAN MANAGEMENT */}
          {activeTab === 'loans' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h5 className="fw-bold mb-3 text-dark">{t('loanAccounts')}</h5>

              <form onSubmit={handleGiveLoan} className="bg-light p-3 rounded-4 mb-4 border" style={{ maxWidth: '700px' }}>
                <h6 className="fw-semibold small text-muted mb-2">{t('issueNewLoan')}</h6>
                <div className="row g-2">
                  <div className="col-md-6">
                    <select className="form-select form-select-sm" value={loanFarmerId} onChange={(e) => setLoanFarmerId(e.target.value)} required>
                      <option value="">{t('selectFarmer')}</option>
                      {farmerHistory.farmers.map((f) => (
                        <option key={f.farmerId} value={f.farmerId}>{f.name} ({f.farmerId})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <input type="number" className="form-control form-control-sm" placeholder={t('loanAmount')} value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} required />
                  </div>
                  <div className="col-md-8">
                    <input type="text" className="form-control form-control-sm" placeholder={t('notesOptional')} value={loanNotes} onChange={(e) => setLoanNotes(e.target.value)} />
                  </div>
                  <div className="col-md-4">
                    <button type="submit" className="btn btn-warning btn-sm w-100 fw-semibold" disabled={loanLoading}>
                      {loanLoading ? t('saving') : t('grantLoan')}
                    </button>
                  </div>
                </div>
              </form>

              {loanMessage && <div className="alert alert-info py-2 small mb-3">{loanMessage}</div>}

              <h6 className="fw-semibold small text-muted mb-2">{t('activeLoanLedgers')}</h6>
              <div className="table-responsive">
                <table className="table table-sm table-borderless align-middle mb-0">
                  <thead className="table-light small text-muted">
                    <tr><th>{t('farmerId')}</th><th>{t('fromDate')}</th><th>{t('initialAmount')}</th><th>{t('outstandingBalance')}</th><th>{t('notesOptional')}</th></tr>
                  </thead>
                  <tbody>
                    {loanHistory.map((l) => (
                      <tr key={l._id} className="small border-bottom">
                        <td className="fw-semibold">{l.farmerId}</td>
                        <td>{new Date(l.loanDate).toLocaleDateString('en-IN')}</td>
                        <td>₹{Number(l.loanAmount).toFixed(2)}</td>
                        <td className="fw-bold text-danger">₹{Number(l.remainingBalance).toFixed(2)}</td>
                        <td>{l.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: MANUAL RATE CHART COMPONENT */}
          {activeTab === 'rates' && <ManualRateChart />}

          {/* TAB 6: BONUS MANAGEMENT */}
          {activeTab === 'bonus' && (
            <BonusManagement farmers={farmerHistory.farmers} />
          )}

          {/* TAB 7: PAYMENT MANAGEMENT */}
          {activeTab === 'payments' && (
            <PaymentManagement />
          )}

          {/* TAB 8: DISPUTE MANAGEMENT */}
          {activeTab === 'disputes' && (
            <DisputeManagement />
          )}

        </div>
      </div>
    </div>
  )
}

export default DairyDashboard