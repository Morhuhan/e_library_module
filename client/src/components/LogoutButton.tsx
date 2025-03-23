// src/components/LogoutButton.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import httpClient from '../utils/httpsClient.tsx';

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await httpClient.post('/auth/logout');
      
      localStorage.removeItem('username');
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');

      navigate('/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return <button onClick={handleLogout}>Выход</button>;
};

export default LogoutButton;