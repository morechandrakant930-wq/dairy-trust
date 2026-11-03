import { useNavigate, useLocation } from 'react-router-dom';
import './AdminSidebar.css';

const menuItems = [
  { icon: '▦', label: 'Overview', path: '/admin-dashboard' },
  { icon: '🏢', label: 'Dairy Management', path: '/admin-dairies' },
  { icon: '👨‍🌾', label: 'Farmer Management', path: '/admin-farmers' },
  { icon: '🥛', label: 'Milk Collection', path: '/admin-collections' },
  { icon: '₹', label: 'Payments & Reports', path: '/admin-reports' },
  { icon: '⚙', label: 'Settings', path: '/admin-settings' },
];

function AdminSidebar({ sidebarOpen, setSidebarOpen, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation(); // वर्तमान पेजचा path तपासण्यासाठी

  const handleNavigation = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>

        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon">🥛</div>

          <div>
            <strong>Dairy Trust</strong>
            <small>ADMIN CONSOLE</small>
          </div>
        </div>

        <div className="admin-menu-label">
          WORKSPACE
        </div>

        <nav className="admin-menu">
          {menuItems.map((item) => {
            // सध्याचा path आणि मेनूचा path जुळत असल्यास active क्लास द्या
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.label}
                className={`admin-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span>{item.icon}</span>

                {item.label}

                {isActive && <i>●</i>}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">

          <div className="admin-secure-note">
            <span>🔒</span>

            <div>
              <strong>Secure Workspace</strong>
              <small>Administrator access</small>
            </div>
          </div>

          <button
            className="admin-logout"
            onClick={onLogout}
          >
            ↪ Sign Out
          </button>

        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;