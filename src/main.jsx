import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { initDb } from './lib/db';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

initDb()
  .then(() => {
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </React.StrictMode>,
    );
  })
  .catch((err) => {
    console.error(err);
    root.render(
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h2>Систем ачаалж чадсангүй</h2>
        <p>Хуудсыг http://localhost:5173 хаягаар нээж байгаа эсэхээ шалгана уу. ({String(err.message || err)})</p>
      </div>,
    );
  });
