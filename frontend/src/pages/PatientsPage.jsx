import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Search, Plus, Trash2, Edit, Eye, Filter,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const { canEdit } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, [filterRisk]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const params = { status: 'active' };
      if (filterRisk) params.risk_level = filterRisk;
      const data = await api.getPatients(params);
      setPatients(data);
    } catch (err) {
      console.error(err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePatient(id);
      toast.success('Patient removed successfully');
      setPatients(prev => prev.filter(p => p.id !== id));
      setDeleteId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.ward?.toLowerCase().includes(search.toLowerCase()) ||
    p.bed_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Patient Management</h1>
          <p>{patients.length} active patients under monitoring</p>
        </div>
        <div className="page-header-actions">
          {canEdit() && (
            <button className="btn btn-primary" onClick={() => navigate('/add-patient')}>
              <Plus size={16} /> Add Patient
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search patients by name, ward, bed..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="tabs">
          {['', 'critical', 'high', 'moderate', 'low'].map(level => (
            <button
              key={level}
              className={`tab ${filterRisk === level ? 'active' : ''}`}
              onClick={() => setFilterRisk(level)}
            >
              {level === '' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filtered.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age</th>
                  <th>Ward</th>
                  <th>Bed</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Admitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="patient-cell">
                        <div className="patient-avatar">
                          {p.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="patient-name">{p.name}</div>
                          <div className="patient-id">
                            {p.gender?.charAt(0).toUpperCase() + p.gender?.slice(1)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{p.age} yrs</td>
                    <td>{p.ward}</td>
                    <td>{p.bed_number}</td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        {p.overall_risk_score}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>/23</span>
                    </td>
                    <td>
                      <span className={`risk-badge ${p.risk_level}`}>
                        <span className={`risk-dot ${p.risk_level}`} />
                        {p.risk_level}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {p.admission_date ? new Date(p.admission_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/patients/${p.id}`)}
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                        {canEdit() && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeleteId(p.id)}
                            title="Delete"
                            style={{ color: 'var(--accent-red)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <h3>No patients found</h3>
            <p>
              {search ? 'Try a different search term' : 'Add your first patient to get started'}
            </p>
            {canEdit() && !search && (
              <button className="btn btn-primary" style={{ marginTop: 16 }}
                onClick={() => navigate('/add-patient')}>
                <Plus size={16} /> Add Patient
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>⚠️ Delete Patient</h3>
              <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Are you sure you want to delete this patient? This action cannot be undone.
              All risk history and alerts for this patient will also be removed.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>
                <Trash2 size={14} /> Delete Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
