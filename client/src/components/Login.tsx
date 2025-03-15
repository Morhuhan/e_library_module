// src/components/Login.tsx
import React, { useState } from 'react';
import httpClient from '../utils/httpClient.tsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  // Локальное состояние всё ещё называется password
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // ВАЖНО: сервер ждёт pass, а не password
      const response = await httpClient.post('/auth/login', {
        username,
        pass: password,
      });

      // Сервер (auth.controller) возвращает { message, username }
      localStorage.setItem('username', response.data.username);
      toast.success('Успешный вход в систему!');

      setUsername('');
      setPassword('');
      navigate('/');
    } catch (error: any) {
      console.error('Ошибка при авторизации:', error);
      // Тосты об ошибках обрабатываются интерцептором (httpClient)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;