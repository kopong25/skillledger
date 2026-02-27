const BASE = '/api';

function getToken() {
  return localStorage.getItem('sl_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
  }
  if (!res.ok) {
    throw new Error(data.detail || data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  // Candidates
  analyze: (username) => request('/candidates/analyze', { method: 'POST', body: JSON.stringify({ username }) }),
  getCandidate: (username) => request(`/candidates/${username}`),
  getSaved: () => request('/candidates/saved'),
  saveCandidate: (body) => request('/candidates/save', { method: 'POST', body: JSON.stringify(body) }),
  updateSaved: (id, body) => request(`/candidates/save/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeSaved: (id) => request(`/candidates/save/${id}`, { method: 'DELETE' }),

// Admin
adminStats: () => request('/admin/stats'),
adminUsers: () => request('/admin/users'),
adminTeams: () => request('/admin/teams'),
adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
// Settings
getCompanySettings: () => request('/settings/company'),
updateCompanySettings: (body) => request('/settings/company', { method: 'PUT', body: JSON.stringify(body) }),

adminStats: () => request('/admin/stats'),
adminUsers: () => request('/admin/users'),
adminTeams: () => request('/admin/teams'),
adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
getCompanySettings: () => request('/settings/company'),
updateCompanySettings: (body) => request('/settings/company', { method: 'PUT', body: JSON.stringify(body) }),

  // Teams
  createTeam: (body) => request('/teams', { method: 'POST', body: JSON.stringify(body) }),
  getMyTeams: () => request('/teams/my'),
  addTeamMember: (teamId, body) => request(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  removeTeamMember: (teamId, userId) => request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
  getTeamSaved: (teamId) => request(`/teams/${teamId}/saved`),
  teamSaveCandidate: (teamId, body) => request(`/teams/${teamId}/save`, { method: 'POST', body: JSON.stringify(body) }),
  teamUpdateSaved: (teamId, candidateId, body) => request(`/teams/${teamId}/save/${candidateId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  teamRemoveSaved: (teamId, candidateId) => request(`/teams/${teamId}/save/${candidateId}`, { method: 'DELETE' }),

  // Report download (returns blob)
  downloadTeamReport: async (teamId) => {
    const token = getToken();
    const res = await fetch(`${BASE}/teams/${teamId}/report`, {
      headers: { Authorization: `Bearer ${token}` }
    // Admin
adminStats: () => request('/admin/stats'),
adminUsers: () => request('/admin/users'),
adminTeams: () => request('/admin/teams'),
adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
// Settings
getCompanySettings: () => request('/settings/company'),
updateCompanySettings: (body) => request('/settings/company', { method: 'PUT', body: JSON.stringify(body) }),
    });
    if (!res.ok) throw new Error('Failed to generate report');
    return res.blob();
  },
};
