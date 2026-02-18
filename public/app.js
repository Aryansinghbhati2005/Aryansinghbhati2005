const rows = 5;
const cols = 9;

const defenses = {
  cannon: {
    key: 'cannon',
    name: 'Cannon',
    icon: '🛡️',
    cost: { gold: 120, elixir: 0 },
    hp: 90,
    damage: 18,
    range: 3,
    attackSpeed: 1200
  },
  archer: {
    key: 'archer',
    name: 'Archer Tower',
    icon: '🏹',
    cost: { gold: 85, elixir: 20 },
    hp: 65,
    damage: 12,
    range: 4,
    attackSpeed: 850
  }
};

const troops = {
  barbarian: {
    key: 'barbarian',
    name: 'Barbarian Squad',
    icon: '⚔️',
    cost: { gold: 0, elixir: 55 },
    damage: 40
  },
  giant: {
    key: 'giant',
    name: 'Giant Push',
    icon: '🪨',
    cost: { gold: 30, elixir: 90 },
    damage: 75
  }
};

const state = {
  gold: 350,
  elixir: 200,
  trophies: 0,
  baseHp: 100,
  wave: 0,
  selectedDefense: null,
  isWaveActive: false,
  grid: Array.from({ length: rows * cols }, (_, idx) => ({ id: idx, tower: null, enemy: null })),
  enemies: [],
  towers: [],
  intervals: []
};

const ui = {
  battlefield: document.getElementById('battlefield'),
  buildCards: document.getElementById('buildCards'),
  troopCards: document.getElementById('troopCards'),
  gold: document.getElementById('gold'),
  elixir: document.getElementById('elixir'),
  trophies: document.getElementById('trophies'),
  baseHp: document.getElementById('baseHp'),
  wave: document.getElementById('wave'),
  logList: document.getElementById('logList'),
  startWaveBtn: document.getElementById('startWaveBtn')
};

function log(message, bad = false) {
  const item = document.createElement('li');
  item.textContent = message;
  if (bad) item.classList.add('bad');
  ui.logList.prepend(item);
  while (ui.logList.children.length > 10) ui.logList.lastChild.remove();
}

function affordable(cost) {
  return state.gold >= cost.gold && state.elixir >= cost.elixir;
}

function spend(cost) {
  state.gold -= cost.gold;
  state.elixir -= cost.elixir;
}

function renderHud() {
  ui.gold.textContent = state.gold;
  ui.elixir.textContent = state.elixir;
  ui.trophies.textContent = state.trophies;
  ui.baseHp.textContent = Math.max(state.baseHp, 0);
  ui.wave.textContent = state.wave;
  ui.startWaveBtn.disabled = state.isWaveActive || state.baseHp <= 0;
}

function buildCards() {
  ui.buildCards.innerHTML = '';
  Object.values(defenses).forEach(defense => {
    const btn = document.createElement('button');
    btn.className = `unit-card ${state.selectedDefense === defense.key ? 'selected' : ''}`;
    btn.innerHTML = `${defense.icon} <strong>${defense.name}</strong><br><small>Cost: ${defense.cost.gold}G / ${defense.cost.elixir}E • DMG ${defense.damage}</small>`;
    btn.addEventListener('click', () => {
      state.selectedDefense = defense.key;
      buildCards();
    });
    ui.buildCards.appendChild(btn);
  });
}

function buildTroopCards() {
  ui.troopCards.innerHTML = '';
  Object.values(troops).forEach(troop => {
    const btn = document.createElement('button');
    btn.className = 'unit-card';
    btn.innerHTML = `${troop.icon} <strong>${troop.name}</strong><br><small>Cost: ${troop.cost.gold}G / ${troop.cost.elixir}E • Strike ${troop.damage}</small>`;
    btn.addEventListener('click', () => deployTroop(troop));
    ui.troopCards.appendChild(btn);
  });
}

function renderBattlefield() {
  ui.battlefield.innerHTML = '';
  state.grid.forEach(tile => {
    const el = document.createElement('button');
    el.className = 'tile';
    if (tile.tower) el.classList.add('tower');
    if (tile.enemy) el.classList.add('enemy');

    if (tile.enemy) {
      el.textContent = `${tile.enemy.icon} ${tile.enemy.name}`;
      const hp = document.createElement('span');
      hp.className = 'hp';
      hp.textContent = `HP ${Math.max(0, Math.round(tile.enemy.hp))}`;
      el.appendChild(hp);
    } else if (tile.tower) {
      el.textContent = `${tile.tower.icon} ${tile.tower.name}`;
      const hp = document.createElement('span');
      hp.className = 'hp';
      hp.textContent = `HP ${Math.max(0, Math.round(tile.tower.hp))}`;
      el.appendChild(hp);
    } else {
      el.textContent = '+';
    }

    el.addEventListener('click', () => placeDefense(tile.id));
    ui.battlefield.appendChild(el);
  });
}

function placeDefense(tileId) {
  if (!state.selectedDefense) {
    log('Select a defense first.');
    return;
  }

  const tile = state.grid[tileId];
  if (tile.enemy || tile.tower) {
    log('Tile is occupied.');
    return;
  }

  const col = tileId % cols;
  if (col > cols - 3) {
    log('You can build only on your village side (left 7 columns).');
    return;
  }

  const defense = defenses[state.selectedDefense];
  if (!affordable(defense.cost)) {
    log('Not enough resources to build that defense.', true);
    return;
  }

  spend(defense.cost);
  const tower = {
    ...defense,
    id: `${defense.key}-${Date.now()}-${Math.random()}`,
    tileId,
    cooldown: 0
  };
  tile.tower = tower;
  state.towers.push(tower);
  log(`${defense.name} built at tile ${tileId + 1}.`);
  render();
}

