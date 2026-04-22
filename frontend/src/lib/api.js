import { API_URL } from './supabase';

class ApiService {
  constructor() {
    this.baseUrl = API_URL;
  }

  getToken() {
    const auth = JSON.parse(localStorage.getItem('pressureguard_auth') || '{}');
    return auth.access_token || '';
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(email, password, fullName, role) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, role })
    });
  }

  async getProfile() {
    return this.request('/api/auth/profile');
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  async getRiskTrends(days = 7) {
    return this.request(`/api/dashboard/trends?days=${days}`);
  }

  async getRecentPatients(limit = 5) {
    return this.request(`/api/dashboard/recent-patients?limit=${limit}`);
  }

  async getRecentAlerts(limit = 5) {
    return this.request(`/api/dashboard/recent-alerts?limit=${limit}`);
  }

  // Patients
  async getPatients(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/patients/?${query}`);
  }

  async getPatient(id) {
    return this.request(`/api/patients/${id}`);
  }

  async createPatient(data) {
    return this.request('/api/patients/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePatient(id, data) {
    return this.request(`/api/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePatient(id) {
    return this.request(`/api/patients/${id}`, {
      method: 'DELETE'
    });
  }

  async getRiskHistory(patientId) {
    return this.request(`/api/patients/${patientId}/risk-history`);
  }

  async assessRisk(data) {
    return this.request('/api/patients/assess-risk', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/alerts/?${query}`);
  }

  async getUnreadCount() {
    return this.request('/api/alerts/unread-count');
  }

  async acknowledgeAlert(id) {
    return this.request(`/api/alerts/${id}/acknowledge`, {
      method: 'PUT'
    });
  }

  async markAlertRead(id) {
    return this.request(`/api/alerts/${id}/read`, {
      method: 'PUT'
    });
  }

  async checkScheduledAlerts() {
    return this.request('/api/alerts/check-scheduled', {
      method: 'POST'
    });
  }
}

export const api = new ApiService();
