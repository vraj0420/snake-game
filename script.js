// script.js — Fixed pause/resume + robust loop management
// Replace your current file with this exact content.

// Prevent arrow keys / space from scrolling the page (important)
window.addEventListener("keydown", function (e) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
}, { passive: false });

// --- DOM refs ---
const startBtn = document.getElementById('startBtn');
const leaderBtn = document.getElementById('leaderBtn');
const menu = document.getElementById('menu');
const gameScreen = document.getElementById('gameScreen');
const gameOver = document.getElementById('gameOver');
const playAgain = document.getElementById('playAgain');
const menuBtn = document.getElementById('menuBtn');
const leaderBoardScreen = document.getElementById('leaderboard');
const clearLeaders = document.getElementById('clearLeaders');
const backFromLeaders = document.getElementById('backFromLeaders');
const leadersList = document.getElementById('leaders');
const finalScore = document.getElementById('finalScore');
const scoreUI = document.getElementById('score');
const highUI = document.getElementById('high');
const themeSelect = document.getElementById('theme');
const pauseBtn = document.getElementById('pauseBtn');
const muteBtn = document.getElementById('muteBtn');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Game constants/state ---
const GRID = 20;
const TILE = 20;
let snake = [];
let dir = 'RIGHT';
let food = null;
let score = 0;
let speed = 200;
let loopId = null;        // holds interval id
let isPaused = false;
let musicOn = false;
let highScore = Number(localStorage.getItem('snakeHigh')) || 0;
let leaders = JSON.parse(localStorage.getItem('snakeLeaders') || '[]');

const THEMES = {
  neon: { name: 'Neon', gradient: ['#00ffe1','#4cff4c','#00bfff'], food: '#ff3b3b' },
  matrix: { name: 'Matrix', gradient: ['#2ef03a','#0ef07a'], food: '#ff8d00' },
  candy: { name: 'Candy', gradient: ['#ff77d1','#ffb3e6'], food: '#ffd166' },
  retro: { name: 'Retro', gradient: ['#ffb84d','#ff5c7c'], food: '#ff5c7c' },
  dark: { name: 'Dark', gradient: ['#6ef0ff','#9bdfff'], food: '#ff4b4b' }
};
let currentTheme = 'neon';

// --- Audio ---
const eatSnd = new Audio('https://actions.google.com/sounds/v1/cartoon/pop.ogg');
const dieSnd = new Audio('https://actions.google.com/sounds/v1/cartoon/concussive_hit_guitar_boing.ogg');
const bg = new Audio('https://files.catbox.moe/p9sx1b.mp3');
bg.loop = true;
bg.volume = 0.35;

// --- Helpers for UI & storage ---
function saveLeaders() { localStorage.setItem('snakeLeaders', JSON.stringify(leaders)); }
function saveHigh() { localStorage.setItem('snakeHigh', String(highScore)); }

function showScreen(el) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('fade-in');
    s.classList.add('fade-out');
    s.setAttribute('aria-hidden', 'true');
  });
  el.classList.remove('fade-out');
  el.classList.add('fade-in');
  el.setAttribute('aria-hidden', 'false');
}

// --- Theme population/apply ---
(function populateThemes() {
  Object.keys(THEMES).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = THEMES[key].name;
    themeSelect.appendChild(opt);
  });
  themeSelect.value = currentTheme;
  applyTheme(currentTheme);
})();
themeSelect.onchange = e => applyTheme(e.target.value);
function applyTheme(key) {
  Object.keys(THEMES).forEach(k => document.documentElement.classList.remove('theme-' + k));
  document.documentElement.classList.add('theme-' + key);
  currentTheme = key;
  canvas.classList.add('glow-strong');
}

// --- Leaderboard ---
function renderLeaders() {
  leadersList.innerHTML = '';
  if (!leaders.length) {
    const li = document.createElement('li');
    li.textContent = 'No entries yet';
    leadersList.appendChild(li);
    return;
  }
  leaders.slice(0, 10).forEach(l => {
    const li = document.createElement('li');
    li.textContent = `${l.score} — ${new Date(l.when).toLocaleString()}`;
    leadersList.appendChild(li);
  });
}
function openLeaders() { renderLeaders(); showScreen(leaderBoardScreen); }

// --- Game setup functions ---
function placeFood() {
  let ok = false, x, y;
  while (!ok) {
    x = Math.floor(Math.random() * GRID);
    y = Math.floor(Math.random() * GRID);
    ok = !snake.some(s => s.x === x && s.y === y);
  }
  food = { x, y };
}
function updateHUD() {
  scoreUI.textContent = `Score: ${score}`;
  highUI.textContent = `High: ${highScore}`;
}

// --- Robust start/pause/resume/restart implementation ---
// Start the game: initialize and begin loop
function startGame() {
  snake = [{ x: 9, y: 9 }];
  dir = 'RIGHT';
  score = 0;
  speed = 200;
  isPaused = false;
  placeFood();
  updateHUD();
  canvas.style.display = 'block';
  canvas.width = GRID * TILE;
  canvas.height = GRID * TILE;

  // ensure no duplicate interval
  if (loopId) {
    clearInterval(loopId);
    loopId = null;
  }
  loopId = setInterval(tick, speed);
  console.log('Game started, loopId =', loopId);
}

// Pause the game cleanly
function pauseGame() {
  if (loopId) {
    clearInterval(loopId);
    loopId = null;
  }
  isPaused = true;
  pauseBtn.textContent = 'Resume';
  console.log('Game paused');
}

// Resume the game cleanly
function resumeGame() {
  // only start interval if none is running
  if (!loopId) {
    loopId = setInterval(tick, speed);
  }
  isPaused = false;
  pauseBtn.textContent = 'Pause';
  console.log('Game resumed, loopId =', loopId);
}

