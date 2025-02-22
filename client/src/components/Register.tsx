// src/components/Register.tsx
import React, { useState } from 'react';
import httpClient from '../utils/httpClient.tsx';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Сначала регистрируем пользователя
      await httpClient.post('/users/register', { username, password });

      // Затем логиним его
      const response = await httpClient.post('/auth/login', { username, password });
      // Сервер вернёт { message, username }, плюс установит cookie

      // Сохраняем имя пользователя
      localStorage.setItem('username', response.data.username);

      // Очищаем поля
      setUsername('');
      setPassword('');

      // Уведомление
      toast.success('Регистрация и вход прошли успешно!');

      // Переход на главную страницу (или куда хотите)
      navigate('/');
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
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