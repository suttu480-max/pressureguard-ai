import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Users, AlertTriangle, Activity, TrendingUp,
  Plus, ArrowUpRight, Clock, ChevronRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

const RISK_COLORS = {
  critical: '#c0392b', high: '#d4731a',
  moderate: '#c9944a', low: '#3a8a6e'
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { canEdit } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [s, t, p, a] = await Promise.all([
        api.getDashboardStats(),
        api.getRiskTrends(7),
        api.getRecentPatients(5),
        api.getRecentAlerts(5)
      ]);
      setStats(s);
      setTrends(t);
      setRecentPatients(p);
      setRecentAlerts(a);
    } catch (err) {
      console.error('Dashboard load error:', err);
      // Set default empty values
      setStats({
        total_patients: 0, critical_count: 0, high_risk_count: 0,
        moderate_count: 0, low_risk_count: 0, active_alerts: 0, assessments_today: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  const pieData = stats ? [
    { name: 'Critical', value: stats.critical_count, color: RISK_COLORS.critical },
    { name: 'High', value: stats.high_risk_count, color: RISK_COLORS.high },
    { name: 'Moderate', value: stats.moderate_count, color: RISK_COLORS.moderate },
    { name: 'Low', value: stats.low_risk_count, color: RISK_COLORS.low },
  ].filter(d => d.value > 0) : [];

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="animate-in">
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-blue)' }}>
          <div className="stat-icon blue"><Users size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Patients</div>
            <div className="stat-value">{stats?.total_patients || 0}</div>
            <div className="stat-change positive">
              <Activity size={12} /> Active monitoring
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-red)' }}>
          <div className="stat-icon red"><AlertTriangle size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Critical Risk</div>
            <div className="stat-value" style={{ color: 'var(--risk-critical)' }}>
              {stats?.critical_count || 0}
            </div>
            <div className="stat-change negative">
              Immediate attention needed
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-amber)' }}>
          <div className="stat-icon amber"><TrendingUp size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Active Alerts</div>
            <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
              {stats?.active_alerts || 0}
            </div>
            <div className="stat-change">
              Pending acknowledgment
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-emerald)' }}>
          <div className="stat-icon emerald"><Activity size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Assessments Today</div>
            <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
              {stats?.assessments_today || 0}
            </div>
            <div className="stat-change positive">
              <Clock size={12} /> Updated live
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {canEdit() && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-primary" onClick={() => navigate('/add-patient')}>
            <Plus size={16} /> Add Patient
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/risk-assessment')}>
            <Activity size={16} /> New Assessment
          </button>
        </div>
      )}

      {/* Charts + Lists */}
      <div className="dashboard-grid">
        {/* Risk Trend Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Risk Trends</div>
              <div className="card-subtitle">Last 7 days assessment overview</div>
            </div>
          </div>
          <div style={{ height: 260 }}>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c0392b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#c0392b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4731a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d4731a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3a8a6e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3a8a6e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd0c1" />
                  <XAxis dataKey="date" stroke="#8da5a8" fontSize={11}
                    tickFormatter={v => v.slice(5)} />
                  <YAxis stroke="#8da5a8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff', border: '1px solid #ddd0c1',
                      borderRadius: 8, fontSize: 12, color: '#1e3a3d'
                    }}
                  />
                  <Area type="monotone" dataKey="critical" stroke="#c0392b"
                    fill="url(#critGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="high" stroke="#d4731a"
                    fill="url(#highGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="low" stroke="#3a8a6e"
                    fill="url(#lowGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>No trend data yet. Add patients and run assessments to see trends.</p>
              </div>
            )}
          </div>
        </div>

        {/* Risk Distribution Pie */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Risk Distribution</div>
              <div className="card-subtitle">Current patient risk levels</div>
            </div>
          </div>
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={4} dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff', border: '1px solid #ddd0c1',
                      borderRadius: 8, fontSize: 12, color: '#1e3a3d'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>No patients yet</p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {[
              { label: 'Critical', color: RISK_COLORS.critical, count: stats?.critical_count },
              { label: 'High', color: RISK_COLORS.high, count: stats?.high_risk_count },
              { label: 'Moderate', color: RISK_COLORS.moderate, count: stats?.moderate_count },
              { label: 'Low', color: RISK_COLORS.low, count: stats?.low_risk_count },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{item.count || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Patients</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patients')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          {recentPatients.length > 0 ? (
            <div>
              {recentPatients.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0', borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="patient-avatar" style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6aa6aa, #2c5e63)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 600, fontSize: 13, color: '#fdfdf9'
                    }}>
                      {p.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Ward {p.ward} • Bed {p.bed_number}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`risk-badge ${p.risk_level}`}>
                      <span className={`risk-dot ${p.risk_level}`} />
                      {p.risk_level}
                    </span>
                    <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No patients added yet</p>
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Alerts</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          {recentAlerts.length > 0 ? (
            <div>
              {recentAlerts.map(a => (
                <div key={a.id} className={`alert-item ${a.severity}`}
                  style={{ marginBottom: 8 }}>
                  <div className="alert-content">
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-message" style={{
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: 320
                    }}>
                      {a.message}
                    </div>
                    <div className="alert-time">{formatTime(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No alerts yet — looking good! 🎉</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
