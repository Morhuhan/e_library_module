// src/components/Home.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  // Проверяем наличие токена
  const token = localStorage.getItem('token');
  // Если при авторизации вы сохраняете имя пользователя под ключом "username"
  const username = localStorage.getItem('username') || 'Пользователь';

  // Обработчики кликов для залогиненного пользователя
  const handleLibraryClick = () => {
    navigate('/lists');
  };

  const handleContingentClick = () => {
    // Пока ничего не делаем
  };
  
  const handleLogout = () => {
    // Удаляем токен и имя пользователя из localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    // Перенаправляем на главную страницу
    navigate('/');
  };

  // Обработчики для незалогиненного пользователя
  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  // Если пользователь авторизован
  if (token) {
    return (
      <div>
        <h1>Здравствуйте, {username}!</h1>
        
        <button onClick={handleLibraryClick}>
          Библиотека
        </button>
        
        <button onClick={handleContingentClick}>
          Контингент
        </button>

        <button onClick={handleLogout}>
          Выход
        </button>
      </div>
    );
  }

  // Если пользователь не авторизован
  return (
    <div>
      <h1>Для продолжения необходимо войти.</h1>
      <button onClick={handleLoginClick}>Войти</button>
      <button onClick={handleRegisterClick}>Регистрация</button>
    </div>
  );
}

export default Home;