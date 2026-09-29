import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/russo-one/400.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
// Chakra Petch has no Cyrillic, so Ukrainian text falls back to Exo 2 (Cyrillic glyphs only).
import '@fontsource/exo-2/cyrillic-400.css';
import '@fontsource/exo-2/cyrillic-500.css';
import '@fontsource/exo-2/cyrillic-600.css';
import '@fontsource/exo-2/cyrillic-700.css';
import { AuthProvider } from './auth.jsx';
import { I18nProvider } from './i18n/index.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
