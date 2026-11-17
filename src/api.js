const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response;
 try {
  console.log('API Request URL:', `${API_URL}${path}`);
  response = await fetch(`${API_URL}${path}`, { ...options, headers });
} catch (error) {
  console.error('API connection error:', error);
  throw new Error('Cannot reach the API. Check that the backend is running.');
}

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}
