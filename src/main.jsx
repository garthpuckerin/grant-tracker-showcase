import { createRoot } from 'react-dom/client';
import App from './app.jsx';
import { applyStoredTheme } from './theme.js';
import { applyStoredViz, VizColorProvider } from './viz-color.js';
import { applyStoredDensity } from './density.js';
import { applyStoredReduceMotion } from './reduce-motion.js';
import { ToastProvider } from './toast.jsx';
import './index.css';

// Apply saved appearance before first paint to avoid a flash of the wrong state.
applyStoredTheme();
applyStoredViz();
applyStoredDensity();
applyStoredReduceMotion();

createRoot(document.getElementById('root')).render(
  <VizColorProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </VizColorProvider>,
);
