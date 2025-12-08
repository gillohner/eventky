/**
 * Nexus API Client
 * Centralized client for making requests to the Pubky Nexus API
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { config } from "@/lib/config";

/**
 * Create an axios instance configured for the Nexus API
 */
function createNexusClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.gateway.url,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error?: string }>) => {
      // Don't log 404s for certain endpoints - "not found" is expected behavior
      // during optimistic caching wait or search operations
      const is404 = error.response?.status === 404;
      const isSearchEndpoint = error.config?.url?.includes('/search/');
      const isCalendarEndpoint = error.config?.url?.includes('/calendar/');
      const isEventEndpoint = error.config?.url?.includes('/event/');
      const shouldLog = !is404 || (!isSearchEndpoint && !isCalendarEndpoint && !isEventEndpoint);

      if (error.response && shouldLog) {
        // Server responded with error status
        console.error("Nexus API Error:", {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url,
          message: error.response.data?.error || error.message,
        });
      } else if (error.request && !error.response) {
        // Request was made but no response received
        console.error("Nexus API No Response:", {
          url: error.config?.url,
          message: error.message,
        });
      } else if (!error.request && !error.response) {
        // Error setting up the request
        console.error("Nexus API Request Error:", error.message);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Singleton Nexus API client instance
 */
export const nexusClient = createNexusClient();

/**
 * Helper to check if an error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.data && typeof error.response.data === "object") {
      const data = error.response.data as { error?: string; message?: string };
      return data.error || data.message || error.message;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
}
