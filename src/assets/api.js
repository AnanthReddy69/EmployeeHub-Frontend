import axios from "axios";

const api = axios.create({
baseURL: import.meta.env.DEV
  ? "https://employeehub-backend-i6a7.onrender.com"
  : "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;