import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();

  const username = localStorage.getItem('username');

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoAction = () => {
    navigate('/action');
  };

  const handleGoLists = () => {
    navigate('/lists');
  };

  const handleGoBorrowRecords = () => {
    navigate('/borrow-records');
  };

  const handleGoReports = () => {
    navigate('/reports');
  };

  const hableGoImportExport = () => {
    navigate('/import-export');
  };

  return (
    <header className="app-header">
      <nav className="app-nav">
        <button onClick={handleGoHome} className="nav-button">
          Главная
        </button>
        <button onClick={handleGoLists} className="nav-button">
          Списки
        </button>
        <button onClick={handleGoAction} className="nav-button">
          Сдать/Принять книгу
        </button>
        <button onClick={handleGoBorrowRecords} className="nav-button">
          Записи
        </button>
        <button onClick={handleGoReports} className="nav-button">
          Отчеты
        </button>
        <button onClick={hableGoImportExport} className="nav-button">
          Импорт/Экспорт
        </button>

        <span className="user-name">
          {username ? username : 'Гость'}
        </span>
      </nav>
    </header>
  );
};

export default Header;