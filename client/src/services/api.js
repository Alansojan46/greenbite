import axios from "axios";

const instance = axios.create({
  baseURL: "/api"
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("gb_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = instance;

