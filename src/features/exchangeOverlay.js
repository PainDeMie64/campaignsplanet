import exchangeIds from '../data/exchangeIds.json';
import { getSelectedCampaign, getSelectedMap } from '../data/selectors.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function renderOverlay(node, state) {
  const campaign = getSelectedCampaign(state);
  const map = getSelectedMap(state);
  if (!map || !campaign) {
    node.innerHTML = '<h2>Exchange ID</h2><p>Select a map to verify its stored Exchange ID.</p>';
    return;
  }

  const entry = exchangeIds.maps[map.id] ?? null;
  const header = `
    <h2>Exchange ID</h2>
    <dl>
      <dt>Map</dt><dd>${escapeHtml(map.name)}</dd>
      <dt>Campaign</dt><dd>${escapeHtml(campaign.name)}</dd>
    </dl>
  `;

  if (!entry) {
    node.innerHTML = `${header}<p>Stored Exchange IDs are not tracked for this game.</p>`;
    return;
  }

  node.innerHTML = `${header}
    <dl>
      <dt>Site</dt><dd>${escapeHtml(entry.site)}</dd>
      <dt>Track ID</dt><dd><a href="${escapeHtml(entry.trackshowUrl)}" target="_blank" rel="noreferrer">${entry.trackId}</a></dd>
      <dt>Track name</dt><dd>${escapeHtml(entry.trackName)}</dd>
      <dt>Official author</dt><dd>${escapeHtml(entry.officialAuthor)}</dd>
      <dt>Uploader</dt><dd>${escapeHtml(entry.uploader)}</dd>
    </dl>
  `;
}

export function registerExchangeOverlay(app) {
  const node = app.exchangeOverlay;
  if (!node) return null;

  const update = (state) => renderOverlay(node, state);
  const unsubscribe = app.store.subscribe((state, prev) => {
    if (
      state.selectedMapId === prev.selectedMapId &&
      state.selectedCampaignId === prev.selectedCampaignId &&
      state.selectedGameId === prev.selectedGameId &&
      state.selectedRegion === prev.selectedRegion &&
      state.selectedSection === prev.selectedSection &&
      state.atlas === prev.atlas
    ) return;
    update(state);
  });
  update(app.store.getState());

  return unsubscribe;
}
