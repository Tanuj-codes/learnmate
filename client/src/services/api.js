const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details || [];
  }
}

export function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function buildUrl(path, params) {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return `${API_BASE}${path}${suffix}`;
}

async function request(path, { method = 'GET', body, params, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const csrf = readCookie('lm_csrf');
  if (csrf && method !== 'GET' && method !== 'HEAD') headers['x-csrf-token'] = csrf;

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the LearnMate API. Check that the server is running and try again.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const apiError = new ApiError(
      payload?.error?.message || `Request failed with status ${response.status}.`,
      {
        status: response.status,
        code: payload?.error?.code || 'REQUEST_FAILED',
        details: payload?.error?.details,
      }
    );
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('learnmate:unauthorized'));
    }
    throw apiError;
  }

  return payload?.data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  auth: {
    me: () => request('/auth/me'),
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },
  dashboard: () => request('/dashboard'),
  courses: {
    list: (params) => request('/courses', { params }),
    detail: (courseId) => request(`/courses/${courseId}`),
    enroll: (courseId) => request(`/courses/${courseId}/enroll`, { method: 'POST' }),
    progress: (courseId) => request(`/courses/${courseId}/progress`),
    leaderboard: (courseId, params) => request(`/courses/${courseId}/leaderboard`, { params }),
    myRank: (courseId, params) => request(`/courses/${courseId}/leaderboard/me`, { params }),
  },
  lessons: {
    get: (lessonId) => request(`/lessons/${lessonId}`),
    complete: (lessonId) => request(`/lessons/${lessonId}/complete`, { method: 'POST' }),
  },
  quizzes: {
    forCourse: (courseId) => request(`/courses/${courseId}/quizzes`),
    meta: (quizId) => request(`/quizzes/${quizId}`),
    start: (quizId, questionCount) =>
      request(`/quizzes/${quizId}/attempts`, { method: 'POST', body: { questionCount } }),
    submit: (attemptId, answers) =>
      request(`/attempts/${attemptId}/submit`, { method: 'POST', body: { answers } }),
    results: (attemptId) => request(`/attempts/${attemptId}/results`),
    history: (quizId) => request(`/quizzes/${quizId}/attempts`),
  },
  flashcards: {
    overview: () => request('/flashcards/overview'),
    due: (params) => request('/flashcards/due', { params }),
    deck: (courseId) => request(`/courses/${courseId}/flashcards`),
    review: (flashcardId, rating) =>
      request(`/flashcards/${flashcardId}/reviews`, { method: 'POST', body: { rating } }),
  },
  games: {
    history: (params) => request('/games/history', { params }),
    start: (courseId, gameType) =>
      request('/games/sessions', { method: 'POST', body: { courseId, gameType } }),
    submitMatch: (sessionId, matches) =>
      request(`/games/sessions/${sessionId}/match`, { method: 'POST', body: { matches } }),
    submitTimed: (sessionId, answers) =>
      request(`/games/sessions/${sessionId}/timed`, { method: 'POST', body: { answers } }),
  },
  goals: {
    get: (params) => request('/goals', { params }),
    create: (targetXp) => request('/goals', { method: 'POST', body: { targetXp } }),
    update: (goalId, targetXp) =>
      request(`/goals/${goalId}`, { method: 'PATCH', body: { targetXp } }),
  },
  analytics: {
    overview: () => request('/analytics/overview'),
    weekly: (days = 7) => request('/analytics/weekly', { params: { days } }),
  },
  achievements: {
    list: () => request('/achievements'),
  },
  notifications: {
    list: () => request('/notifications'),
    read: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    readAll: () => request('/notifications/read-all', { method: 'POST' }),
  },
  partners: {
    list: () => request('/partners'),
    invite: (email, shareProgress) =>
      request('/partners/requests', { method: 'POST', body: { email, shareProgress } }),
    update: (id, payload) => request(`/partners/${id}`, { method: 'PATCH', body: payload }),
    remove: (id) => request(`/partners/${id}`, { method: 'DELETE' }),
  },
  users: {
    profile: () => request('/users/me'),
    update: (payload) => request('/users/me', { method: 'PATCH', body: payload }),
    changePassword: (payload) => request('/users/me/password', { method: 'POST', body: payload }),
    xp: (params) => request('/users/me/xp', { params }),
  },
  admin: {
    stats: () => request('/admin/stats'),
    users: (params) => request('/admin/users', { params }),
    setRole: (userId, role) =>
      request(`/admin/users/${userId}/role`, { method: 'PATCH', body: { role } }),
  },
};

export default api;
