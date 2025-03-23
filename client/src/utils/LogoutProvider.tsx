// src/components/LogoutProvider.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import httpClient, { setLogoutFunction } from './httpsClient.tsx';

const LogoutContext = createContext<() => void>(() => {});

export const useLogout = () => useContext(LogoutContext);

interface LogoutProviderProps {
  children: ReactNode;
}

export const LogoutProvider: React.FC<LogoutProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  const logout = async () => {
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

  useEffect(() => {
    setLogoutFunction(logout);
  }, [logout]);

  return <LogoutContext.Provider value={logout}>{children}</LogoutContext.Provider>;
};