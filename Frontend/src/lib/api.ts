import axios from 'axios';
import { getAccessToken, setAccessToken } from './token';

const api = axios.create({
  baseURL: 'http://localhost:3000', // Adjust if your backend runs elsewhere
  withCredentials: true, // Important for sending cookies
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('Access token expired. Attempting to refresh...');
      try {
        const { data } = await api.get('/auth/refresh');
        console.log('Token refresh successful.');
        setAccessToken(data.access_token);
        originalRequest.headers['Authorization'] =
          'Bearer ' + data.access_token;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        setAccessToken(null);
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api; 