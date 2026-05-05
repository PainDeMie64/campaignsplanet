import { visibleLiveCampaignIds } from '../data/liveHistory.js';
import { displayMapLabel } from './textLabels.js';

export const FLAT_ATLAS_STYLE = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  gameTitleSize: 24,
  environmentTitleSize: 16,
  campaignTitleSize: 12,
  mapLabelSize: 12,
  mapPadX: 18,
  mapPadY: 12,
  campaignPad: 10,
  campaignGap: 8,
  environmentPad: 12,
  environmentGap: 12,
  gamePad: 16,
  gameGap: 26,
  minMapWidth: 72,
  minMapHeight: 34
};

function groupBy(items, keyFor) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFor(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function sortCampaigns(campaigns) {
  return [...campaigns].sort((a, b) => (
    a.gameId.localeCompare(b.gameId) ||
    String(a.environment).localeCompare(String(b.environment)) ||
    (a.difficulty - b.difficulty) ||
    a.id.localeCompare(b.id)
  ));
}

function environmentOrder(game, groups) {
  return [
    ...(game.environments ?? []),
    ...[...groups.keys()].filter((environment) => !(game.environments ?? []).includes(environment)).sort()
  ].filter((environment) => groups.has(environment));
}

function visibleCampaigns(state, game) {
  const liveVisible = visibleLiveCampaignIds(state);
  return state.atlas.campaigns.filter((campaign) => (
    campaign.gameId === game.id &&
    (game.id !== 'tm2020' || liveVisible.has(campaign.id))
  ));
}

function textWidth(measureText, text, sizePx, weight = 900) {
  return Math.ceil(measureText(String(text).toUpperCase(), sizePx, weight));
}

function bestMapGrid(mapCells, targetAspect = 1.55) {
  if (!mapCells.length) {
    return { columns: 1, rows: 0, width: 1, height: 1, placements: [] };
  }
  let best = null;
  for (let columns = 1; columns <= mapCells.length; columns++) {
    const rows = Math.ceil(mapCells.length / columns);
    const rowWidths = [];
    const rowHeights = [];
    for (let row = 0; row < rows; row++) {
      const rowCells = mapCells.slice(row * columns, row * columns + columns);
      rowWidths.push(rowCells.reduce((sum, cell) => sum + cell.width, 0));
      rowHeights.push(Math.max(...rowCells.map((cell) => cell.height), 1));
    }
    const width = Math.max(...rowWidths, 1);
    const height = rowHeights.reduce((sum, value) => sum + value, 0);
    const aspect = width / Math.max(1, height);
    const emptySlots = rows * columns - mapCells.length;
    const score = Math.abs(Math.log(aspect / targetAspect)) + emptySlots * 0.055 + rows * 0.012;
    if (!best || score < best.score) {
      const placements = [];
      let y = 0;
      for (let row = 0; row < rows; row++) {
        const rowCells = mapCells.slice(row * columns, row * columns + columns);
        const rowHeight = rowHeights[row];
        let x = 0;
        for (const cell of rowCells) {
          placements.push({ cell, x, y, width: cell.width, height: rowHeight });
          x += cell.width;
        }
        y += rowHeight;
      }
      best = { columns, rows, width, height, placements, score };
    }
  }
  return best;
}

function layoutCampaign(campaign, measureText, style) {
  const title = campaign.tierCode ?? campaign.name;
  const titleWidth = textWidth(measureText, title, style.campaignTitleSize, 900) + style.campaignPad * 2;
  const mapCells = campaign.maps.map((map) => {
    const label = displayMapLabel(map.name);
    const labelWidth = textWidth(measureText, label, style.mapLabelSize, 900);
    return {
      map,
      label,
      width: Math.max(style.minMapWidth, labelWidth + style.mapPadX * 2),
      height: Math.max(style.minMapHeight, style.mapLabelSize + style.mapPadY * 2)
    };
  });
  const grid = bestMapGrid(mapCells);
  const contentWidth = Math.max(titleWidth, grid.width);
  const titleHeight = style.campaignTitleSize + style.campaignPad;
  const width = contentWidth + style.campaignPad * 2;
  const height = titleHeight + grid.height + style.campaignPad;
  return {
    campaign,
    title,
    width,
    height,
    titleHeight,
    mapCells,
    grid,
    maps: grid.placements.map((placement) => ({
      map: placement.cell.map,
      label: placement.cell.label,
      x: style.campaignPad + placement.x + (contentWidth - grid.width) / 2,
      y: titleHeight + placement.y,
      width: placement.width,
      height: placement.height
    }))
  };
}

function layoutEnvironment(game, environment, campaigns, measureText, style) {
  const campaignLayouts = sortCampaigns(campaigns).map((campaign) => layoutCampaign(campaign, measureText, style));
  const targetWidth = Math.max(
    360,
    Math.sqrt(campaignLayouts.reduce((sum, campaign) => sum + campaign.width * campaign.height, 0)) * 1.55
  );
  const rows = [];
  let current = [];
  let currentWidth = 0;
  for (const campaign of campaignLayouts) {
    const nextWidth = currentWidth + (current.length ? style.campaignGap : 0) + campaign.width;
    if (current.length && nextWidth > targetWidth) {
      rows.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push(campaign);
    currentWidth += (current.length > 1 ? style.campaignGap : 0) + campaign.width;
  }
  if (current.length) rows.push(current);

  const environmentTitleWidth = textWidth(measureText, environment, style.environmentTitleSize, 900);
  const rowSizes = rows.map((row) => ({
    width: row.reduce((sum, campaign, index) => sum + campaign.width + (index ? style.campaignGap : 0), 0),
    height: Math.max(...row.map((campaign) => campaign.height), 1)
  }));
  const contentWidth = Math.max(environmentTitleWidth, ...rowSizes.map((row) => row.width), 1);
  const titleHeight = style.environmentTitleSize + style.environmentPad;
  const contentHeight = titleHeight + rowSizes.reduce((sum, row, index) => sum + row.height + (index ? style.campaignGap : 0), 0);
  const width = contentWidth + style.environmentPad * 2;
  const height = contentHeight + style.environmentPad * 2;
  const campaignPlacements = [];
  let y = style.environmentPad + titleHeight;
  rows.forEach((row, rowIndex) => {
    const rowSize = rowSizes[rowIndex];
    let x = style.environmentPad + (contentWidth - rowSize.width) / 2;
    for (const campaign of row) {
      campaignPlacements.push({ ...campaign, x, y });
      x += campaign.width + style.campaignGap;
    }
    y += rowSize.height + style.campaignGap;
  });

  return {
    environment,
    x: 0,
    y: 0,
    width,
    height,
    title: environment,
    titleX: style.environmentPad + contentWidth / 2,
    titleY: style.environmentPad + style.environmentTitleSize,
    campaigns: campaignPlacements
  };
}

function layoutGame(game, campaigns, measureText, style) {
  const groups = groupBy(campaigns, (campaign) => campaign.environment || 'Official');
  const environmentLayouts = environmentOrder(game, groups).map((environment) => (
    layoutEnvironment(game, environment, groups.get(environment), measureText, style)
  ));
  const targetWidth = Math.max(
    520,
    Math.sqrt(environmentLayouts.reduce((sum, environment) => sum + environment.width * environment.height, 0)) * 1.45
  );
  const rows = [];
  let current = [];
  let currentWidth = 0;
  for (const environment of environmentLayouts) {
    const nextWidth = currentWidth + (current.length ? style.environmentGap : 0) + environment.width;
    if (current.length && nextWidth > targetWidth) {
      rows.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push(environment);
    currentWidth += (current.length > 1 ? style.environmentGap : 0) + environment.width;
  }
  if (current.length) rows.push(current);

  const gameTitleWidth = textWidth(measureText, game.name, style.gameTitleSize, 900);
  const rowSizes = rows.map((row) => ({
    width: row.reduce((sum, environment, index) => sum + environment.width + (index ? style.environmentGap : 0), 0),
    height: Math.max(...row.map((environment) => environment.height), 1)
  }));
  const contentWidth = Math.max(gameTitleWidth, ...rowSizes.map((row) => row.width), 1);
  const titleHeight = style.gameTitleSize + style.gamePad;
  const contentHeight = titleHeight + rowSizes.reduce((sum, row, index) => sum + row.height + (index ? style.environmentGap : 0), 0);
  const width = contentWidth + style.gamePad * 2;
  const height = contentHeight + style.gamePad * 2;
  const placedEnvironments = [];
  let y = style.gamePad + titleHeight;
  rows.forEach((row, rowIndex) => {
    const rowSize = rowSizes[rowIndex];
    let x = style.gamePad + (contentWidth - rowSize.width) / 2;
    for (const environment of row) {
      placedEnvironments.push({ ...environment, x, y });
      x += environment.width + style.environmentGap;
    }
    y += rowSize.height + style.environmentGap;
  });

  return {
    game,
    x: 0,
    y: 0,
    width,
    height,
    title: game.name,
    titleX: style.gamePad + contentWidth / 2,
    titleY: style.gamePad + style.gameTitleSize,
    environments: placedEnvironments
  };
}

export function buildFlatAtlasLayout(state, measureText, style = FLAT_ATLAS_STYLE) {
  const games = state.atlas.games.map((game) => layoutGame(game, visibleCampaigns(state, game), measureText, style));
  const targetWidth = Math.max(900, Math.sqrt(games.reduce((sum, game) => sum + game.width * game.height, 0)) * 1.4);
  const rows = [];
  let current = [];
  let currentWidth = 0;
  for (const game of games) {
    const nextWidth = currentWidth + (current.length ? style.gameGap : 0) + game.width;
    if (current.length && nextWidth > targetWidth) {
      rows.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push(game);
    currentWidth += (current.length > 1 ? style.gameGap : 0) + game.width;
  }
  if (current.length) rows.push(current);

  const rowSizes = rows.map((row) => ({
    width: row.reduce((sum, game, index) => sum + game.width + (index ? style.gameGap : 0), 0),
    height: Math.max(...row.map((game) => game.height), 1)
  }));
  const width = Math.max(...rowSizes.map((row) => row.width), 1);
  const height = rowSizes.reduce((sum, row, index) => sum + row.height + (index ? style.gameGap : 0), 0);
  const placedGames = [];
  let y = 0;
  rows.forEach((row, rowIndex) => {
    const rowSize = rowSizes[rowIndex];
    let x = (width - rowSize.width) / 2;
    for (const game of row) {
      placedGames.push({ ...game, x, y });
      x += game.width + style.gameGap;
    }
    y += rowSize.height + style.gameGap;
  });

  return {
    width,
    height,
    games: placedGames,
    style
  };
}
