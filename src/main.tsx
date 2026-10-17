import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './app/App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root-Element nicht gefunden');

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
