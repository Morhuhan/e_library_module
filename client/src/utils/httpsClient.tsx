import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';

let logoutFunction: () => void = () => {};

export const setLogoutFunction = (logoutFn: () => void) => {
  logoutFunction = () => {
    logoutFn();
  };
};

const httpClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 2000,
});

let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

function subscribeTokenRefresh(cb: () => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed() {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
}

let hasSessionExpired = false;

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.config) return Promise.reject(error);

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!error.response) return Promise.reject(error);

    const { status } = error.response;

    if (status === 401) {
      if (originalRequest._retry) {
        if (!hasSessionExpired) {
          toast.error('Сессия истекла. Пожалуйста, войдите снова.');
          hasSessionExpired = true;
        }
        logoutFunction();
        return Promise.reject(error);
      }

      const isRefreshRequest =
        error.config.url === '/auth/refresh';
      const isLoginRequest =
        error.config.url === '/auth/login' &&
        error.config.method?.toLowerCase() === 'post';

      if (isRefreshRequest || isLoginRequest) {
        if (isLoginRequest) {
          logoutFunction();
          return Promise.reject(error);
        }

        if (!hasSessionExpired) {
          toast.error('Сессия истекла. Пожалуйста, войдите снова.');
          hasSessionExpired = true;
        }
        logoutFunction();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(httpClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        await httpClient.post('/auth/refresh');
        isRefreshing = false;
        onRefreshed();
        return httpClient(originalRequest);
      } catch (err) {
        isRefreshing = false;
        onRefreshed();
        if (!hasSessionExpired) {
          toast.error('Сессия истекла. Пожалуйста, войдите снова.');
          hasSessionExpired = true;
        }
        logoutFunction();
        return Promise.reject(err);
      }
    }

    if (error.response.data) {
      const data = error.response.data as any;
      toast.error(data.message || 'Произошла ошибка при обработке запроса');
    } else {
      toast.error('Неизвестная ошибка');
    }

    return Promise.reject(error);
  }
);

export default httpClient;