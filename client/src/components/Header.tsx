import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext.tsx';
import httpClient from '../utils/httpsClient.tsx';
import Cookies from 'js-cookie';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { role, username, clearAuth } = useAuth();

  const handleLogout = async () => {
    try {
      await httpClient.post('/auth/logout');
    } finally {
      Cookies.remove('username');
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header className="bg-gray-800 text-white py-4 shadow">
      <nav className="container mx-auto flex justify-between items-center px-4">
        <div className="space-x-4">
          {role === 'LIBRARIAN' && (
            <>
              <button onClick={() => navigate('/lists')} className="hover:underline">
                Списки
              </button>
              <button onClick={() => navigate('/action')} className="hover:underline">
                Сдать/Принять книгу
              </button>
              <button onClick={() => navigate('/borrow-records')} className="hover:underline">
                Записи
              </button>
              <button onClick={() => navigate('/reports')} className="hover:underline">
                Отчёты
              </button>
              <button onClick={() => navigate('/import-export')} className="hover:underline">
                Импорт/Экспорт
              </button>
            </>
          )}

          {role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin/librarians')}
              className="hover:underline"
            >
              Управление
            </button>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span className="font-semibold">{username ?? 'Гость'}</span>
          {role && (
            <button
              onClick={handleLogout}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
            >
              Выход
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;