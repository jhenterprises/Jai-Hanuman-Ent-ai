import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Patch console.error to suppress React 18+ defaultProps deprecation warnings from third-party libraries like Recharts
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('defaultProps')) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('defaultProps')) {
    return;
  }
  originalConsoleWarn(...args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
