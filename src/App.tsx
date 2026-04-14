import { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import './app.css';

import type { Location } from 'react-router-dom';

const CoverPage = lazy(async () => {
  const module = await import('./pages/CoverPage');
  return { default: module.CoverPage };
});

const ProtocolPage = lazy(async () => {
  const module = await import('./pages/ProtocolPage');
  return { default: module.ProtocolPage };
});

const ResultsPage = lazy(async () => {
  const module = await import('./pages/ResultsPage');
  return { default: module.ResultsPage };
});

function App() {
  const location = useLocation();

  function renderRoutes(routeLocation: Location) {
    return (
      <Suspense fallback={null}>
        <Routes location={routeLocation}>
          <Route path="/" element={<CoverPage />} />
          <Route path="/protocol" element={<ProtocolPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="*" element={<CoverPage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="mobile-app-shell">
      <div className="mobile-paper">
        <div className="screen-stack">
          <div className="screen-layer screen-layer--static">{renderRoutes(location)}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
