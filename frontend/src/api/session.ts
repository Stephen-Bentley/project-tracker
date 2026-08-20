import axios from 'axios';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ token: string }>(`${apiBaseUrl}/auth/refresh`, undefined, {
        withCredentials: true,
      })
      .then((response) => {
        localStorage.setItem('token', response.data.token);
        return response.data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
};

export const logoutSession = async () => {
  try {
    await axios.post(`${apiBaseUrl}/auth/logout`, undefined, {
      withCredentials: true,
    });
  } catch {
    // Local logout must still complete if the API is unavailable.
  } finally {
    clearSession();
  }
};
