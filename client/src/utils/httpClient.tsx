import axios from 'axios';
import { toast } from 'react-toastify';

const httpClient = axios.create({
  baseURL: 'http://localhost:4000',
});

// Интерцептор запросов - автоматически проставляем Authorization, если есть токен
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Интерцептор ответов - обрабатываем ошибки
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data) {
      const { message, error: serverError } = error.response.data;
      if (message) {
        toast.error(message);
      } else if (serverError) {
        toast.error(serverError);
      } else {
        toast.error('Произошла ошибка при обработке запроса');
      }
    } else {
      toast.error('Неизвестная ошибка');
    }
    return Promise.reject(error);
  },
);

export default httpClient;