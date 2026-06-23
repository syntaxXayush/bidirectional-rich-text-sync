import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HostApp } from './HostApp';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HostApp />
  </StrictMode>,
);
