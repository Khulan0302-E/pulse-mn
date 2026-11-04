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
        <p>{String(err.message || err)}</p>
        <p style={{ color: '#666' }}>Supabase ашиглаж байгаа бол .env.local дахь URL, түлхүүр зөв эсэх, supabase/schema.sql ажилласан эсэхийг шалгана уу.</p>
      </div>,
    );
  });