// Restart (from game over)
function restartGame() {
  showScreen(gameScreen);
  startGame();
}

// --- Keyboard input for direction (keeps functionality) ---
window.addEventListener('keydown', e => {
  if (e.key.includes('Arrow')) {
    if (e.key === 'ArrowUp' && dir !== 'DOWN') dir = 'UP';
    if (e.key === 'ArrowDown' && dir !== 'UP') dir = 'DOWN';
    if (e.key === 'ArrowLeft' && dir !== 'RIGHT') dir = 'LEFT';
    if (e.key === 'ArrowRight' && dir !== 'LEFT') dir = 'RIGHT';
  }
  // also allow spacebar to pause/resume
  if (e.key === ' ' || e.key === 'Spacebar') {
    if (isPaused) resumeGame(); else pauseGame();
  }
});

// --- Mobile swipe handling ---
let touchStart = null;
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
});
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const threshold = 30;
  if (absX > absY && absX > threshold) {
    if (dx > 0 && dir !== 'LEFT') dir = 'RIGHT';
    else if (dx < 0 && dir !== 'RIGHT') dir = 'LEFT';
  } else if (absY > absX && absY > threshold) {
    if (dy > 0 && dir !== 'UP') dir = 'DOWN';
    else if (dy < 0 && dir !== 'DOWN') dir = 'UP';
  }
  touchStart = null;
});

// --- Rendering helpers (gradient) ---
function lerpColor(a, b, t) {
  const ah = parseInt(a.replace('#',''), 16), bh = parseInt(b.replace('#',''), 16);
  const ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = bh >> 16, bgc = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t), rg = Math.round(ag + (bgc - ag) * t), rb = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const theme = THEMES[currentTheme];

  // food glow
  ctx.save();
  ctx.shadowColor = theme.food;
  ctx.shadowBlur = 18;
  ctx.fillStyle = theme.food;
  ctx.fillRect(food.x * TILE, food.y * TILE, TILE, TILE);
  ctx.restore();

  // snake gradient body
  for (let i = 0; i < snake.length; i++) {
    const s = snake[i];
    const t = i / Math.max(1, snake.length - 1);
    const g = theme.gradient;
    let color;
    if (g.length === 2) color = lerpColor(g[0], g[1], t);
    else if (g.length === 3) {
      if (t < 0.5) color = lerpColor(g[0], g[1], t * 2);
      else color = lerpColor(g[1], g[2], (t - 0.5) * 2);
    } else color = g[0];

    ctx.save();
    ctx.fillStyle = color;
    const glow = Math.max(4, 14 * (1 - (i / Math.max(1, snake.length))));
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.fillRect(s.x * TILE, s.y * TILE, TILE, TILE);
    ctx.restore();

    if (i === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      const ox = s.x * TILE, oy = s.y * TILE, es = 4;
      if (dir === 'RIGHT') { ctx.fillRect(ox + TILE - 6, oy + 5, es, es); ctx.fillRect(ox + TILE - 6, oy + TILE - 9, es, es); }
      if (dir === 'LEFT')  { ctx.fillRect(ox + 2, oy + 5, es, es); ctx.fillRect(ox + 2, oy + TILE - 9, es, es); }
      if (dir === 'UP')    { ctx.fillRect(ox + 5, oy + 2, es, es); ctx.fillRect(ox + TILE - 9, oy + 2, es, es); }
      if (dir === 'DOWN')  { ctx.fillRect(ox + 5, oy + TILE - 6, es, es); ctx.fillRect(ox + TILE - 9, oy + TILE - 6, es, es); }
    }
  }
}

// --- Main game step ---
function tick() {
  const head = { ...snake[0] };
  if (dir === 'UP') head.y--;
  if (dir === 'DOWN') head.y++;
  if (dir === 'LEFT') head.x--;
  if (dir === 'RIGHT') head.x++;

  // collisions
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || snake.some(s => s.x === head.x && s.y === head.y)) {
    die();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    eatSnd.play();
    placeFood();

    // increase speed, with cap
    speed = Math.max(60, speed - 8);
    if (loopId) { clearInterval(loopId); loopId = setInterval(tick, speed); }

    if (score > highScore) { highScore = score; saveHigh(); }
    updateHUD();
  } else {
    snake.pop();
  }

  render();
}

// --- Die / leaderboard save ---
function die() {
  if (loopId) { clearInterval(loopId); loopId = null; }
  dieSnd.play();

  leaders.unshift({ score, when: Date.now() });
  leaders = leaders.sort((a, b) => b.score - a.score).slice(0, 10);
  saveLeaders();
  renderLeaders();

  finalScore.textContent = `Score: ${score}`;
  showScreen(gameOver);
}

// --- Wire UI buttons ---
startBtn.onclick = () => { showScreen(gameScreen); startGame(); };
playAgain.onclick = () => { restartGame(); };
menuBtn.onclick = () => { showScreen(menu); };
leaderBtn.onclick = () => { openLeaders(); };
clearLeaders.onclick = () => { leaders = []; saveLeaders(); renderLeaders(); };
backFromLeaders.onclick = () => { showScreen(menu); };

pauseBtn.onclick = () => {
  if (isPaused) resumeGame(); else pauseGame();
};

muteBtn.onclick = () => {
  musicOn = !musicOn;
  if (musicOn) { bg.play(); muteBtn.textContent = 'Music: On'; }
  else { bg.pause(); muteBtn.textContent = 'Music: Off'; }
};

// --- init on load ---
(function init() {
  canvas.width = GRID * TILE;
  canvas.height = GRID * TILE;
  updateHUD();
  renderLeaders();
  showScreen(menu);
})();
