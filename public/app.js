const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const statusEl = document.getElementById('status');

const tileCount = 20;
const tileSize = canvas.width / tileCount;

let snake;
let direction;
let nextDirection;
let food;
let score;
let gameOver;
let started;

const bestFromStorage = Number(localStorage.getItem('snakeBest') || 0);
let bestScore = Number.isFinite(bestFromStorage) ? bestFromStorage : 0;
bestScoreEl.textContent = String(bestScore);

function randomTile() {
  return {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount)
  };
}

function spawnFood() {
  let pos = randomTile();
  while (snake.some(part => part.x === pos.x && part.y === pos.y)) {
    pos = randomTile();
  }
  return pos;
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  food = spawnFood();
  score = 0;
  gameOver = false;
  started = false;
  scoreEl.textContent = '0';
  statusEl.textContent = 'Press any arrow key to start.';
}

function drawRect(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
}

function draw() {
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawRect(food.x, food.y, '#ef4444');
  snake.forEach((part, index) => drawRect(part.x, part.y, index === 0 ? '#16a34a' : '#22c55e'));
}

function tick() {
  if (!started || gameOver) {
    draw();
    return;
  }

  direction = nextDirection;

  const head = {
    x: (snake[0].x + direction.x + tileCount) % tileCount,
    y: (snake[0].y + direction.y + tileCount) % tileCount
  };

  const hitSelf = snake.some(part => part.x === head.x && part.y === head.y);
  if (hitSelf) {
    gameOver = true;
    statusEl.textContent = 'Game Over! Press Space to restart.';
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('snakeBest', String(bestScore));
      bestScoreEl.textContent = String(bestScore);
    }
    draw();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = String(score);
    food = spawnFood();
  } else {
    snake.pop();
  }

  draw();
}

window.addEventListener('keydown', event => {
  const keyMap = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 }
  };

  if (event.code === 'Space' && gameOver) {
    resetGame();
    draw();
    return;
  }

  const move = keyMap[event.key];
  if (!move) {
    return;
  }

  if (!started) {
    started = true;
    statusEl.textContent = 'Collect food and avoid hitting yourself!';
  }

  const reversing = move.x === -direction.x && move.y === -direction.y;
  if (!reversing) {
    nextDirection = move;
  }
});

resetGame();
draw();
setInterval(tick, 120);
