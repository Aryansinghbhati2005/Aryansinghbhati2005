const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

const publicDir = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const GAME_CONFIG = {
  resourceCaps: {
    gold: 40000,
    elixir: 40000
  },
  mineRates: {
    gold: [6, 11, 18, 28],
    elixir: [5, 10, 17, 26]
  },
  storageCaps: {
    gold: [12000, 22000, 32000, 40000],
    elixir: [12000, 22000, 32000, 40000]
  },
  troopStats: {
    barbarian: {
      trainGold: 120,
      trainElixir: 50,
      power: 16
    },
    archer: {
      trainGold: 95,
      trainElixir: 75,
      power: 15
    },
    giant: {
      trainGold: 240,
      trainElixir: 170,
      power: 32
    }
  },
  buildingCosts: {
    townHall: [0, 5000, 12000],
    goldMine: [0, 1500, 3500, 7200],
    elixirPump: [0, 1500, 3400, 7000],
    goldStorage: [0, 1200, 2800, 6200],
    elixirStorage: [0, 1200, 2800, 6200],
    barracks: [0, 2000, 4500, 8200],
    cannon: [0, 1800, 4200, 8000],
    archerTower: [0, 1900, 4300, 8400]
  }
};

function createInitialState() {
  return {
    villageName: 'My Stronghold',
    resources: {
      gold: 7000,
      elixir: 6500,
      gems: 150
    },
    buildings: {
      townHall: 1,
      goldMine: 1,
      elixirPump: 1,
      goldStorage: 1,
      elixirStorage: 1,
      barracks: 1,
      cannon: 1,
      archerTower: 1
    },
    troops: {
      barbarian: 14,
      archer: 10,
      giant: 4
    },
    stats: {
      trophies: 560,
      wins: 0,
      losses: 0,
      attacks: 0,
      defenses: 0
    },
    battleLog: [],
    lastTick: Date.now()
  };
}

const gameState = createInitialState();

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function addBattleLog(message) {
  gameState.battleLog.unshift({
    message,
    at: new Date().toISOString()
  });

  gameState.battleLog = gameState.battleLog.slice(0, 12);
}

function effectiveStorage(resourceType) {
  const storageLevel = gameState.buildings[resourceType === 'gold' ? 'goldStorage' : 'elixirStorage'];
  const caps = GAME_CONFIG.storageCaps[resourceType];
  return caps[storageLevel - 1] || GAME_CONFIG.resourceCaps[resourceType];
}

function applyPassiveIncome() {
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - gameState.lastTick) / 1000);

  if (elapsedSeconds <= 0) {
    return;
  }

  const goldIncome = GAME_CONFIG.mineRates.gold[gameState.buildings.goldMine - 1] || 0;
  const elixirIncome = GAME_CONFIG.mineRates.elixir[gameState.buildings.elixirPump - 1] || 0;

  const goldCap = effectiveStorage('gold');
  const elixirCap = effectiveStorage('elixir');

  gameState.resources.gold = clamp(
    gameState.resources.gold + elapsedSeconds * goldIncome,
    0,
    goldCap
  );
  gameState.resources.elixir = clamp(
    gameState.resources.elixir + elapsedSeconds * elixirIncome,
    0,
    elixirCap
  );

  gameState.lastTick = now;
}

function getVillagePower() {
  const troopPower =
    gameState.troops.barbarian * GAME_CONFIG.troopStats.barbarian.power +
    gameState.troops.archer * GAME_CONFIG.troopStats.archer.power +
    gameState.troops.giant * GAME_CONFIG.troopStats.giant.power;

  const defensePower =
    gameState.buildings.cannon * 45 +
    gameState.buildings.archerTower * 50 +
    gameState.buildings.townHall * 30;

  return troopPower + defensePower;
}

