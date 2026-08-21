import { createRoot } from 'react-dom/client';
import App from './app.jsx';
import { applyStoredTheme } from './theme.js';
import { applyStoredViz, VizColorProvider } from './viz-color.js';
import { applyStoredDensity } from './density.js';
import { ToastProvider } from './toast.jsx';
import './index.css';

// Apply the saved theme + viz-color mode + density before first paint to avoid
// a flash of the wrong appearance.
applyStoredTheme();
applyStoredViz();
applyStoredDensity();

createRoot(document.getElementById('root')).render(
  <VizColorProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </VizColorProvider>,
);
