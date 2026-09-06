const API_URL = window.__ENV__?.API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "linklib_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    setToken(null);
    throw new ApiError("Not authenticated", 401);
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new ApiError(detail.detail ?? response.statusText, response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  login: (username, password) => request("/api/auth/login", { method: "POST", body: { username, password }, auth: false }),

  listCollections: () => request("/api/collections"),
  createCollection: (name) => request("/api/collections", { method: "POST", body: { name } }),
  updateCollection: (id, name) => request(`/api/collections/${id}`, { method: "PATCH", body: { name } }),
  deleteCollection: (id) => request(`/api/collections/${id}`, { method: "DELETE" }),

  listLinks: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
    ).toString();
    return request(`/api/links${query ? `?${query}` : ""}`);
  },
  createLink: (url, collectionId) => request("/api/links", { method: "POST", body: { url, collection_id: collectionId } }),
  updateLink: (id, patch) => request(`/api/links/${id}`, { method: "PATCH", body: patch }),
  deleteLink: (id) => request(`/api/links/${id}`, { method: "DELETE" }),
};

export { ApiError };
