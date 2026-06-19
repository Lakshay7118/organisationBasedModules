import axios from "axios";

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }

  if (
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return window.location.origin;
  }

  return "http://localhost:5000";
};

const API = axios.create({
  baseURL: `${getBaseURL()}/api`,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "ORGANIZATION_INACTIVE"
    ) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Service no longer available for this organization.";

      localStorage.setItem("serviceUnavailableMessage", message);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("ownerSession");

      window.location.href = "/";
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      console.warn("Unauthorized - logging out");

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");

      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default API;
