import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Define the base API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front';
const API_TIMEOUT = 30000; // 30 seconds

// Type for API error response
interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

// Create a configured axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Get the token from localStorage if we're in the browser
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const { response } = error;

    // Handle authentication errors
    if (response?.status === 401) {
      // Clear token and redirect to login if needed
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Optionally redirect to login
        // window.location.href = '/login';
      }
    }
    
    // Create a more user-friendly error message
    const errorMessage = response?.data?.message || 'Something went wrong';   
    return Promise.reject(error);
  }
);

// Generic API request function with types
export async function apiRequest<T = any, D = any>(
  config: AxiosRequestConfig<D>
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await apiClient(config);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Helper methods for common HTTP methods
export const api = {
  /**
   * HTTP GET request
   * @param url - The API endpoint
   * @param params - URL parameters
   * @param config - Additional Axios config
   */
  get: async <T = any>(
    url: string, 
    params?: Record<string, any>, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    return apiRequest<T>({ method: 'GET', url, params, ...config });
  },

  /**
   * HTTP POST request
   * @param url - The API endpoint
   * @param data - The request payload
   * @param config - Additional Axios config
   */
  post: async <T = any, D = any>(
    url: string, 
    data?: D, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    return apiRequest<T, D>({ method: 'POST', url, data, ...config });
  },

  /**
   * HTTP PUT request
   * @param url - The API endpoint
   * @param data - The request payload
   * @param config - Additional Axios config
   */
  put: async <T = any, D = any>(
    url: string, 
    data?: D, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    return apiRequest<T, D>({ method: 'PUT', url, data, ...config });
  },

  /**
   * HTTP PATCH request
   * @param url - The API endpoint
   * @param data - The request payload
   * @param config - Additional Axios config
   */
  patch: async <T = any, D = any>(
    url: string, 
    data?: D, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    return apiRequest<T, D>({ method: 'PATCH', url, data, ...config });
  },

  /**
   * HTTP DELETE request
   * @param url - The API endpoint
   * @param config - Additional Axios config
   */
  delete: async <T = any>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    return apiRequest<T>({ method: 'DELETE', url, ...config });
  }
};

export default api;