function spawnWave() {
  state.wave += 1;
  state.isWaveActive = true;
  renderHud();

  const count = Math.min(3 + state.wave, 10);
  for (let i = 0; i < count; i += 1) {
    setTimeout(() => {
      const row = i % rows;
      const tileId = row * cols + (cols - 1);
      const enemy = {
        id: `enemy-${Date.now()}-${Math.random()}`,
        name: state.wave % 3 === 0 ? 'Balloon' : 'Raider',
        icon: state.wave % 3 === 0 ? '🎈' : '👹',
        hp: 45 + state.wave * 15,
        damage: 8 + state.wave * 2,
        speed: 1,
        tileId
      };
      if (!state.grid[tileId].enemy) {
        state.grid[tileId].enemy = enemy;
        state.enemies.push(enemy);
      }
      renderBattlefield();
    }, i * 900);
  }

  log(`Wave ${state.wave} started: ${count} enemies incoming!`, true);
}

function towersAttackTick() {
  state.towers.forEach(tower => {
    tower.cooldown -= 250;
    if (tower.cooldown > 0) return;

    const towerRow = Math.floor(tower.tileId / cols);
    const towerCol = tower.tileId % cols;

    const target = state.enemies.find(enemy => {
      const enemyRow = Math.floor(enemy.tileId / cols);
      const enemyCol = enemy.tileId % cols;
      const rowDistance = Math.abs(enemyRow - towerRow);
      const colDistance = Math.abs(enemyCol - towerCol);
      return rowDistance <= 1 && colDistance <= tower.range;
    });

    if (!target) return;

    target.hp -= tower.damage;
    tower.cooldown = tower.attackSpeed;

    if (target.hp <= 0) {
      const tile = state.grid[target.tileId];
      if (tile?.enemy?.id === target.id) tile.enemy = null;
      state.enemies = state.enemies.filter(enemy => enemy.id !== target.id);
      state.gold += 22;
      state.elixir += 10;
      state.trophies += 2;
      log(`${tower.name} destroyed an enemy. +22 gold +10 elixir +2 trophies`);
    }
  });
}

function enemiesMoveTick() {
  const occupiedAfterMove = new Set();
  const shuffled = [...state.enemies].sort((a, b) => a.tileId - b.tileId);

  shuffled.forEach(enemy => {
    const currentTile = state.grid[enemy.tileId];
    if (currentTile?.enemy?.id === enemy.id) currentTile.enemy = null;

    let nextTileId = enemy.tileId - enemy.speed;
    if (nextTileId < 0) {
      state.baseHp -= enemy.damage;
      log(`Enemy hit your base for ${enemy.damage} damage!`, true);
      state.enemies = state.enemies.filter(e => e.id !== enemy.id);
      return;
    }

    if (occupiedAfterMove.has(nextTileId)) nextTileId = enemy.tileId;

    const nextTile = state.grid[nextTileId];
    if (nextTile.tower) {
      nextTile.tower.hp -= enemy.damage;
      log(`${enemy.name} attacked ${nextTile.tower.name} for ${enemy.damage}.`, true);
      if (nextTile.tower.hp <= 0) {
        state.towers = state.towers.filter(t => t.id !== nextTile.tower.id);
        log(`${nextTile.tower.name} has been destroyed!`, true);
        nextTile.tower = null;
      }
      nextTileId = enemy.tileId;
    }

    enemy.tileId = nextTileId;
    occupiedAfterMove.add(nextTileId);
    state.grid[nextTileId].enemy = enemy;
  });
}

function deployTroop(troop) {
  if (!state.isWaveActive) {
    log('Troops can only be deployed during an active raid.');
    return;
  }

  if (!affordable(troop.cost)) {
    log('Not enough resources for that troop.', true);
    return;
  }

  if (!state.enemies.length) {
    log('No enemies to target right now.');
    return;
  }

  spend(troop.cost);
  const target = state.enemies.reduce((lowest, current) => (current.hp < lowest.hp ? current : lowest));
  target.hp -= troop.damage;
  log(`${troop.name} struck ${target.name} for ${troop.damage} damage.`);

  if (target.hp <= 0) {
    state.grid[target.tileId].enemy = null;
    state.enemies = state.enemies.filter(enemy => enemy.id !== target.id);
    state.trophies += 3;
    state.gold += 15;
    log(`${target.name} was eliminated by your troop.`);
  }

  render();
}

function evaluateWaveState() {
  if (state.baseHp <= 0) {
    clearIntervals();
    state.isWaveActive = false;
    log('Your village has fallen. Refresh the page to play again.', true);
    render();
    return;
  }

  if (state.isWaveActive && state.enemies.length === 0) {
    state.isWaveActive = false;
    state.gold += 60 + state.wave * 10;
    state.elixir += 35 + state.wave * 5;
    state.trophies += 5;
    log(`Wave ${state.wave} cleared! Bonus resources awarded.`);
    render();
  }
}

function clearIntervals() {
  state.intervals.forEach(id => clearInterval(id));
  state.intervals = [];
}

function startLoop() {
  clearIntervals();
  state.intervals.push(
    setInterval(() => {
      if (!state.isWaveActive) return;
      towersAttackTick();
      enemiesMoveTick();
      evaluateWaveState();
      renderBattlefield();
      renderHud();
    }, 250)
  );
}

function render() {
  renderHud();
  buildCards();
  buildTroopCards();
  renderBattlefield();
}

ui.startWaveBtn.addEventListener('click', () => {
  if (state.isWaveActive || state.baseHp <= 0) return;
  spawnWave();
  startLoop();
});

log('Welcome Chief! Build defenses, then start a raid wave.');
render();
