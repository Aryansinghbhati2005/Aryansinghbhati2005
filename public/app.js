const els = {
  resourceGrid: document.getElementById('resourceGrid'),
  villageSummary: document.getElementById('villageSummary'),
  buildingsGrid: document.getElementById('buildingsGrid'),
  troopsGrid: document.getElementById('troopsGrid'),
  battleLog: document.getElementById('battleLog'),
  raidBtn: document.getElementById('raidBtn'),
  resetBtn: document.getElementById('resetBtn'),
  toast: document.getElementById('toast')
};

let state = null;

function prettyName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase())
    .trim();
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Math.floor(value));
}

function showToast(message, type = 'ok') {
  els.toast.textContent = message;
  els.toast.className = `toast show ${type}`;
  setTimeout(() => {
    els.toast.classList.remove('show');
  }, 2200);
}

function renderResources(resources, rates) {
  const resourceTiles = [
    {
      name: 'Gold',
      value: `${formatNumber(resources.gold)} / ${formatNumber(resources.goldCap)}`,
      className: 'gold',
      extra: `+${rates.gold}/sec`
    },
    {
      name: 'Elixir',
      value: `${formatNumber(resources.elixir)} / ${formatNumber(resources.elixirCap)}`,
      className: 'elixir',
      extra: `+${rates.elixir}/sec`
    },
    {
      name: 'Gems',
      value: formatNumber(resources.gems),
      className: 'gems',
      extra: 'Premium currency'
    }
  ];

  els.resourceGrid.innerHTML = resourceTiles
    .map(
      tile => `
      <div class="resource-tile">
        <small>${tile.name}</small>
        <div class="resource-value ${tile.className}">${tile.value}</div>
        <small>${tile.extra}</small>
      </div>
    `
    )
    .join('');
}

function renderSummary(gameState) {
  const stats = [
    { label: 'Village', value: gameState.villageName },
    { label: 'Power', value: formatNumber(gameState.derived.power) },
    { label: 'Trophies', value: formatNumber(gameState.stats.trophies) },
    { label: 'Wins', value: formatNumber(gameState.stats.wins) },
    { label: 'Losses', value: formatNumber(gameState.stats.losses) },
    { label: 'Total Attacks', value: formatNumber(gameState.stats.attacks) }
  ];

  els.villageSummary.innerHTML = stats
    .map(
      stat => `
      <div class="stat-tile">
        <small>${stat.label}</small>
        <div>${stat.value}</div>
      </div>
    `
    )
    .join('');
}

function renderBuildings(gameState) {
  const costs = gameState.derived.nextUpgradeCosts;

  els.buildingsGrid.innerHTML = Object.entries(gameState.buildings)
    .map(([name, level]) => {
      const cost = costs[name];
      const maxed = cost === null;
      return `
        <div class="entity">
          <h3>${prettyName(name)}</h3>
          <small>Level ${level}</small>
          <small class="cost">${maxed ? 'Max level reached' : `Upgrade: ${formatNumber(cost)} gold`}</small>
          <button class="small" data-upgrade="${name}" ${maxed ? 'disabled' : ''}>Upgrade</button>
        </div>
      `;
    })
    .join('');

  document.querySelectorAll('[data-upgrade]').forEach(button => {
    button.addEventListener('click', async () => {
      const building = button.dataset.upgrade;
      const result = await apiRequest('/api/game/upgrade', {
        method: 'POST',
        body: JSON.stringify({ building })
      });

      if (result.ok) {
        showToast(`${prettyName(building)} upgraded!`, 'ok');
        state = result.state;
        render(state);
      } else {
        showToast(result.error || 'Upgrade failed', 'error');
      }
    });
  });
}

function renderTroops(gameState) {
  const troopTypes = ['barbarian', 'archer', 'giant'];

  els.troopsGrid.innerHTML = troopTypes
    .map(
      type => `
      <div class="entity">
        <h3>${prettyName(type)}</h3>
        <small>Available: ${formatNumber(gameState.troops[type])}</small>
        <small class="cost">Train 5 units</small>
        <button class="small" data-train="${type}">Train (x5)</button>
      </div>
    `
    )
    .join('');

  document.querySelectorAll('[data-train]').forEach(button => {
    button.addEventListener('click', async () => {
      const type = button.dataset.train;
      const result = await apiRequest('/api/game/train', {
        method: 'POST',
        body: JSON.stringify({ type, qty: 5 })
      });

      if (result.ok) {
        showToast(`Trained 5 ${prettyName(type)}s.`, 'ok');
        state = result.state;
        render(state);
      } else {
        showToast(result.error || 'Training failed', 'error');
      }
    });
  });
}

function renderBattleLog(logs) {
  if (!logs.length) {
    els.battleLog.innerHTML = '<p class="muted">No battles yet. Launch a raid to start your legend.</p>';
    return;
  }

  els.battleLog.innerHTML = logs
    .map(
      log => `
      <div class="log-entry">
        <div>${log.message}</div>
        <time>${new Date(log.at).toLocaleString()}</time>
      </div>
    `
    )
    .join('');
}

function render(gameState) {
  renderResources(gameState.resources, gameState.derived.mineRatesPerSecond);
  renderSummary(gameState);
  renderBuildings(gameState);
  renderTroops(gameState);
  renderBattleLog(gameState.battleLog);
}

async function apiRequest(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };

  const res = await fetch(url, config);
  return res.json();
}

async function loadGame() {
  state = await apiRequest('/api/game');
  render(state);
}

els.raidBtn.addEventListener('click', async () => {
  const result = await apiRequest('/api/game/raid', { method: 'POST' });

  if (!result.ok) {
    showToast(result.error || 'Raid failed', 'error');
    return;
  }

  state = result.state;
  render(state);

  const outcome = result.outcome;
  if (outcome.won) {
    showToast(`Victory! Looted ${outcome.loot.gold} gold and ${outcome.loot.elixir} elixir.`, 'ok');
  } else {
    showToast('Defeat! Your village suffered losses.', 'error');
  }
});

els.resetBtn.addEventListener('click', async () => {
  const result = await apiRequest('/api/game/reset', { method: 'POST' });
  state = result.state;
  render(state);
  showToast('Village reset complete.', 'ok');
});

loadGame();
setInterval(loadGame, 5000);
