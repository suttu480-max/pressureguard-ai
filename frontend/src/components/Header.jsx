import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, Menu } from 'lucide-react';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/patients': 'Patient Management',
  '/add-patient': 'Add New Patient',
  '/risk-assessment': 'Risk Assessment',
  '/alerts': 'Smart Alerts',
  '/profile': 'My Profile',
};

export default function Header({ alertCount = 0, onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();

  const title = PAGE_TITLES[location.pathname] || 'PressureGuard AI';

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-btn mobile-menu" onClick={onMenuToggle}
          style={{ display: 'none' }}>
          <Menu size={18} />
        </button>
        <div>
          <h2>{title}</h2>
          <span className="breadcrumb">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div className="header-right">
        <div className="search-bar">
          <Search className="search-icon" size={16} />
          <input type="text" placeholder="Search patients, alerts..." />
        </div>

        <button className="header-btn" onClick={() => navigate('/alerts')}>
          <Bell size={18} />
          {alertCount > 0 && <span className="notification-dot" />}
        </button>
      </div>
    </header>
  );
}
