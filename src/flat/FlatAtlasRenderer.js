import { measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext';
import { buildFlatAtlasLayout, FLAT_ATLAS_STYLE } from './flatAtlasLayout.js';

function alpha(hex, opacity) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function tint(hex, amount, opacity = 1) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((value >> 16) & 255) + amount));
  const g = Math.min(255, Math.max(0, ((value >> 8) & 255) + amount));
  const b = Math.min(255, Math.max(0, (value & 255) + amount));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function rectContains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function campaignOrigin(game, environment, campaign, section = null) {
  return {
    x: game.x + environment.x + (section?.x ?? 0) + campaign.x,
    y: game.y + environment.y + (section?.y ?? 0) + campaign.y
  };
}

export class FlatAtlasRenderer {
  constructor({ canvas, store }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this.measureCache = new Map();
    this.layout = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.drag = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.unsubscribe = store.subscribe(() => this.render());
    this.onPointerDown = (event) => this.pointerDown(event);
    this.onPointerMove = (event) => this.pointerMove(event);
    this.onPointerUp = (event) => this.pointerUp(event);
    this.onWheel = (event) => this.wheel(event);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.resize();
  }

  font(sizePx, weight = 900) {
    return `${weight} ${sizePx}px ${FLAT_ATLAS_STYLE.fontFamily}`;
  }

  measureText(text, sizePx, weight = 900) {
    const font = this.font(sizePx, weight);
    const key = `${font}:${text}`;
    const cached = this.measureCache.get(key);
    if (cached !== undefined) return cached;
    const prepared = prepareWithSegments(String(text).toUpperCase(), font);
    const width = measureNaturalWidth(prepared);
    this.measureCache.set(key, width);
    return width;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.fit();
    this.render();
  }

  fit() {
    const state = this.store.getState();
    this.layout = buildFlatAtlasLayout(state, (text, size, weight) => this.measureText(text, size, weight));
    const rect = this.canvas.getBoundingClientRect();
    const pad = 32;
    this.scale = Math.min(
      (rect.width - pad * 2) / Math.max(1, this.layout.width),
      (rect.height - pad * 2) / Math.max(1, this.layout.height)
    );
    this.scale = Math.max(0.18, Math.min(1.1, this.scale));
    this.offsetX = (rect.width - this.layout.width * this.scale) / 2;
    this.offsetY = (rect.height - this.layout.height * this.scale) / 2;
  }

