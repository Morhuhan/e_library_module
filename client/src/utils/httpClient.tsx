// src/utils/httpClient.tsx
import axios from 'axios';
import { toast } from 'react-toastify';

const httpClient = axios.create({
  baseURL: 'http://localhost:4000', // ваш URL к серверу
  withCredentials: true, 
});

// Интерцептор ОТВЕТА - обрабатываем ошибки, чтобы показывать их через toast
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