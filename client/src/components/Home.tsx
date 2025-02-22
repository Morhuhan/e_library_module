// src/components/Home.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import httpClient from '../utils/httpClient.tsx';

function Home() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';

  const handleLibraryClick = () => {
    navigate('/lists');
  };

  const handleContingentClick = () => {
    navigate('/action');
  };

  const handleLogout = async () => {
    try {
      // Сервер очистит httpOnly cookie
      await httpClient.post('/auth/logout');
      // Удаляем имя пользователя из localStorage
      localStorage.removeItem('username');
      // Перенаправляем на главную
      navigate('/');
    } catch (err) {
      console.error('Ошибка при выходе из системы:', err);
    }
  };

  // Если есть username – считаем, что авторизован
  if (username) {
    return (
      <div>
        <h1>Здравствуйте, {username}!</h1>
        
        <button onClick={handleLibraryClick}>Библиотека</button>
        <button onClick={handleContingentClick}>Контингент</button>
        <button onClick={handleLogout}>Выход</button>
      </div>
    );
  }

  // Иначе не авторизован
  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  return (
    <div>
      <h1>Для продолжения необходимо войти.</h1>
      <button onClick={handleLoginClick}>Войти</button>
      <button onClick={handleRegisterClick}>Регистрация</button>
    </div>
  );
}

export default Home;