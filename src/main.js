import './styles/base.css';
import './styles/flatAtlas.css';
import { createApp } from './app/createApp.js';
import { registerFeatures } from './features/index.js';

const app = await createApp({
  flatCanvas: document.getElementById('flat-atlas')
});

registerFeatures(app);

window.campaignPlanet = app;
