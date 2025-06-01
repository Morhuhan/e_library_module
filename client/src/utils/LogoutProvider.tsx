import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useAuth } from './AuthContext.tsx';
import httpClient, { setLogoutFunction } from './httpsClient.tsx';

const LogoutContext = createContext<() => void>(() => {});
export const useLogout = () => useContext(LogoutContext);

export const LogoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearAuth } = useAuth();

  const logout = useCallback(async () => {
    console.log('Logout called');
    try {
      await httpClient.post('/auth/logout');
    } catch (err) {
      console.log('Logout request failed:', err);
    } finally {
      Cookies.remove('username');
      clearAuth();
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
  }, [navigate, clearAuth, location.pathname]);

  useEffect(() => {
    setLogoutFunction(logout);
  }, [logout]);

  return <LogoutContext.Provider value={logout}>{children}</LogoutContext.Provider>;
};