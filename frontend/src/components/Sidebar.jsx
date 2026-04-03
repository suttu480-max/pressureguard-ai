import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, UserPlus, Bell, Activity,
  User, LogOut, ShieldCheck
} from 'lucide-react';

export default function Sidebar({ alertCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout, canEdit } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Patients', path: '/patients' },
    ...(canEdit() ? [{ icon: UserPlus, label: 'Add Patient', path: '/add-patient' }] : []),
    { icon: Activity, label: 'Risk Assessment', path: '/risk-assessment' },
    { icon: Bell, label: 'Alerts', path: '/alerts', badge: alertCount },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <ShieldCheck size={22} color="white" />
        </div>
        <div>
          <h1>PressureGuard</h1>
          <span className="subtitle">AI Risk System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-title">Main Menu</span>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.badge > 0 && <span className="badge">{item.badge}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate('/profile')}>
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{profile?.full_name || 'User'}</div>
            <div className="user-role">{profile?.role || 'Caregiver'}</div>
          </div>
        </div>
        <button className="nav-item" onClick={handleLogout} style={{ marginTop: 8 }}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
