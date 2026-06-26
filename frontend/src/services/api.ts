import axios from "axios";

// Read API base URL from Vite environment or default to local API gateway path
const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Forces sending cookies (refresh_token) automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// In-memory access token storage to prevent XSS extraction
let inMemoryToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getAccessToken = () => {
  return inMemoryToken;
};

// 1. Request interceptor to append Bearer JWT automatically
api.interceptors.request.use(
  (config) => {
    if (inMemoryToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Variables to coordinate concurrent token refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// 2. Response interceptor to catch 401 and execute automatic token refreshes
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Catch 401 Unauthorized errors and prevent infinite recursion on auth routes
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes("/auth/")
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Post to the refresh endpoint. Cookie is transmitted automatically.
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        const { access_token } = response.data;
        setAccessToken(access_token);
        
        processQueue(null, access_token);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        
        // Notify AuthProvider to clean local state and redirect to login page
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:session-expired"));
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);
export default api;
