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
      const response = await httpClient.post('/auth/login', { username, pass: password });
      localStorage.setItem('username', response.data.username);

      toast.success('Успешный вход в систему!');
      setUsername('');
      setPassword('');
      navigate('/');
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;