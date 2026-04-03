import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Save, ArrowLeft, User, Bed, Stethoscope, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

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

export default function AddPatientPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', age: '', gender: 'male',
    ward: '', bed_number: '', diagnosis: '',
    medical_history: '', admission_date: new Date().toISOString().split('T')[0],
    sensory_score: 3, moisture_score: 3, activity_score: 3,
    mobility_score: 3, nutrition_score: 3, friction_score: 3,
    notes: ''
  });
  const navigate = useNavigate();

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const bradenTotal = form.sensory_score + form.moisture_score + form.activity_score +
    form.mobility_score + form.nutrition_score + form.friction_score;

  const getRiskLevel = (score) => {
    if (score <= 9) return 'critical';
    if (score <= 12) return 'high';
    if (score <= 14) return 'moderate';
    return 'low';
  };

  const riskLevel = getRiskLevel(bradenTotal);

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.ward || !form.bed_number) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = { ...form, age: parseInt(form.age) };
      await api.createPatient(data);
      toast.success(`Patient ${form.name} added successfully!`);
      navigate('/patients');
    } catch (err) {
      toast.error(err.message || 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>Add New Patient</h1>
            <p>Step {step} of 2 — {step === 1 ? 'Patient Information' : 'Clinical Assessment'}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        background: 'var(--border-color)', borderRadius: 4, height: 4,
        marginBottom: 32, overflow: 'hidden'
      }}>
        <div style={{
          width: step === 1 ? '50%' : '100%', height: '100%',
          background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
          borderRadius: 4, transition: 'width 0.4s ease'
        }} />
      </div>

      {step === 1 ? (
        <div className="card" style={{ maxWidth: 700 }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={20} style={{ color: 'var(--accent-blue)' }} />
              <div className="card-title">Patient Information</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Patient full name"
                value={form.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Age *</label>
              <input className="form-input" type="number" placeholder="Age"
                value={form.age} onChange={e => update('age', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select className="form-select" value={form.gender}
                onChange={e => update('gender', e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Admission Date</label>
              <input className="form-input" type="date"
                value={form.admission_date} onChange={e => update('admission_date', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ward *</label>
              <input className="form-input" placeholder="e.g. ICU, Ward A"
                value={form.ward} onChange={e => update('ward', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bed Number *</label>
              <input className="form-input" placeholder="e.g. B-12"
                value={form.bed_number} onChange={e => update('bed_number', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Diagnosis</label>
            <input className="form-input" placeholder="Primary diagnosis"
              value={form.diagnosis} onChange={e => update('diagnosis', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Medical History</label>
            <textarea className="form-textarea" placeholder="Relevant medical history..."
              value={form.medical_history} onChange={e => update('medical_history', e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-primary" onClick={() => {
              if (!form.name || !form.age || !form.ward || !form.bed_number) {
                toast.error('Please fill in all required fields');
                return;
              }
              setStep(2);
            }}>
              Next: Clinical Assessment →
            </button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 700 }}>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Stethoscope size={20} style={{ color: 'var(--accent-blue)' }} />
                <div className="card-title">Braden Scale Assessment</div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                background: `var(--risk-${riskLevel}-bg)`,
                border: `1px solid`,
                borderColor: riskLevel === 'critical' ? 'rgba(239,68,68,0.25)' :
                  riskLevel === 'high' ? 'rgba(249,115,22,0.25)' :
                  riskLevel === 'moderate' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'
              }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: `var(--risk-${riskLevel})` }}>
                  {bradenTotal}
                </span>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                    color: `var(--risk-${riskLevel})`, letterSpacing: 0.5
                  }}>
                    {riskLevel} Risk
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
                    {form[key]} — {info.labels[form[key]]}
                  </div>
                </div>
                <input
                  type="range" className="score-slider"
                  min={1} max={info.max}
                  value={form[key]}
                  onChange={e => update(key, parseInt(e.target.value))}
                />
                <div className="score-labels">
                  {Object.entries(info.labels).map(([val, label]) => (
                    <span key={val}>{val}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea className="form-textarea" placeholder="Any additional observations..."
              value={form.notes} onChange={e => update('notes', e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (
                <><Save size={16} /> Save Patient</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
