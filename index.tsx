import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import GMPage from './components/GMPage';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");
const root = createRoot(rootElement);
root.render(window.location.pathname === '/gm' ? <GMPage /> : <App />);
