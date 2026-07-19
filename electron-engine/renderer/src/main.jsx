import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// We mount into #exam-root, which is initially display: none.
// It is made visible by the bootstrap script in index.html once the session is validated.
const container = document.getElementById('exam-root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
