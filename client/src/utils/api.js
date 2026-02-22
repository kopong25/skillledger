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

  const data = await res.json().catch(() => ({ error: 'Unexpected server response' }));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
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
};
