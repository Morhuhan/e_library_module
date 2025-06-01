import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from '../components/Header.tsx';
import Login from '../pages/Login.tsx';
import Lists from '../pages/Lists.tsx';
import BorrowReturn from '../pages/BorrowReturn.tsx';
import BorrowRecordsList from '../pages/BorrowRecordsList.tsx';
import Reports from '../pages/Reports.tsx';
import ImportExport from '../pages/ImportExport.tsx';
import LibrarianRoute from './LibrarianRoute.tsx';
import AdminRoute from './AdminRoute.tsx';
import ManageLibrarians from '../pages/ManageLibrarians.tsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Layout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <>
      {!isHomePage && <Header />}
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<LibrarianRoute />}>
          <Route path="/lists" element={<Lists />} />
          <Route path="/action" element={<BorrowReturn />} />
          <Route path="/borrow-records" element={<BorrowRecordsList />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/import-export" element={<ImportExport />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin/librarians" element={<ManageLibrarians />} />
        </Route>
      </Routes>
    </>
  );
};

export default Layout;