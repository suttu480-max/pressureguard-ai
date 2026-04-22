import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, User, MapPin, Calendar, Stethoscope,
  Activity, AlertTriangle, TrendingUp, Clock, Trash2,
  Edit3, Save, X
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';

const RISK_COLORS = {
  critical: '#c0392b', high: '#d4731a',
  moderate: '#c9944a', low: '#3a8a6e'
};

const SCORE_INFO = {
  sensory_score: {
    label: 'Sensory Perception',
    desc: 'Ability to respond to pressure-related discomfort',
    labels: { 1: 'Completely Limited', 2: 'Very Limited', 3: 'Slightly Limited', 4: 'No Impairment' },
    max: 4
  },
  moisture_score: {
    label: 'Moisture',
    desc: 'Degree to which skin is exposed to moisture',
    labels: { 1: 'Constantly Moist', 2: 'Very Moist', 3: 'Occasionally Moist', 4: 'Rarely Moist' },
    max: 4
  },
  activity_score: {
    label: 'Activity',
    desc: 'Degree of physical activity',
    labels: { 1: 'Bedfast', 2: 'Chairfast', 3: 'Walks Occasionally', 4: 'Walks Frequently' },
    max: 4
  },
  mobility_score: {
    label: 'Mobility',
    desc: 'Ability to change and control body position',
    labels: { 1: 'Completely Immobile', 2: 'Very Limited', 3: 'Slightly Limited', 4: 'No Limitations' },
    max: 4
  },
  nutrition_score: {
    label: 'Nutrition',
    desc: 'Usual food intake pattern',
    labels: { 1: 'Very Poor', 2: 'Probably Inadequate', 3: 'Adequate', 4: 'Excellent' },
    max: 4
  },
  friction_score: {
    label: 'Friction & Shear',
    desc: 'Degree of friction/shear on skin',
    labels: { 1: 'Problem', 2: 'Potential Problem', 3: 'No Apparent Problem' },
    max: 3
  }
};

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({});

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
    if (!window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) return;
    try {
      await api.deletePatient(id);
      toast.success('Patient deleted');
      navigate('/patients');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEditModal = () => {
    setEditForm({
      name: patient.name || '',
      age: patient.age || '',
      gender: patient.gender || 'male',
      ward: patient.ward || '',
      bed_number: patient.bed_number || '',
      diagnosis: patient.diagnosis || '',
      medical_history: patient.medical_history || '',
      admission_date: patient.admission_date || new Date().toISOString().split('T')[0],
      sensory_score: patient.sensory_score || 3,
      moisture_score: patient.moisture_score || 3,
      activity_score: patient.activity_score || 3,
      mobility_score: patient.mobility_score || 3,
      nutrition_score: patient.nutrition_score || 3,
      friction_score: patient.friction_score || 3,
      notes: patient.notes || '',
      status: patient.status || 'active'
    });
    setEditStep(1);
    setShowEdit(true);
  };

  const updateField = (field, value) => setEditForm(f => ({ ...f, [field]: value }));

  const bradenTotal = editForm.sensory_score + editForm.moisture_score + editForm.activity_score +
    editForm.mobility_score + editForm.nutrition_score + editForm.friction_score;

  const getRiskLevel = (score) => {
    if (score <= 9) return 'critical';
    if (score <= 12) return 'high';
    if (score <= 14) return 'moderate';
    return 'low';
  };

  const editRiskLevel = getRiskLevel(bradenTotal || 18);

  const handleEditSubmit = async () => {
    if (!editForm.name || !editForm.age || !editForm.ward || !editForm.bed_number) {
      toast.error('Please fill in all required fields');
      return;
    }

    setEditLoading(true);
    try {
      const data = { ...editForm, age: parseInt(editForm.age) };
      const updated = await api.updatePatient(id, data);
      setPatient(updated);
      // Reload risk history in case scores changed
      const h = await api.getRiskHistory(id);
      setHistory(h);
      toast.success('Patient updated successfully!');
      setShowEdit(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update patient');
    } finally {
      setEditLoading(false);
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={openEditModal} id="edit-patient-btn">
              <Edit3 size={14} /> Edit
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd0c1" />
                  <XAxis dataKey="date" stroke="#8da5a8" fontSize={11} />
                  <YAxis domain={[6, 23]} stroke="#8da5a8" fontSize={11} />
                  <Tooltip contentStyle={{
                    background: '#ffffff', border: '1px solid #ddd0c1',
                    borderRadius: 8, fontSize: 12, color: '#1e3a3d'
                  }} />
                  <Line type="monotone" dataKey="score" stroke="#2c5e63"
                    strokeWidth={2} dot={{ fill: '#2c5e63', r: 4 }} />
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
              const barColor = pct <= 25 ? '#c0392b' : pct <= 50 ? '#d4731a' : pct <= 75 ? '#c9944a' : '#3a8a6e';
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

      {/* ─── Edit Patient Modal ─── */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh',
              overflow: 'auto', padding: 0,
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s ease'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
              position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Edit Patient</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Step {editStep} of 2 — {editStep === 1 ? 'Patient Information' : 'Clinical Assessment'}
                </p>
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => setShowEdit(false)}
                style={{ padding: 6, borderRadius: 8, minWidth: 'unset' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{
              background: 'var(--border-color)', height: 3,
              overflow: 'hidden'
            }}>
              <div style={{
                width: editStep === 1 ? '50%' : '100%', height: '100%',
                background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
                transition: 'width 0.4s ease'
              }} />
            </div>

            <div style={{ padding: '24px' }}>
              {editStep === 1 ? (
                <>
                  {/* Patient Info Fields */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className="form-input" placeholder="Patient full name"
                        value={editForm.name} onChange={e => updateField('name', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Age *</label>
                      <input className="form-input" type="number" placeholder="Age"
                        value={editForm.age} onChange={e => updateField('age', e.target.value)} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Gender *</label>
                      <select className="form-select" value={editForm.gender}
                        onChange={e => updateField('gender', e.target.value)}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Admission Date</label>
                      <input className="form-input" type="date"
                        value={editForm.admission_date} onChange={e => updateField('admission_date', e.target.value)} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ward *</label>
                      <input className="form-input" placeholder="e.g. ICU, Ward A"
                        value={editForm.ward} onChange={e => updateField('ward', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bed Number *</label>
                      <input className="form-input" placeholder="e.g. B-12"
                        value={editForm.bed_number} onChange={e => updateField('bed_number', e.target.value)} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={editForm.status}
                        onChange={e => updateField('status', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="discharged">Discharged</option>
                        <option value="transferred">Transferred</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Diagnosis</label>
                      <input className="form-input" placeholder="Primary diagnosis"
                        value={editForm.diagnosis} onChange={e => updateField('diagnosis', e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Medical History</label>
                    <textarea className="form-textarea" placeholder="Relevant medical history..."
                      value={editForm.medical_history} onChange={e => updateField('medical_history', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" placeholder="Additional notes..."
                      value={editForm.notes} onChange={e => updateField('notes', e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button className="btn btn-primary" onClick={() => {
                      if (!editForm.name || !editForm.age || !editForm.ward || !editForm.bed_number) {
                        toast.error('Please fill in all required fields');
                        return;
                      }
                      setEditStep(2);
                    }}>
                      Next: Clinical Assessment →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Braden Scale */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 12, marginBottom: 24,
                    background: `var(--risk-${editRiskLevel}-bg, rgba(16,185,129,0.08))`,
                    border: `1px solid`,
                    borderColor: editRiskLevel === 'critical' ? 'rgba(239,68,68,0.25)' :
                      editRiskLevel === 'high' ? 'rgba(249,115,22,0.25)' :
                      editRiskLevel === 'moderate' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Stethoscope size={20} style={{ color: 'var(--accent-blue)' }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Braden Scale Assessment</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: `var(--risk-${editRiskLevel})` }}>
                        {bradenTotal || 0}
                      </span>
                      <div>
                        <div style={{
                          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                          color: `var(--risk-${editRiskLevel})`, letterSpacing: 0.5
                        }}>
                          {editRiskLevel} Risk
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Braden Score</div>
                      </div>
                    </div>
                  </div>

                  {Object.entries(SCORE_INFO).map(([key, info]) => (
                    <div key={key} className="score-control">
                      <div className="score-header">
                        <div>
                          <div className="score-label">{info.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{info.desc}</div>
                        </div>
                        <div className="score-value">
                          {editForm[key]} — {info.labels[editForm[key]]}
                        </div>
                      </div>
                      <input
                        type="range" className="score-slider"
                        min={1} max={info.max}
                        value={editForm[key]}
                        onChange={e => updateField(key, parseInt(e.target.value))}
                      />
                      <div className="score-labels">
                        {Object.entries(info.labels).map(([val, label]) => (
                          <span key={val}>{val}</span>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                    <button className="btn btn-secondary" onClick={() => setEditStep(1)}>
                      ← Back
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={handleEditSubmit} disabled={editLoading}>
                      {editLoading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (
                        <><Save size={16} /> Save Changes</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
