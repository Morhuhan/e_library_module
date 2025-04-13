import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from '../components/Header.tsx';
import Home from '../pages/Home.tsx';
import Login from '../pages/Login.tsx';
import Register from '../pages/Register.tsx';
import Lists from '../pages//Lists.tsx';
import BorrowReturn from '../pages/BorrowReturn.tsx';
import BorrowRecordsList from '../pages/BorrowRecordsList.tsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PrivateRoute from './PrivateRoute.tsx';
import Reports from '../pages/Reports.tsx';
import ImportExport from '../pages/ImportExport.tsx';

const Layout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <>
      {!isHomePage && <Header />}

      <ToastContainer />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<PrivateRoute />}>
          <Route path="/lists" element={<Lists />} />
          <Route path="/action" element={<BorrowReturn />} />
          <Route path="/borrow-records" element={<BorrowRecordsList />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/import-export" element={<ImportExport />} />
        </Route>

      </Routes>
    </>
  );
};

export default Layout;