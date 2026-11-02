import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { useGameStore } from './state/gameStore';
import { useSettings } from './state/settings';
import { runtime } from './game/runtime';
import { orientation } from './sensors/orientation';
import { startDiagnostics } from './sensors/diagnostics';
import { installErrorReporting } from './diag/errors';
import { sfx } from './audio/sfx';
import { ErrorBoundary } from './ui/ErrorBoundary';

installErrorReporting();
startDiagnostics();

// definições persistidas: som e idioma do documento
sfx.setMuted(!useSettings.getState().sound);
document.documentElement.lang = useSettings.getState().language;
useSettings.subscribe((s) => {
  document.documentElement.lang = s.language;
});

// acesso para depuração e testes automatizados (consola do navegador)
declare global {
  interface Window {
    __skyshot?: { store: typeof useGameStore; settings: typeof useSettings; runtime: typeof runtime; orientation: typeof orientation };
  }
}
if (import.meta.env.DEV) {
  window.__skyshot = { store: useGameStore, settings: useSettings, runtime, orientation };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
