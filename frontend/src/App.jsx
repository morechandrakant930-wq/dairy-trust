import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

import FarmerLogin from './pages/FarmerLogin'
import FarmerDashboard from './pages/FarmerDashboard'
import RaiseDispute from './pages/RaiseDispute'
import DisputeHistory from './pages/DisputeHistory'
import DairyRegister from './pages/DairyRegister'
import FarmerRegistration from './pages/FarmerRegistration'
import MilkCollection from './pages/MilkCollection'
import ChangePassword from './pages/ChangePassword'
import DairyDashboard from './pages/DairyDashboard'
import ManageMilkRates from './pages/ManageMilkRates'
import MilkReports from './pages/MilkReports'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import DairyAIAssistant from './components/DairyAIAssistant'
import AdminDairies from './pages/AdminDairies'
import AdminFarmers from './pages/AdminFarmers'
import AdminCollections from './pages/AdminCollections'
import AdminPayments from './pages/AdminPayments'
import AdminSettings from './pages/AdminSettings'

import {
  LanguageProvider,
  LanguageSelector,
  useLanguage
} from './language/LanguageContext'

import './App.css'

// HOME PAGE
function Home() {
  const { t } = useLanguage()

  const basicFeatures = [
    'Farmer Registration & Management',
    'Daily Milk Collection Records',
    'Milk Rate Management',
    'Digital Farmer Passbook',
    'Payment History & Tracking',
    'PDF Payment Receipts',
    'Pending Payment Alerts',
    'Pend & Loan Management',
    'Milk Reports & Analytics',
    'Dispute Management'
  ]

  const futurePlans = [
    {
      name: 'Standard',
      price: '499',
      label: 'AI POWERED',
      description: 'Intelligent dairy management with Artificial Intelligence.',
      features: [
        'AI Milk Production Prediction',
        'AI-Based Data Analytics',
        'Smart Dairy Recommendations',
        'Automated Business Insights'
      ],
      icon: '🤖'
    },
    {
      name: 'Premium',
      price: '999',
      label: 'IOT POWERED',
      description: 'Smart dairy operations using IoT devices and sensors.',
      features: [
        'IoT-Based Milk Measurement',
        'Smart Milk Quality Sensors',
        'Automatic Data Collection',
        'Real-Time Dairy Monitoring'
      ],
      icon: '📡'
    }
  ]

  return (
    <div className="home-page">

      {/* NAVBAR */}
      <nav className="home-navbar">
        <div className="home-nav-inner">

          <Link to="/" className="home-brand">
            <span className="home-brand-icon">🥛</span>
            <span>Dairy <strong>Trust</strong></span>
          </Link>

          <div className="home-nav-actions">
            <LanguageSelector />

            <Link to="/farmer-login" className="home-login-btn">
              Login Portal <span>→</span>
            </Link>
          </div>

        </div>
      </nav>

      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-content">

          <div className="home-eyebrow">
            <span className="home-status-dot"></span>
            SMART DAIRY MANAGEMENT PLATFORM
          </div>

          <h1>
            {t('title')}
            <span>{t('subtitle')}</span>
          </h1>

          <p className="home-hero-description">
            {t('description')}
          </p>

          <div className="home-hero-actions">
            <Link to="/farmer-login" className="home-primary-btn">
              <span>🔑</span> Owner & Farmer Login
            </Link>

            <a href="#plans" className="home-secondary-btn">
              Explore Our Plans <span>↓</span>
            </a>
          </div>

          <div className="home-trust-line">
            <span>✓</span> Transparent Records
            <span>✓</span> Secure Payments
            <span>✓</span> Digital Management
          </div>

        </div>
      </section>

      {/* CURRENT PROJECT */}
      <section className="home-plans-section" id="plans">

        <div className="home-section-heading">
          <span className="home-section-label">OUR PLATFORM</span>
          <h2>One Platform. Smarter Dairy Management.</h2>
          <p>
            Explore our current solution and upcoming technology roadmap.
          </p>
        </div>

        <div className="home-plan-grid">

          {/* BASIC PLAN */}
          <div className="home-plan-card home-basic-card">

            <div className="home-plan-top">
              <div>
                <span className="home-plan-label">CURRENT PROJECT</span>
                <h3>Basic</h3>
                <p>Complete Dairy Management Solution</p>
              </div>

              <div className="home-plan-icon">🥛</div>
            </div>

            <div className="home-available">
              <span>●</span> AVAILABLE NOW
            </div>

            <div className="home-price">
              <strong>₹299</strong>
              <span>/ month</span>
            </div>

            <div className="home-basic-description">
              Everything required to manage daily dairy operations digitally.
            </div>

            <div className="home-feature-heading">
              INCLUDED FEATURES
            </div>

            <ul className="home-feature-list">
              {basicFeatures.map((feature) => (
                <li key={feature}>
                  <span>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              to="/dairy-register?plan=basic"
              className="home-plan-button home-basic-button"
            >
              Register Your Dairy <span>→</span>
            </Link>

          </div>

          {/* FUTURE SCOPE */}
          {futurePlans.map((plan) => (

            <div className="home-plan-card home-future-card" key={plan.name}>

              <div className="home-plan-top">
                <div>
                  <span className="home-plan-label">FUTURE ROADMAP</span>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </div>

                <div className="home-plan-icon">
                  {plan.icon}
                </div>
              </div>

              <div className="home-coming-soon">
                <span>◷</span> COMING SOON
              </div>

              <div className="home-price home-future-price">
                <strong>₹{plan.price}</strong>
                <span>/ month (Planned)</span>
              </div>

              <div className="home-feature-heading">
                PLANNED FEATURES
              </div>

              <ul className="home-feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span>✦</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="home-plan-button home-future-button"
                disabled
              >
                Planned for Future
              </button>

            </div>

          ))}

        </div>
      </section>

      {/* FUTURE TECHNOLOGY */}
      <section className="home-vision-section">
        <div className="home-vision-content">
          <span className="home-section-label">OUR VISION</span>
          <h2>Building the Future of Dairy Management</h2>
          <p>
            Dairy Trust aims to grow from a digital dairy management platform
            into an intelligent ecosystem powered by AI and IoT technology.
          </p>

          <div className="home-vision-points">
            <div>
              <span>🤖</span>
              <strong>Artificial Intelligence</strong>
              <small>Smarter decisions through data and predictions.</small>
            </div>

            <div>
              <span>📡</span>
              <strong>Internet of Things</strong>
              <small>Connected devices for automated dairy operations.</small>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="home-footer-brand">
          🥛 Dairy <strong>Trust</strong>
        </div>

        <p>
          Smart Dairy Management • Transparent Milk • Trusted Payments
        </p>

        <small>© {new Date().getFullYear()} Dairy Trust. All rights reserved.</small>
      </footer>

    </div>
  )
}

// MAIN APP
function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/farmer-login" element={<FarmerLogin />} />
          <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
          <Route path="/raise-dispute" element={<RaiseDispute />} />
          <Route path="/dispute-history" element={<DisputeHistory />} />
          <Route path="/dairy-register" element={<DairyRegister />} />
          <Route path="/farmer-registration" element={<FarmerRegistration />} />
          <Route path="/milk-collection" element={<MilkCollection />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/dairy-dashboard" element={<DairyDashboard />} />
          <Route path="/manage-milk-rates" element={<ManageMilkRates />} />
          <Route path="/milk-reports" element={<MilkReports />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-dairies" element={<AdminDairies />} />
          <Route path="/admin-farmers" element={<AdminFarmers />} />
          <Route path="/admin-collections" element={<AdminCollections />} />
          <Route path="/admin-reports" element={<AdminPayments />} />
          <Route path="/admin-settings" element={<AdminSettings />} />
        </Routes>

        <DairyAIAssistant />
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App