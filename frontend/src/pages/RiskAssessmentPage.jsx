import { useState } from 'react';
import { api } from '../lib/api';
import { Activity, RotateCcw } from 'lucide-react';

const SCORE_INFO = {
  sensory_score: {
    label: 'Sensory Perception', max: 4,
    labels: { 1: 'Completely Limited', 2: 'Very Limited', 3: 'Slightly Limited', 4: 'No Impairment' }
  },
  moisture_score: {
    label: 'Moisture', max: 4,
    labels: { 1: 'Constantly Moist', 2: 'Very Moist', 3: 'Occasionally Moist', 4: 'Rarely Moist' }
  },
  activity_score: {
    label: 'Activity', max: 4,
    labels: { 1: 'Bedfast', 2: 'Chairfast', 3: 'Walks Occasionally', 4: 'Walks Frequently' }
  },
  mobility_score: {
    label: 'Mobility', max: 4,
    labels: { 1: 'Completely Immobile', 2: 'Very Limited', 3: 'Slightly Limited', 4: 'No Limitations' }
  },
  nutrition_score: {
    label: 'Nutrition', max: 4,
    labels: { 1: 'Very Poor', 2: 'Probably Inadequate', 3: 'Adequate', 4: 'Excellent' }
  },
  friction_score: {
    label: 'Friction & Shear', max: 3,
    labels: { 1: 'Problem', 2: 'Potential Problem', 3: 'No Apparent Problem' }
  }
};

const RISK_STYLES = {
  critical: { color: '#c0392b', bg: 'rgba(192,57,43,0.10)', border: 'rgba(192,57,43,0.25)', label: 'CRITICAL RISK' },
  high: { color: '#d4731a', bg: 'rgba(212,115,26,0.10)', border: 'rgba(212,115,26,0.25)', label: 'HIGH RISK' },
  moderate: { color: '#c9944a', bg: 'rgba(201,148,74,0.10)', border: 'rgba(201,148,74,0.25)', label: 'MODERATE RISK' },
  low: { color: '#3a8a6e', bg: 'rgba(58,138,110,0.10)', border: 'rgba(58,138,110,0.25)', label: 'LOW RISK' }
};

export default function RiskAssessmentPage() {
  const [scores, setScores] = useState({
    sensory_score: 3, moisture_score: 3, activity_score: 3,
    mobility_score: 3, nutrition_score: 3, friction_score: 3
  });
  const [age, setAge] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setScores(s => ({ ...s, [key]: parseInt(val) }));

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const getRiskLevel = (s) => s <= 9 ? 'critical' : s <= 12 ? 'high' : s <= 14 ? 'moderate' : 'low';
  const previewLevel = getRiskLevel(total);
  const previewStyle = RISK_STYLES[previewLevel];

  const handleAssess = async () => {
    setLoading(true);
    try {
      const data = await api.assessRisk({
        ...scores,
        patient_age: age ? parseInt(age) : null
      });
      setResult(data);
    } catch (err) {
      // Fallback to local calculation
      setResult({
        risk_score: total,
        risk_level: previewLevel,
        contributing_factors: ['Assessment completed locally'],
        recommendations: ['Connect to backend for full AI recommendations'],
        subscale_details: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScores({
      sensory_score: 3, moisture_score: 3, activity_score: 3,
      mobility_score: 3, nutrition_score: 3, friction_score: 3
    });
    setAge('');
    setResult(null);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Risk Assessment Tool</h1>
          <p>Run a standalone Braden Scale assessment to preview risk levels</p>
        </div>
        <button className="btn btn-secondary" onClick={handleReset}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* Left: Sliders */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Braden Scale Parameters</div>
          </div>

          <div className="form-group" style={{ maxWidth: 200, marginBottom: 24 }}>
            <label className="form-label">Patient Age (optional)</label>
            <input className="form-input" type="number" placeholder="e.g. 72"
              value={age} onChange={e => setAge(e.target.value)} />
          </div>

          {Object.entries(SCORE_INFO).map(([key, info]) => (
            <div key={key} className="score-control">
              <div className="score-header">
                <div className="score-label">{info.label}</div>
                <div className="score-value">
                  {scores[key]} — {info.labels[scores[key]]}
                </div>
              </div>
              <input type="range" className="score-slider"
                min={1} max={info.max}
                value={scores[key]}
                onChange={e => update(key, e.target.value)}
              />
              <div className="score-labels">
                {Object.keys(info.labels).map(v => <span key={v}>{v}</span>)}
              </div>
            </div>
          ))}

          <button className="btn btn-primary btn-lg" onClick={handleAssess}
            disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (
              <><Activity size={16} /> Run Assessment</>
            )}
          </button>
        </div>

        {/* Right: Result */}
        <div>
          {/* Live Preview */}
          <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Live Preview
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: previewStyle.color, lineHeight: 1 }}>
              {total}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>/23 Braden Score</div>
            <div style={{
              display: 'inline-block', padding: '6px 20px', borderRadius: 20,
              background: previewStyle.bg, border: `1px solid ${previewStyle.border}`,
              color: previewStyle.color, fontWeight: 700, fontSize: 13,
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              {previewStyle.label}
            </div>
          </div>

          {/* Full Result */}
          {result && (
            <div className="animate-in">
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title" style={{ marginBottom: 16 }}>AI Assessment Result</div>
                <div style={{
                  textAlign: 'center', padding: 20, borderRadius: 'var(--radius-md)',
                  background: RISK_STYLES[result.risk_level]?.bg,
                  border: `1px solid ${RISK_STYLES[result.risk_level]?.border}`,
                  marginBottom: 20
                }}>
                  <div style={{ fontSize: 44, fontWeight: 800, color: RISK_STYLES[result.risk_level]?.color }}>
                    {result.risk_score}
                  </div>
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: RISK_STYLES[result.risk_level]?.color,
                    textTransform: 'uppercase', letterSpacing: 1
                  }}>
                    {RISK_STYLES[result.risk_level]?.label}
                  </div>
                </div>

                {result.contributing_factors?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--accent-amber)' }}>
                      ⚠ Contributing Factors
                    </div>
                    {result.contributing_factors.map((f, i) => (
                      <div key={i} style={{
                        padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)',
                        borderLeft: '2px solid var(--accent-amber)',
                        marginBottom: 6, background: 'rgba(245,158,11,0.04)',
                        borderRadius: '0 4px 4px 0'
                      }}>
                        {f}
                      </div>
                    ))}
                  </div>
                )}

                {result.recommendations?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--accent-blue)' }}>
                      💡 Recommendations
                    </div>
                    {result.recommendations.map((r, i) => (
                      <div key={i} style={{
                        padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)',
                        borderLeft: '2px solid var(--accent-blue)',
                        marginBottom: 6, background: 'rgba(59,130,246,0.04)',
                        borderRadius: '0 4px 4px 0'
                      }}>
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
