import axios, { type AxiosInstance } from "axios";

// ✅ Shared refresh state to prevent race conditions
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export function createApiClient(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    withCredentials: true,
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Skip if not 401, already retried, or is the refresh endpoint itself
      if (
        error.response?.status !== 401 ||
        originalRequest._retry ||
        originalRequest.url?.includes("/User/refresh-token") ||
        originalRequest.url?.includes("/User/login") ||
        originalRequest.url?.includes("/User/logout")
      ) {
        return Promise.reject(error);
      }

      // ✅ If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => instance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/User/refresh-token`,
          {},
          { withCredentials: true }
        );

        processQueue(null); // ✅ Retry all queued requests
        return instance(originalRequest);
      } catch (err) {
        processQueue(err); // ✅ Reject all queued requests

        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/User/logout`,
            {},
            { withCredentials: true }
          );
        } catch {}

        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }

        return Promise.reject(err);
      } finally {
        isRefreshing = false; // ✅ Always reset
      }
    }
  );

  return instance;
}