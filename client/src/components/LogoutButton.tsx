// src/components/LogoutButton.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie'; 

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('username');
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    navigate('/login');
  };

  return <button onClick={handleLogout}>Выход</button>;
};

export default LogoutButton;