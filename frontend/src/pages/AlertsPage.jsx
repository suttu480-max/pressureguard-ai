import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell, Check, AlertTriangle, AlertOctagon,
  Info, Clock, Filter, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const SEVERITY_CONFIG = {
  critical: { icon: AlertOctagon, color: '#c0392b', bg: 'rgba(192,57,43,0.10)' },
  high: { icon: AlertTriangle, color: '#d4731a', bg: 'rgba(212,115,26,0.10)' },
  medium: { icon: Bell, color: '#c9944a', bg: 'rgba(201,148,74,0.10)' },
  low: { icon: Info, color: '#3a8a6e', bg: 'rgba(58,138,110,0.10)' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unacknowledged, acknowledged
  const { canEdit } = useAuth();

  useEffect(() => {
    triggerSchedulerAndLoad();
  }, [filter]);

  const triggerSchedulerAndLoad = async () => {
    setLoading(true);
    try {
      // Trigger the backend scheduler to generate any overdue time-based alerts
      await api.checkScheduledAlerts().catch(() => {});
    } catch {
      // Silently ignore scheduler errors
    }
    await loadAlerts();
  };

  const loadAlerts = async () => {
    try {
      const params = {};
      if (filter === 'unacknowledged') params.is_acknowledged = false;
      if (filter === 'acknowledged') params.is_acknowledged = true;
      const data = await api.getAlerts(params);
      setAlerts(data);
    } catch (err) {
      console.error(err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      toast.success('Alert acknowledged');
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, is_acknowledged: true } : a
      ));
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const unackCount = alerts.filter(a => !a.is_acknowledged).length;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Smart Alerts</h1>
          <p>{unackCount} unacknowledged alert{unackCount !== 1 ? 's' : ''} • {alerts.length} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'unacknowledged', label: `Active (${unackCount})` },
          { key: 'acknowledged', label: 'Acknowledged' },
        ].map(t => (
          <button key={t.key} className={`tab ${filter === t.key ? 'active' : ''}`}
            onClick={() => setFilter(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : alerts.length > 0 ? (
        <div>
          {alerts.map(alert => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`alert-item ${alert.severity}`}
                style={{ opacity: alert.is_acknowledged ? 0.6 : 1 }}
              >
                <div className="alert-icon" style={{ background: config.bg }}>
                  <Icon size={20} style={{ color: config.color }} />
                </div>

                <div className="alert-content" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div className="alert-title">{alert.title}</div>
                    {alert.is_acknowledged && (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(58,138,110,0.12)', color: '#3a8a6e',
                        fontWeight: 600
                      }}>
                        ✓ Acknowledged
                      </span>
                    )}
                  </div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={12} />
                    {formatTime(alert.created_at)}
                    {alert.patient_name && (
                      <span> • Patient: <strong>{alert.patient_name}</strong></span>
                    )}
                  </div>
                </div>

                <div className="alert-actions">
                  {!alert.is_acknowledged && canEdit() && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      <Check size={14} /> Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>No alerts found</h3>
            <p>
              {filter === 'unacknowledged'
                ? 'All alerts have been acknowledged. Great job!'
                : 'No alerts have been generated yet. They appear when patients have high risk scores.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
