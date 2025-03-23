import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { setLogoutFunction } from './httpsClient.tsx';

const LogoutContext = createContext<() => void>(() => {});

export const useLogout = () => useContext(LogoutContext);

interface LogoutProviderProps {
  children: ReactNode;
}

export const LogoutProvider: React.FC<LogoutProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('username');
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    navigate('/login');
  };

  useEffect(() => {
    setLogoutFunction(logout);
  }, [logout]);

  return <LogoutContext.Provider value={logout}>{children}</LogoutContext.Provider>;
};