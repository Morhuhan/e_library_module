import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { LogoutProvider } from './utils/LogoutProvider.tsx';
import Layout from './utils/Layout.tsx';

function App() {
  return (
    <Router>
      <LogoutProvider>
        <Layout />
      </LogoutProvider>
    </Router>
  );
}

export default App;