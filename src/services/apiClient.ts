import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Define the base API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front';
const API_TIMEOUT = 30000; // 30 seconds

// Type for API error response
interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
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
      // Check if this is a guest endpoint
      const isGuestEndpoint = config.url?.startsWith('/guest/');

      if (isGuestEndpoint) {
        // Use guest token for guest endpoints
        const guestToken = localStorage.getItem('guest_token');
        if (guestToken && config.headers) {
          config.headers.Authorization = `Bearer ${guestToken}`;
        }
      } else {
        // Use regular auth token for other endpoints
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
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
      if (typeof window !== 'undefined') {
        // Check if this was a guest endpoint
        const isGuestEndpoint = error.config?.url?.includes('/guest/');

        if (isGuestEndpoint) {
          // Clear guest token
          localStorage.removeItem('guest_token');
          // Only redirect if we're on the tickets page
          if (window.location.pathname === '/my-tickets') {
            window.location.href = '/my-tickets';
          }
        } else {
          // Clear regular auth token
          localStorage.removeItem('auth_token');
        }
      }
    }

    return Promise.reject(error);
  }
);

// Generic API request function
async function apiRequest<T = unknown, D = unknown>(
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
  get: async <T = unknown>(
    url: string,
    params?: Record<string, unknown>,
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
  post: async <T = unknown, D = unknown>(
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
  put: async <T = unknown, D = unknown>(
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
  patch: async <T = unknown, D = unknown>(
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
  delete: async <T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    return apiRequest<T>({ method: 'DELETE', url, ...config });
  }
};

// Seat selection API methods
// Note: These use /front/ endpoints for public access (no authentication required)
// Session-based validation is handled via sessionId (UUID)
export const seatAPI = {
  /**
   * Get seat map with availability for an event
   * @param eventId - Event ID
   */
  getEventSeats: async (eventId: string) => {
    return api.get<{
      data: {
        // EventManifest fields (Ticketmaster format)
        eventId: string;
        updateHash: string;
        updateTime: number;
        placeIds: string[];
        partitions: number[];
        sold: string[];
        reserved: string[];
        pricingZones: Array<{
          start: number;
          end: number;
          price: number;
          currency: string;
          section: string;
        }>;
        // Pricing configuration (when pricing is encoded in placeIds)
        pricingConfig?: {
          currency: string;
          orderFee: number;
          orderTax: number;
          tiers: Array<{
            id: string;
            basePrice: number;
            tax: number;
            serviceFee: number;
            serviceTax: number;
          }>;
        };
        // Venue Manifest fields
        backgroundSvg: string | null;
        sections: Array<{
          id: string;
          name: string;
          color: string;
          bounds: Record<string, number> | null;
          polygon: Array<{ x: number; y: number }> | null;
        }>;
        places: Array<{
          placeId: string;
          x: number | null;
          y: number | null;
          row: string | null;
          seat: string | null;
          section: string | null;
          [key: string]: string | number | null | undefined;
        }>;
      };
    }>(`/event/${eventId}/seats`);
  },

  /**
   * Reserve seats for an event
   * @param eventId - Event ID
   * @param placeIds - Array of place IDs to reserve
   * @param sessionId - Session ID (UUID)
   * @param email - Email address (verified via OTP)
   */
  reserveSeats: async (eventId: string, placeIds: string[], sessionId: string, email?: string) => {
    return api.post<{
      message: string;
      data: {
        reserved: string[];
        failed: string[];
      };
    }>(`/event/${eventId}/seats/reserve`, {
      placeIds,
      sessionId,
      ...(email && { email })
    });
  },

  /**
   * Confirm seats (mark as sold)
   * @param eventId - Event ID
   * @param placeIds - Array of place IDs to confirm
   * @param sessionId - Session ID (UUID)
   */
  confirmSeats: async (eventId: string, placeIds: string[], sessionId: string) => {
    return api.post<{
      message: string;
      data: {
        placeIds: string[];
      };
    }>(`/front/event/${eventId}/seats/confirm`, {
      placeIds,
      sessionId
    });
  },

  /**
   * Release seat reservations
   * @param eventId - Event ID
   * @param placeIds - Array of place IDs to release
   * @param sessionId - Session ID (UUID)
   */
  releaseSeats: async (eventId: string, placeIds: string[], sessionId: string) => {
    return api.post<{
      message: string;
      data: {
        released: number;
      };
    }>(`/front/event/${eventId}/seats/release`, {
      placeIds,
      sessionId
    });
  }
};

export default api;