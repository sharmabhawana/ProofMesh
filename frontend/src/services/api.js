import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor: inject JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("proofmesh_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid or expired
      const hadToken = !!localStorage.getItem("proofmesh_token");
      localStorage.removeItem("proofmesh_token");
      localStorage.removeItem("proofmesh_user");
      if (hadToken) {
        window.dispatchEvent(new CustomEvent("proofmesh-auth-expired"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;

