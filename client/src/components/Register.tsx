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
      // Регистрируем пользователя
      await httpClient.post('/users/register', { username, password });

      // Автоматически выполняем логин после регистрации
      const response = await httpClient.post('/auth/login', { username, password });
      
      // Сохраняем токен и имя пользователя
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('username', response.data.username);

      // Очищаем поля
      setUsername('');
      setPassword('');

      // Показываем уведомление об успешной регистрации и логине
      toast.success('Регистрация прошла успешно!');

      // Перенаправляем на главную страницу
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