  screenToWorld(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - this.offsetX) / this.scale,
      y: (event.clientY - rect.top - this.offsetY) / this.scale
    };
  }

  pointerDown(event) {
    if (this.store.getState().ui.atlasView !== 'flat') return;
    this.canvas.setPointerCapture(event.pointerId);
    this.drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      moved: false
    };
  }

  pointerMove(event) {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const dx = event.clientX - this.drag.x;
    const dy = event.clientY - this.drag.y;
    if (Math.hypot(dx, dy) > 3) this.drag.moved = true;
    this.offsetX = this.drag.offsetX + dx;
    this.offsetY = this.drag.offsetY + dy;
    this.render();
  }

  pointerUp(event) {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const wasClick = !this.drag.moved;
    this.drag = null;
    if (wasClick) this.pick(event);
  }

  wheel(event) {
    if (this.store.getState().ui.atlasView !== 'flat') return;
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const worldX = (cursorX - this.offsetX) / this.scale;
    const worldY = (cursorY - this.offsetY) / this.scale;
    const factor = Math.exp(-event.deltaY * 0.001);
    this.scale = Math.max(0.14, Math.min(3.6, this.scale * factor));
    this.offsetX = cursorX - worldX * this.scale;
    this.offsetY = cursorY - worldY * this.scale;
    this.render();
  }

  pick(event) {
    const point = this.screenToWorld(event);
    const layout = this.layout ?? buildFlatAtlasLayout(this.store.getState(), (text, size, weight) => this.measureText(text, size, weight));
    for (const game of layout.games) {
      if (!rectContains(game, point.x, point.y)) continue;
      for (const environment of game.environments) {
        const environmentRect = {
          x: game.x + environment.x,
          y: game.y + environment.y,
          width: environment.width,
          height: environment.height
        };
        if (!rectContains(environmentRect, point.x, point.y)) continue;
        for (const section of environment.sections ?? []) {
          const sectionRect = {
            x: environmentRect.x + section.x,
            y: environmentRect.y + section.y,
            width: section.width,
            height: section.height
          };
          if (!rectContains(sectionRect, point.x, point.y)) continue;
          for (const campaign of section.campaigns) {
            const campaignRect = {
              x: sectionRect.x + campaign.x,
              y: sectionRect.y + campaign.y,
              width: campaign.width,
              height: campaign.height
            };
            if (!rectContains(campaignRect, point.x, point.y)) continue;
            for (const map of campaign.maps) {
              const mapRect = {
                x: campaignRect.x + map.x,
                y: campaignRect.y + map.y,
                width: map.width,
                height: map.height
              };
              if (rectContains(mapRect, point.x, point.y)) {
                this.store.setState(() => ({
                  selectedGameId: game.game.id,
                  selectedRegion: environment.environment,
                  selectedSection: section.section,
                  selectedCampaignId: campaign.campaign.id,
                  selectedMapId: map.map.id
                }), { source: 'flat-atlas-map-pick' });
                return;
              }
            }
            this.store.setState(() => ({
              selectedGameId: game.game.id,
              selectedRegion: environment.environment,
              selectedSection: section.section,
              selectedCampaignId: campaign.campaign.id,
              selectedMapId: null
            }), { source: 'flat-atlas-campaign-pick' });
            return;
          }
          this.store.setState(() => ({
            selectedGameId: game.game.id,
            selectedRegion: environment.environment,
            selectedSection: section.section,
            selectedCampaignId: null,
            selectedMapId: null
          }), { source: 'flat-atlas-section-pick' });
          return;
        }
        for (const campaign of environment.campaigns) {
          const campaignRect = {
            x: environmentRect.x + campaign.x,
            y: environmentRect.y + campaign.y,
            width: campaign.width,
            height: campaign.height
          };
          if (!rectContains(campaignRect, point.x, point.y)) continue;
          for (const map of campaign.maps) {
            const mapRect = {
              x: campaignRect.x + map.x,
              y: campaignRect.y + map.y,
              width: map.width,
              height: map.height
            };
            if (rectContains(mapRect, point.x, point.y)) {
              this.store.setState(() => ({
                selectedGameId: game.game.id,
                selectedRegion: environment.environment,
                selectedSection: null,
                selectedCampaignId: campaign.campaign.id,
                selectedMapId: map.map.id
              }), { source: 'flat-atlas-map-pick' });
              return;
            }
          }
          this.store.setState(() => ({
            selectedGameId: game.game.id,
            selectedRegion: environment.environment,
            selectedSection: null,
            selectedCampaignId: campaign.campaign.id,
            selectedMapId: null
          }), { source: 'flat-atlas-campaign-pick' });
          return;
        }
        this.store.setState(() => ({
          selectedGameId: game.game.id,
          selectedRegion: environment.environment,
          selectedSection: null,
          selectedCampaignId: null,
          selectedMapId: null
        }), { source: 'flat-atlas-environment-pick' });
        return;
      }
      this.store.setState(() => ({
        selectedGameId: game.game.id,
        selectedRegion: null,
        selectedSection: null,
        selectedCampaignId: null,
        selectedMapId: null
      }), { source: 'flat-atlas-game-pick' });
      return;
    }
  }

  drawText(text, x, y, size, color, align = 'center') {
    this.ctx.font = this.font(size, 900);
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = color;
    this.ctx.fillText(String(text).toUpperCase(), x, y);
  }

  drawMap(game, environment, campaign, map, section = null) {
    const state = this.store.getState();
    const origin = campaignOrigin(game, environment, campaign, section);
    const x = origin.x + map.x;
    const y = origin.y + map.y;
    const selected = map.map.id === state.selectedMapId;
    this.ctx.fillStyle = selected
      ? alpha(campaign.campaign.tierColor || game.game.palette.accent, 0.84)
      : alpha(campaign.campaign.tierColor || game.game.palette.accent, 0.44);
    this.ctx.fillRect(x, y, map.width, map.height);
    this.ctx.strokeStyle = alpha(game.game.palette.coast, selected ? 0.95 : 0.64);
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(x, y, map.width, map.height);
    this.drawText(map.label, x + map.width / 2, y + map.height / 2 + 0.5, FLAT_ATLAS_STYLE.mapLabelSize, '#fffdf2');
  }

  drawCampaign(game, environment, campaign, section = null) {
    const state = this.store.getState();
    const origin = campaignOrigin(game, environment, campaign, section);
    const x = origin.x;
    const y = origin.y;
    const selected = campaign.campaign.id === state.selectedCampaignId;
    this.ctx.fillStyle = alpha(game.game.palette.land, selected ? 0.58 : 0.34);
    this.ctx.fillRect(x, y, campaign.width, campaign.height);
    this.ctx.strokeStyle = alpha(game.game.palette.coast, selected ? 0.92 : 0.56);
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(x, y, campaign.width, campaign.height);
    this.drawText(campaign.title, x + campaign.width / 2, y + FLAT_ATLAS_STYLE.campaignPad + 2, FLAT_ATLAS_STYLE.campaignTitleSize, '#f8f7e6');
    for (const map of campaign.maps) this.drawMap(game, environment, campaign, map, section);
  }

  drawSection(game, environment, section) {
    const state = this.store.getState();
    const x = game.x + environment.x + section.x;
    const y = game.y + environment.y + section.y;
    const selected = state.selectedRegion === environment.environment && state.selectedSection === section.section;
    this.ctx.fillStyle = alpha(game.game.palette.land, selected ? 0.5 : 0.3);
    this.ctx.fillRect(x, y, section.width, section.height);
    this.ctx.strokeStyle = alpha(game.game.palette.coast, selected ? 0.9 : 0.52);
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(x, y, section.width, section.height);
    this.drawText(section.title, x + section.titleX, y + section.titleY, FLAT_ATLAS_STYLE.environmentTitleSize, game.game.palette.coast);
    for (const campaign of section.campaigns) this.drawCampaign(game, environment, campaign, section);
  }

  drawEnvironment(game, environment) {
    const state = this.store.getState();
    const x = game.x + environment.x;
    const y = game.y + environment.y;
    const selected = game.game.id === state.selectedGameId && environment.environment === state.selectedRegion;
    this.ctx.fillStyle = alpha(game.game.palette.land, selected ? 0.48 : 0.24);
    this.ctx.fillRect(x, y, environment.width, environment.height);
    this.ctx.strokeStyle = alpha(game.game.palette.coast, selected ? 0.92 : 0.52);
    this.ctx.lineWidth = selected ? 2 : 1;
    this.ctx.strokeRect(x, y, environment.width, environment.height);
    this.drawText(
      environment.title,
      x + environment.titleX,
      y + environment.titleY,
      FLAT_ATLAS_STYLE.environmentTitleSize,
      game.game.palette.coast
    );
    for (const section of environment.sections ?? []) this.drawSection(game, environment, section);
    for (const campaign of environment.campaigns) this.drawCampaign(game, environment, campaign);
  }

  drawGame(game) {
    const state = this.store.getState();
    const selected = game.game.id === state.selectedGameId;
    this.ctx.fillStyle = tint(game.game.palette.land, selected ? 18 : -10, selected ? 0.74 : 0.54);
    this.ctx.fillRect(game.x, game.y, game.width, game.height);
    this.ctx.strokeStyle = alpha(game.game.palette.coast, selected ? 0.98 : 0.7);
    this.ctx.lineWidth = selected ? 3 : 1.5;
    this.ctx.strokeRect(game.x, game.y, game.width, game.height);
    this.drawText(game.title, game.x + game.titleX, game.y + game.titleY, FLAT_ATLAS_STYLE.gameTitleSize, game.game.palette.coast);
    for (const environment of game.environments) this.drawEnvironment(game, environment);
  }

  drawTimeline(layout) {
    const timeline = layout.timeline;
    if (!timeline?.years?.length) return;
    const state = this.store.getState();
    this.ctx.strokeStyle = state.ui.theme === 'light' ? 'rgba(22, 33, 40, 0.32)' : 'rgba(248, 247, 230, 0.28)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(timeline.x, timeline.top);
    this.ctx.lineTo(timeline.x, timeline.bottom);
    this.ctx.stroke();
    for (const mark of timeline.years) {
      const selected = mark.gameId === state.selectedGameId;
      this.ctx.fillStyle = selected ? '#fffdf2' : state.ui.theme === 'light' ? '#22323a' : '#cdd9de';
      this.ctx.beginPath();
      this.ctx.arc(mark.x, mark.y, selected ? 7 : 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.drawText(String(mark.year), mark.x, mark.y - 22, FLAT_ATLAS_STYLE.timelineYearSize, this.ctx.fillStyle);
    }
  }

  render() {
    if (!this.ctx) return;
    const state = this.store.getState();
    this.layout = buildFlatAtlasLayout(state, (text, size, weight) => this.measureText(text, size, weight));
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.save();
    this.ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.ctx.fillStyle = state.ui.theme === 'light' ? '#eef5f7' : '#0b141b';
    this.ctx.fillRect(0, 0, rect.width, rect.height);
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    this.drawTimeline(this.layout);
    for (const game of this.layout.games) this.drawGame(game);
    this.ctx.restore();
  }

  destroy() {
    this.unsubscribe?.();
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
