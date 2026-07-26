import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@platform/App';
import '@platform/styles/index.css';

document.getElementById('root')?.setAttribute('data-mounted', 'true');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
