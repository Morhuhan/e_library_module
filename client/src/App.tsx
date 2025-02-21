import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Layout from './Layout.tsx';

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;