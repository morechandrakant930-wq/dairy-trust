
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Milk,
  ChartNoAxesCombined,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Menu,
  X,
  LogOut,
  Settings,
  Clock3,
  ChevronRight,
  LockKeyhole,
} from 'lucide-react';

import AdminSidebar from '../components/AdminSidebar';
import './AdminDashboard.css';

const API = 'http://localhost:5000/api/admin/dashboard';

function AdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      const token = localStorage.getItem('dairyToken');

      if (!token) {
        navigate('/admin-login', { replace: true });
        return;
      }

      try {
        const response = await fetch(API, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Access denied');
        }

        const user = JSON.parse(
          localStorage.getItem('dairyUser') || '{}'
        );

        if (user.role !== 'admin') {
          throw new Error('Admin access only.');
        }

        setAdmin(user);
      } catch (err) {
        localStorage.removeItem('dairyToken');
        localStorage.removeItem('dairyUser');
        setError(err.message);
        navigate('/admin-login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('dairyToken');
    localStorage.removeItem('dairyUser');
    navigate('/admin-login', { replace: true });
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const firstName = (admin.name || 'Administrator').split(' ')[0];
  const initial = (admin.name || 'A').charAt(0).toUpperCase();

  const managementCards = [
    {
      title: 'Dairy Management',
      description: 'View and manage all registered dairy accounts.',
      category: 'ORGANIZATION',
      icon: Building2,
      className: 'dairy',
      path: '/admin-dairies',
      action: 'Explore dairies',
    },
    {
      title: 'Farmer Management',
      description: 'Access farmer profiles and registration records.',
      category: 'COMMUNITY',
      icon: Users,
      className: 'farmers',
      path: '/admin-farmers',
      action: 'Explore farmers',
    },
    {
      title: 'Milk Collections',
      description: 'Monitor collection records across the platform.',
      category: 'OPERATIONS',
      icon: Milk,
      className: 'collections',
      path: '/admin-collections',
      action: 'View collections',
    },
    {
      title: 'Payments & Reports',
      description: 'Review payment records and platform summaries.',
      category: 'FINANCE',
      icon: ChartNoAxesCombined,
      className: 'reports',
      path: '/admin-reports',
      action: 'View reports',
    },
  ];

  const quickActions = [
    {
      label: 'Dairy Management',
      detail: 'Manage registered dairies',
      icon: Building2,
      path: '/admin-dairies',
    },
    {
      label: 'Farmer Management',
      detail: 'Explore farmer records',
      icon: Users,
      path: '/admin-farmers',
    },
    {
      label: 'Milk Collections',
      detail: 'Review collection activity',
      icon: Milk,
      path: '/admin-collections',
    },
    {
      label: 'Payments & Reports',
      detail: 'Review financial records',
      icon: ChartNoAxesCombined,
      path: '/admin-reports',
    },
  ];

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <p>Preparing your workspace...</p>
      </div>
    );
  }

  if (error) return null;

  return (
    <div className="admin-layout">
      {sidebarOpen && (
        <button
          className="admin-sidebar-overlay"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={logout}
      />

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
            </button>

            <div>
              <div className="admin-breadcrumb">
                WORKSPACE <ChevronRight size={12} /> OVERVIEW
              </div>
              <h2>Dashboard</h2>
            </div>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-date">
              <Clock3 size={15} />
              <span>{today}</span>
            </div>

            <div className="admin-profile">
              <div className="admin-profile-avatar">{initial}</div>
              <div className="admin-profile-info">
                <strong>{admin.name || 'Administrator'}</strong>
                <small>System Administrator</small>
              </div>
            </div>
          </div>
        </header>

        <section className="admin-content">
          <div className="admin-welcome">
            <div className="admin-welcome-content">
              <span className="admin-welcome-label">
                <span className="admin-welcome-dot" />
                ADMINISTRATOR WORKSPACE
              </span>

              <h1>
                Good to see you, {firstName}.
              </h1>

              <p>
                Manage your Dairy Trust ecosystem with clarity.
                Your platform management workspace is ready.
              </p>

              <button
                className="admin-welcome-button"
                onClick={() => navigate('/admin-dairies')}
              >
                Explore platform
                <ArrowUpRight size={17} />
              </button>
            </div>

            <div className="admin-welcome-art">
              <div className="admin-art-circle circle-one" />
              <div className="admin-art-circle circle-two" />
              <div className="admin-art-icon">
                <LayoutDashboard size={57} strokeWidth={1.3} />
              </div>
              <div className="admin-art-tag">
                <Activity size={15} />
                Management Hub
              </div>
            </div>
          </div>

          <div className="admin-overview-heading">
            <div>
              <span className="admin-section-eyebrow">YOUR PLATFORM</span>
              <h3>Management overview</h3>
              <p>Everything you need, organized in one place.</p>
            </div>

            <div className="admin-connection">
              <span />
              Connected
            </div>
          </div>

          <div className="admin-stat-grid">
            {managementCards.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  type="button"
                  key={card.title}
                  className={`admin-stat-card ${card.className}`}
                  onClick={() => navigate(card.path)}
                >
                  <div className="admin-card-top">
                    <div className="admin-stat-icon">
                      <Icon size={22} strokeWidth={1.8} />
                    </div>
                    <ArrowUpRight
                      className="admin-card-arrow"
                      size={19}
                    />
                  </div>

                  <span className="admin-card-category">
                    {card.category}
                  </span>

                  <h3>{card.title}</h3>
                  <p>{card.description}</p>

                  <span className="admin-card-link">
                    {card.action}
                    <ChevronRight size={15} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="admin-bottom-grid">
            <section className="admin-panel admin-actions-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-section-eyebrow">
                    QUICK NAVIGATION
                  </span>
                  <h3>Frequently used areas</h3>
                  <p>Jump directly to a management section.</p>
                </div>
              </div>

              <div className="admin-quick-actions">
                {quickActions.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                    >
                      <span className="admin-quick-icon">
                        <Icon size={19} />
                      </span>

                      <span className="admin-quick-text">
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>

                      <ChevronRight
                        className="admin-quick-arrow"
                        size={18}
                      />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="admin-panel admin-account-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-section-eyebrow">
                    YOUR ACCOUNT
                  </span>
                  <h3>Administrator profile</h3>
                  <p>Account and security information.</p>
                </div>
                <Settings size={19} className="admin-panel-setting-icon" />
              </div>

              <div className="admin-account-details">
                <div className="admin-account-avatar">{initial}</div>

                <h3>{admin.name || 'Administrator'}</h3>
                <p>{admin.email || 'Email not available'}</p>

                <span className="admin-role-badge">
                  <ShieldCheck size={14} />
                  Verified admin session
                </span>
              </div>

              <div className="admin-account-security">
                <div>
                  <LockKeyhole size={17} />
                  <span>Account security</span>
                </div>
                <span className="admin-security-status">Protected</span>
              </div>

              <button
                className="admin-account-logout"
                onClick={logout}
              >
                <LogOut size={16} />
                Sign out of account
              </button>
            </section>
          </div>

          <footer className="admin-footer">
            <span>
              <strong>Dairy Trust</strong> · Administration Workspace
            </span>
            <span>© {new Date().getFullYear()} Dairy Trust</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
