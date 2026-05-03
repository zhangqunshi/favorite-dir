import React from 'react';
import ReactDOM from 'react-dom/client';
import FloatWindow from './components/FloatWindow';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <FloatWindow />
  </React.StrictMode>
);
