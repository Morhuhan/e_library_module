import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import httpClient from '../utils/httpsClient.tsx';

const PrivateRoute: React.FC = () => {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await httpClient.get('/auth/me');
        setIsAuth(true);
      } catch (error) {
        setIsAuth(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuth === null) {
    return <div>Loading...</div>;
  }

  return isAuth ? <Outlet /> : <Navigate to="/" replace />;
};

export default PrivateRoute;