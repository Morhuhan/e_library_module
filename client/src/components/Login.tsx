import React, { useState } from 'react';
import httpClient from '../utils/httpClient.tsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Хук для перенаправления
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await httpClient.post('/auth/login', {
        username,
        password,
      });
  
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('username', response.data.username);
  
      toast.success('Успешный вход в систему!');
  
      setUsername('');
      setPassword('');
  
      navigate('/');
    } catch (error: any) {
      console.error(error);
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