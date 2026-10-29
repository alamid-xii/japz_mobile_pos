import axios from "axios";

const configuredUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
// Hosted deployments can proxy /api on the same HTTPS origin.
const baseURL =
  configuredUrl ||
  (import.meta.env.DEV ? `http://${window.location.hostname}:3000` : "");
const api = axios.create({ baseURL, timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.url !== "/api/auth/login"
    ) {
      localStorage.removeItem("authToken");
      window.dispatchEvent(new Event("japz-auth-expired"));
    }
    return Promise.reject(error);
  },
);
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  logout: () => api.post("/api/auth/logout"),
  getCurrentUser: () => api.get("/api/auth/user"),
  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { email, code, newPassword }),
};
export default api;
