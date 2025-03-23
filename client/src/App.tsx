import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Layout from './Layout.tsx';
import { LogoutProvider } from './utils/LogoutProvider.tsx';

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