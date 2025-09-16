/**
 * Normalize different error types to a consistent string message
 * @param error - Error of unknown type
 * @returns Normalized error string
 */
export const normalizeError = (error: unknown): string => {
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle fetch Response errors
  if (error && typeof error === 'object' && 'status' in error && 'statusText' in error) {
    const response = error as Response;
    return `${response.status}: ${response.statusText}`;
  }
  
  // Handle Axios-like errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.response?.statusText) {
      return `${axiosError.response.status}: ${axiosError.response.statusText}`;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  // Fallback for unknown error types
  return String(error) || 'An unknown error occurred';
};