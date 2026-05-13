import axios from "axios";

// 🔥 BASE URL HANDLING (IMPORTANT)
const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// Create axios instance
const API = axios.create({
  baseURL: `${BASE_URL}/api`,
});

// 🔐 REQUEST INTERCEPTOR (attach token)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 🔐 RESPONSE INTERCEPTOR (auto logout on 401)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized → Logging out");

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default API;
