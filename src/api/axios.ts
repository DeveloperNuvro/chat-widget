
import axios from 'axios';

export const baseURL = import.meta.env.VITE_API_BASE_URL;

// Public API - credentials may be needed for some endpoints
export const publicApi = axios.create({
  baseURL,
  withCredentials: true,
});

// Widget API instance - no credentials needed (widget endpoints are public)
export const widgetApi = axios.create({
  baseURL,
  withCredentials: false,
});

// Authenticated API (requires credentials)
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

