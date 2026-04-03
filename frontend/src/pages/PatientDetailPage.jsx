import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, User, MapPin, Calendar, Stethoscope,
  Activity, AlertTriangle, TrendingUp, Clock, Trash2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';

const RISK_COLORS = {
  critical: '#ef4444', high: '#f97316',
  moderate: '#f59e0b', low: '#10b981'
};

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    try {
      const [p, h] = await Promise.all([
        api.getPatient(id),
        api.getRiskHistory(id)
      ]);
      setPatient(p);
      setHistory(h);
    } catch (err) {
      toast.error('Failed to load patient');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deletePatient(id);
      toast.success('Patient deleted');
      navigate('/patients');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!patient) return null;

  const riskColor = RISK_COLORS[patient.risk_level] || RISK_COLORS.low;

  const historyChart = [...history].reverse().map(h => ({
    date: h.assessed_at ? new Date(h.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    score: h.risk_score
  }));

  const subscales = [
    { label: 'Sensory', value: patient.sensory_score, max: 4 },
    { label: 'Moisture', value: patient.moisture_score, max: 4 },
    { label: 'Activity', value: patient.activity_score, max: 4 },
    { label: 'Mobility', value: patient.mobility_score, max: 4 },
    { label: 'Nutrition', value: patient.nutrition_score, max: 4 },
    { label: 'Friction', value: patient.friction_score, max: 3 },
  ];

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/patients')}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `linear-gradient(135deg, ${riskColor}44, ${riskColor}22)`,
              border: `2px solid ${riskColor}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 20, color: riskColor
            }}>
              {patient.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1>{patient.name}</h1>
              <p>
                {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1)} • {patient.age} years
                {patient.diagnosis && ` • ${patient.diagnosis}`}
              </p>
            </div>
          </div>
        </div>
        {canEdit() && (
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>

      {/* Info cards row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card" style={{ '--stat-accent': riskColor }}>
          <div className="stat-icon" style={{ background: `${riskColor}20`, color: riskColor }}>
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Risk Score</div>
            <div className="stat-value" style={{ color: riskColor }}>
              {patient.overall_risk_score}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/23</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue"><AlertTriangle size={20} /></div>
          <div className="stat-info">
            <div className="stat-label">Risk Level</div>
            <span className={`risk-badge ${patient.risk_level}`} style={{ marginTop: 4 }}>
              <span className={`risk-dot ${patient.risk_level}`} />
              {patient.risk_level}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emerald"><MapPin size={20} /></div>
          <div className="stat-info">
            <div className="stat-label">Location</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Ward {patient.ward}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bed {patient.bed_number}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber"><Calendar size={20} /></div>
          <div className="stat-info">
            <div className="stat-label">Admitted</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Risk History Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Risk Trend</div>
              <div className="card-subtitle">Braden Score over time</div>
            </div>
          </div>
          <div style={{ height: 240 }}>
            {historyChart.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="date" stroke="#484f58" fontSize={11} />
                  <YAxis domain={[6, 23]} stroke="#484f58" fontSize={11} />
                  <Tooltip contentStyle={{
                    background: '#161b22', border: '1px solid #21262d',
                    borderRadius: 8, fontSize: 12
                  }} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6"
                    strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>Need more assessments to show trend</p>
              </div>
            )}
          </div>
        </div>

        {/* Braden Subscale Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Braden Subscales</div>
              <div className="card-subtitle">Individual score breakdown</div>
            </div>
          </div>
          <div>
            {subscales.map(s => {
              const pct = (s.value / s.max) * 100;
              const barColor = pct <= 25 ? '#ef4444' : pct <= 50 ? '#f97316' : pct <= 75 ? '#f59e0b' : '#10b981';
              return (
                <div key={s.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.value}/{s.max}</span>
                  </div>
                  <div style={{
                    height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', background: barColor,
                      borderRadius: 4, transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assessment History */}
        <div className="card full-width">
          <div className="card-header">
            <div>
              <div className="card-title">Assessment History</div>
              <div className="card-subtitle">{history.length} assessments recorded</div>
            </div>
          </div>
          {history.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Level</th>
                    <th>Key Factors</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontSize: 13 }}>
                        {h.assessed_at ? new Date(h.assessed_at).toLocaleString() : 'N/A'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{h.risk_score}</span>/23
                      </td>
                      <td>
                        <span className={`risk-badge ${h.risk_level}`}>
                          <span className={`risk-dot ${h.risk_level}`} />
                          {h.risk_level}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300 }}>
                        {h.contributing_factors?.slice(0, 2).join('; ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><p>No assessment history</p></div>
          )}
        </div>

        {/* Notes & Medical History */}
        {(patient.medical_history || patient.notes) && (
          <div className="card full-width">
            <div className="card-title" style={{ marginBottom: 16 }}>Medical Notes</div>
            {patient.medical_history && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Medical History
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {patient.medical_history}
                </p>
              </div>
            )}
            {patient.notes && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Notes
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {patient.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
