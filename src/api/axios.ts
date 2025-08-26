
import axios from 'axios';

export const baseURL = import.meta.env.VITE_API_BASE_URL;

export const publicApi = axios.create({
  baseURL,
  withCredentials: true,
});


export const api = axios.create({
  baseURL,
  withCredentials: true,
});

