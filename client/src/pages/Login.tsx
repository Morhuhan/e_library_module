import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import httpClient from '../utils/httpsClient.tsx';
import { toast } from 'react-toastify';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await httpClient.post('/auth/login', { username, pass: password });
      localStorage.setItem('username', res.data.username);
      toast.success('Успешный вход!');
      setUsername('');
      setPassword('');
      navigate('/');
    } catch (err) {
      console.error('Ошибка авторизации:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Вход</h2>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Логин"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
        required
      />
      <button type="submit">Войти</button>
    </form>
  );
};

export default Login;