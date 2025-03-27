// Configuration for the application
const isDevelopment = import.meta.env.DEV;

// API configuration
export const API_BASE_URL = isDevelopment 
  ? '' // Empty string means use the same domain in development
  : 'https://attendance-api-8haq.onrender.com'; // Render.com backend URL

export const getApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
}; 