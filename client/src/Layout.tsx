import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.tsx';
import Home from './components/Home.tsx';
import Login from './components/Login.tsx';
import Register from './components/Register.tsx';
import Lists from './components/Lists.tsx';
import BorrowReturn from './components/BorrowReturn.tsx';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PrivateRoute from './components/PrivateRoute.tsx';
import BorrowRecordsList from './components/BorrowRecordsList.tsx';
import Reports from './components/Reports.tsx';
import ImportExport from './components/ImportExport.tsx';

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