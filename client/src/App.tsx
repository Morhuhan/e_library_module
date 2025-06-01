import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { LogoutProvider } from './utils/LogoutProvider.tsx';
import { AuthProvider } from './utils/AuthContext.tsx';
import Layout from './utils/Layout.tsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <LogoutProvider>
          <Layout />
        </LogoutProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;