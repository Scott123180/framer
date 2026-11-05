import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import manifest from '../../../assets/fonts/fonts.manifest.json';
import { registerFonts } from '@engine/output/font-registry';
import { WorkerRenderService } from '@engine/output/worker-render-service';
import './ui/tokens.css';
import { App } from './app/App';
import { FramerApiProvider } from './app/framer-api-context';
import { createRendererDeps } from './app/composition';

const api = window.framer;

function measureContext() {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return ctx;
}

const deps = createRendererDeps(api, {
  manifest,
  registerFonts: (files) => registerFonts(document.fonts, files),
  createRenderService: (m, files) => WorkerRenderService.create(m, files),
  measureContext,
});
const loadDeps = () => deps;

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <FramerApiProvider api={api}>
      <App loadDeps={loadDeps} />
    </FramerApiProvider>
  </StrictMode>,
);