function serializeState() {
  applyPassiveIncome();

  const power = getVillagePower();
  const nextCosts = {};

  Object.entries(gameState.buildings).forEach(([name, level]) => {
    const table = GAME_CONFIG.buildingCosts[name];
    nextCosts[name] = table[level] || null;
  });

  return {
    villageName: gameState.villageName,
    resources: {
      ...gameState.resources,
      goldCap: effectiveStorage('gold'),
      elixirCap: effectiveStorage('elixir')
    },
    buildings: gameState.buildings,
    troops: gameState.troops,
    stats: gameState.stats,
    derived: {
      power,
      mineRatesPerSecond: {
        gold: GAME_CONFIG.mineRates.gold[gameState.buildings.goldMine - 1] || 0,
        elixir: GAME_CONFIG.mineRates.elixir[gameState.buildings.elixirPump - 1] || 0
      },
      nextUpgradeCosts: nextCosts
    },
    battleLog: gameState.battleLog,
    updatedAt: new Date().toISOString()
  };
}

function upgradeBuilding(buildingName) {
  const currentLevel = gameState.buildings[buildingName];

  if (!currentLevel) {
    return { ok: false, error: 'Unknown building.' };
  }

  const costs = GAME_CONFIG.buildingCosts[buildingName];
  const cost = costs[currentLevel];

  if (!cost) {
    return { ok: false, error: `${buildingName} is already max level.` };
  }

  if (gameState.resources.gold < cost) {
    return { ok: false, error: 'Not enough gold for upgrade.' };
  }

  gameState.resources.gold -= cost;
  gameState.buildings[buildingName] += 1;

  addBattleLog(`🏗️ Upgraded ${buildingName} to level ${gameState.buildings[buildingName]}.`);

  return { ok: true };
}

function trainTroops(type, qty) {
  const troop = GAME_CONFIG.troopStats[type];

  if (!troop) {
    return { ok: false, error: 'Unknown troop type.' };
  }

  const amount = Number(qty);

  if (!Number.isInteger(amount) || amount < 1 || amount > 50) {
    return { ok: false, error: 'Quantity should be between 1 and 50.' };
  }

  const totalGold = amount * troop.trainGold;
  const totalElixir = amount * troop.trainElixir;

  if (gameState.resources.gold < totalGold || gameState.resources.elixir < totalElixir) {
    return { ok: false, error: 'Not enough resources to train troops.' };
  }

  gameState.resources.gold -= totalGold;
  gameState.resources.elixir -= totalElixir;
  gameState.troops[type] += amount;

  addBattleLog(`⚔️ Trained ${amount} ${type}(s).`);

  return { ok: true };
}

