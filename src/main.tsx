import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initGlobalErrorLogging } from './lib/errorLog.ts';
import './index.css';

// Capture all uncaught errors and unhandled promise rejections before React boots.
initGlobalErrorLogging();

// Register Service Worker for PWA (Android APK / iOS PWA)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // Intentional: SW failure must not crash the app, only log.
      console.warn('SW registration skipped or failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
