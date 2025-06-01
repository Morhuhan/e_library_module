import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.tsx';

const AdminRoute: React.FC = () => {
  const { role, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; 
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return role === 'ADMIN' ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AdminRoute;