function raidEnemy() {
  const enemies = [
    { name: 'Goblin Outpost', power: 360, loot: { gold: 650, elixir: 430 } },
    { name: 'Forest Keep', power: 520, loot: { gold: 980, elixir: 760 } },
    { name: 'Bandit Town', power: 740, loot: { gold: 1400, elixir: 1100 } },
    { name: 'Iron Fortress', power: 980, loot: { gold: 1820, elixir: 1500 } }
  ];

  const opponent = enemies[Math.floor(Math.random() * enemies.length)];

  const myArmy =
    gameState.troops.barbarian * GAME_CONFIG.troopStats.barbarian.power +
    gameState.troops.archer * GAME_CONFIG.troopStats.archer.power +
    gameState.troops.giant * GAME_CONFIG.troopStats.giant.power;

  if (myArmy < 90) {
    return { ok: false, error: 'Your army is too small. Train more troops first.' };
  }

  const battleScore = myArmy * (0.82 + Math.random() * 0.35);
  const won = battleScore >= opponent.power;

  gameState.stats.attacks += 1;

  const usedBarbs = Math.max(1, Math.floor(gameState.troops.barbarian * 0.16));
  const usedArchers = Math.max(1, Math.floor(gameState.troops.archer * 0.16));
  const usedGiants = Math.max(1, Math.floor(gameState.troops.giant * 0.12));

  const casualtyFactor = won ? 0.4 : 0.75;

  const barbLoss = Math.min(gameState.troops.barbarian, Math.floor(usedBarbs * casualtyFactor));
  const archerLoss = Math.min(gameState.troops.archer, Math.floor(usedArchers * casualtyFactor));
  const giantLoss = Math.min(gameState.troops.giant, Math.floor(usedGiants * casualtyFactor));

  gameState.troops.barbarian -= barbLoss;
  gameState.troops.archer -= archerLoss;
  gameState.troops.giant -= giantLoss;

  if (won) {
    gameState.stats.wins += 1;
    gameState.stats.trophies += 18;

    gameState.resources.gold = clamp(
      gameState.resources.gold + opponent.loot.gold,
      0,
      effectiveStorage('gold')
    );
    gameState.resources.elixir = clamp(
      gameState.resources.elixir + opponent.loot.elixir,
      0,
      effectiveStorage('elixir')
    );

    addBattleLog(`🏆 Victory vs ${opponent.name}! +${opponent.loot.gold} gold, +${opponent.loot.elixir} elixir.`);

    return {
      ok: true,
      result: {
        won: true,
        opponent,
        loot: opponent.loot,
        losses: {
          barbarian: barbLoss,
          archer: archerLoss,
          giant: giantLoss
        }
      }
    };
  }

  gameState.stats.losses += 1;
  gameState.stats.trophies = Math.max(0, gameState.stats.trophies - 14);

  const stolenGold = Math.min(gameState.resources.gold, 320);
  const stolenElixir = Math.min(gameState.resources.elixir, 280);

  gameState.resources.gold -= stolenGold;
  gameState.resources.elixir -= stolenElixir;

  addBattleLog(`💥 Defeat vs ${opponent.name}. Lost ${stolenGold} gold and ${stolenElixir} elixir.`);

  return {
    ok: true,
    result: {
      won: false,
      opponent,
      loot: {
        gold: -stolenGold,
        elixir: -stolenElixir
      },
      losses: {
        barbarian: barbLoss,
        archer: archerLoss,
        giant: giantLoss
      }
    }
  };
}

async function handleApi(req, res, parsedUrl) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return true;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/game') {
    sendJson(res, 200, serializeState());
    return true;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/game/reset') {
    const fresh = createInitialState();
    Object.assign(gameState, fresh);
    sendJson(res, 200, { ok: true, state: serializeState() });
    return true;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/game/upgrade') {
    try {
      applyPassiveIncome();
      const body = await parseRequestBody(req);
      const result = upgradeBuilding(body.building);

      if (!result.ok) {
        sendJson(res, 400, result);
        return true;
      }

      sendJson(res, 200, { ok: true, state: serializeState() });
      return true;
    } catch (error) {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
      return true;
    }
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/game/train') {
    try {
      applyPassiveIncome();
      const body = await parseRequestBody(req);
      const result = trainTroops(body.type, body.qty);

      if (!result.ok) {
        sendJson(res, 400, result);
        return true;
      }

      sendJson(res, 200, { ok: true, state: serializeState() });
      return true;
    } catch (error) {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
      return true;
    }
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/game/raid') {
    applyPassiveIncome();
    const result = raidEnemy();

    if (!result.ok) {
      sendJson(res, 400, result);
      return true;
    }

    sendJson(res, 200, { ok: true, outcome: result.result, state: serializeState() });
    return true;
  }

  return false;
}

function serveStatic(req, res, parsedUrl) {
  let pathname = parsedUrl.pathname;

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const normalizedPath = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(publicDir, normalizedPath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendJson(res, 404, { error: 'Not Found' });
      } else {
        sendJson(res, 500, { error: 'Internal Server Error' });
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream'
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  try {
    const handled = await handleApi(req, res, parsedUrl);
    if (handled) {
      return;
    }
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: 'Unexpected server error',
      details: error.message
    });
    return;
  }

  serveStatic(req, res, parsedUrl);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
