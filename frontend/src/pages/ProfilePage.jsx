import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Shield, LogOut, Calendar, Clock
} from 'lucide-react';

export default function ProfilePage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    doctor: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
    nurse: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
    caregiver: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: 'rgba(139,92,246,0.25)' },
  };

  const rc = roleColors[profile?.role] || roleColors.caregiver;
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <div className="animate-in" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Account information and settings</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 700, color: 'white',
          margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(59,130,246,0.3)'
        }}>
          {initials}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          {profile?.full_name || 'User'}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <Mail size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {profile?.email || 'No email'}
          </span>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 20px', borderRadius: 20,
          background: rc.bg, border: `1px solid ${rc.border}`,
          color: rc.color, fontWeight: 600, fontSize: 13,
          textTransform: 'capitalize'
        }}>
          <Shield size={14} />
          {profile?.role || 'Caregiver'}
        </div>
      </div>

      {/* Details */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 20 }}>Account Details</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={18} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Full Name</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{profile?.full_name || '—'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'rgba(16,185,129,0.12)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Mail size={18} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Email</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{profile?.email || '—'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Role</div>
              <div style={{ fontSize: 15, fontWeight: 500, textTransform: 'capitalize' }}>
                {profile?.role || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Your Permissions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'View Dashboard', allowed: true },
            { label: 'View Patients', allowed: true },
            { label: 'Add/Edit Patients', allowed: profile?.role !== 'caregiver' },
            { label: 'Delete Patients', allowed: profile?.role !== 'caregiver' },
            { label: 'Run Risk Assessments', allowed: profile?.role !== 'caregiver' },
            { label: 'Acknowledge Alerts', allowed: profile?.role !== 'caregiver' },
          ].map((perm, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{perm.label}</span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                padding: '3px 10px', borderRadius: 12,
                background: perm.allowed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: perm.allowed ? '#10b981' : '#ef4444'
              }}>
                {perm.allowed ? '✓ Allowed' : '✗ Restricted'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button className="btn btn-danger" onClick={handleLogout}
        style={{ width: '100%', padding: 14 }}>
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
