// src/components/Home.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton.tsx';

function Home() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';

  const handleLibraryClick = () => {
    navigate('/lists');
  };

  const handleContingentClick = () => {
    navigate('/action');
  };

  if (username) {
    return (
      <div>
        <h1>Здравствуйте, {username}!</h1>
        
        <button onClick={handleLibraryClick}>Библиотека</button>
        <LogoutButton /> 
      </div>
    );
  }

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