import { visibleLiveCampaignIds } from '../data/liveHistory.js';
import { campaignGroupLabel } from '../data/campaignGrouping.js';
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
  gameCollapsedWidth: 360,
  gameCollapsedHeight: 58,
  environmentCollapsedHeight: 42,
  campaignCollapsedHeight: 34,
  timelinePadX: 70,
  timelinePadY: 34,
  timelineGap: 34,
  timelineYearSize: 18,
  minMapWidth: 72,
  minMapHeight: 34
};

export const GAME_RELEASE_YEARS = {
  tmo: 2003,
  tms: 2005,
  tmn: 2006,
  tmnf: 2008,
  tmuf: 2008,
  tm2: 2011,
  tm2020: 2020
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
    String(campaignGroupLabel(a)).localeCompare(String(campaignGroupLabel(b))) ||
    ((a.order ?? a.difficulty) - (b.order ?? b.difficulty)) ||
    (a.difficulty - b.difficulty) ||
    String(a.environment).localeCompare(String(b.environment)) ||
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

function layoutCampaign(campaign, measureText, style, expanded = false) {
  const title = campaign.shortLabel ?? campaign.tierCode ?? campaign.name;
  const titleWidth = textWidth(measureText, title, style.campaignTitleSize, 900) + style.campaignPad * 2;
  if (!expanded) {
    const width = Math.max(style.minMapWidth, titleWidth);
    return {
      campaign,
      title,
      width,
      height: style.campaignCollapsedHeight,
      titleHeight: style.campaignCollapsedHeight,
      expanded: false,
      maps: []
    };
  }
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
    expanded: true,
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

function layoutEnvironment(game, environment, campaigns, measureText, style, expanded = false, selectedCampaignId = null) {
  const environmentTitleWidth = textWidth(measureText, environment, style.environmentTitleSize, 900);
  if (!expanded) {
    const width = Math.max(180, environmentTitleWidth + style.environmentPad * 2);
    return {
      environment,
      x: 0,
      y: 0,
      width,
      height: style.environmentCollapsedHeight,
      title: environment,
      titleX: width / 2,
      titleY: style.environmentCollapsedHeight / 2,
      expanded: false,
      campaigns: []
    };
  }
  const campaignLayouts = sortCampaigns(campaigns).map((campaign) => (
    layoutCampaign(campaign, measureText, style, campaign.id === selectedCampaignId)
  ));
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
    expanded: true,
    campaigns: campaignPlacements
  };
}

function layoutGame(game, campaigns, measureText, style, selectedPath) {
  const releaseYear = GAME_RELEASE_YEARS[game.id] ?? game.releaseYear ?? Number.parseInt(game.releaseYear, 10) ?? 0;
  const gameTitleWidth = textWidth(measureText, game.name, style.gameTitleSize, 900);
  if (game.id !== selectedPath.gameId) {
    const width = Math.max(style.gameCollapsedWidth, gameTitleWidth + style.gamePad * 2);
    return {
      game,
      x: 0,
      y: 0,
      width,
      height: style.gameCollapsedHeight,
      releaseYear,
      title: game.name,
      titleX: width / 2,
      titleY: style.gameCollapsedHeight / 2,
      expanded: false,
      environments: []
    };
  }
  const groups = groupBy(campaigns, campaignGroupLabel);
  const environmentLayouts = environmentOrder(game, groups).map((environment) => (
    layoutEnvironment(
      game,
      environment,
      groups.get(environment),
      measureText,
      style,
      environment === selectedPath.environment,
      selectedPath.campaignId
    )
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
    releaseYear,
    title: game.name,
    titleX: style.gamePad + contentWidth / 2,
    titleY: style.gamePad + style.gameTitleSize,
    expanded: true,
    environments: placedEnvironments
  };
}

export function buildFlatAtlasLayout(state, measureText, style = FLAT_ATLAS_STYLE) {
  const selectedPath = {
    gameId: state.selectedGameId ?? state.atlas.games[0]?.id ?? null,
    environment: state.selectedRegion ?? null,
    campaignId: state.selectedCampaignId ?? null
  };
  const games = state.atlas.games
    .map((game) => layoutGame(game, visibleCampaigns(state, game), measureText, style, selectedPath))
    .sort((a, b) => (a.releaseYear - b.releaseYear) || a.game.id.localeCompare(b.game.id));
  const yearWidth = Math.max(
    ...games.map((game) => textWidth(measureText, String(game.releaseYear), style.timelineYearSize, 900)),
    1
  );
  const width = style.timelinePadX * 2 + yearWidth + Math.max(...games.map((game) => game.width), 1);
  const height = style.timelinePadY * 2 +
    games.reduce((sum, game, index) => sum + game.height + (index ? style.timelineGap : 0), 0);
  const placedGames = [];
  const timelineX = style.timelinePadX + yearWidth / 2;
  const gameX = style.timelinePadX + yearWidth + style.gameGap;
  let y = style.timelinePadY;
  for (const game of games) {
    placedGames.push({
      ...game,
      x: gameX,
      y,
      yearX: timelineX,
      yearY: y + Math.min(game.height / 2, style.gamePad + style.gameTitleSize)
    });
    y += game.height + style.timelineGap;
  }

  return {
    width,
    height,
    timeline: {
      x: timelineX,
      top: placedGames[0]?.yearY ?? style.timelinePadY,
      bottom: placedGames.at(-1)?.yearY ?? style.timelinePadY,
      years: placedGames.map((game) => ({
        gameId: game.game.id,
        year: game.releaseYear,
        x: game.yearX,
        y: game.yearY
      }))
    },
    games: placedGames,
    style
  };
}
