import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import httpClient from '../utils/httpsClient.tsx';
import { useAuth } from '../utils/AuthContext.tsx';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { username: authUsername, setAuth, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-sm mx-auto bg-white p-4 rounded shadow flex flex-col gap-3">
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (authUsername) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-sm mx-auto bg-white p-4 rounded shadow flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Добро пожаловать!</h2>
          <p className="text-gray-600">Вы вошли как {authUsername}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await httpClient.post('/auth/login', { username, pass: password });

      const { data } = await httpClient.get('/auth/me');

      setAuth({ username: data.username, role: data.role });

      toast.success('Успешный вход!');
      setUsername('');
      setPassword('');

      if (data.role === 'ADMIN') {
        navigate('/admin/librarians', { replace: true });
      } else if (data.role === 'LIBRARIAN') {
        navigate('/lists', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Неверный логин или пароль';
      toast.error(message);
      console.error('Ошибка авторизации:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-sm mx-auto bg-white p-4 rounded shadow flex flex-col gap-3"
      >
        <h2 className="text-xl font-semibold">Вход</h2>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Логин"
          required
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          required
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded"
        >
          Войти
        </button>
      </form>
    </div>
  );
};

export default Login;