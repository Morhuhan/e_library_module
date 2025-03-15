// src/components/Register.tsx
import React, { useState } from 'react';
import httpClient from '../utils/httpClient.tsx';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  // Локально храните "password", но отправлять нужно "pass"
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1) Регистрируем пользователя, сервер ожидает pass
      await httpClient.post('/users/register', {
        username,
        pass: password,
      });

      // 2) Сразу логиним
      const response = await httpClient.post('/auth/login', {
        username,
        pass: password,
      });

      // Сервер вернёт { message, username } + установит cookie
      localStorage.setItem('username', response.data.username);

      // Очищаем поля и уведомляем
      setUsername('');
      setPassword('');
      toast.success('Регистрация и вход прошли успешно!');

      // Переход на главную
      navigate('/');
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      // Ошибки ловятся и показываются в интерцепторе
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Username"
        required
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Register</button>
    </form>
  );
};

export default Register;