import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';

let logoutFunction: () => void = () => {};
export const setLogoutFunction = (fn: () => void) => (logoutFunction = fn);

const httpClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 100_000,
});

let isRefreshing = false;
let subscribers: Array<() => void> = [];

const subscribe = (cb: () => void) => subscribers.push(cb);
const fire = () => {
  subscribers.forEach((cb) => cb());
  subscribers = [];
};

httpClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (!error.config || !error.response) return Promise.reject(error);

    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Пропускаем обработку 401 для запросов на /auth/login
    if (error.config.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (error.response.status !== 401) {
      toast.error((error.response.data as any)?.message ?? 'Произошла ошибка');
      return Promise.reject(error);
    }

    if (original._retry) {
      console.log('Повторный запрос не удался, вызываем logoutFunction');
      logoutFunction();
      toast.error('Сессия истекла. Войдите снова.');
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => subscribe(() => resolve(httpClient(original))));
    }

    isRefreshing = true;
    try {
      await httpClient.post('/auth/refresh');
      isRefreshing = false;
      fire();
      return httpClient(original);
    } catch (e) {
      console.log('Не удалось обновить токен, вызываем logoutFunction');
      isRefreshing = false;
      fire();
      logoutFunction();
      toast.error('Сессия истекла. Войдите снова.');
      return Promise.reject(e);
    }
  },
);

export default httpClient;