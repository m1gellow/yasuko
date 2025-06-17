import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Проверяем, существует ли корневой элемент
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found! Add a root element with id "root" to your HTML');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);