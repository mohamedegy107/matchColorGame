const CANDY_TYPES = [
  { id: 0, name: 'strawberry', classes: ['candy-strawberry', 'candy-round'] },
  { id: 1, name: 'blueberry', classes: ['candy-blueberry', 'candy-gem'] },
  { id: 2, name: 'lemon', classes: ['candy-lemon', 'candy-lozenge'] },
  { id: 3, name: 'apple', classes: ['candy-apple', 'candy-square'] },
  { id: 4, name: 'grape', classes: ['candy-grape', 'candy-flower'] },
  { id: 5, name: 'orange', classes: ['candy-orange', 'candy-pill'] }
];

const LEVELS = Array.from({ length: 12 }, (_, index) => {
  const level = index + 1;
  return {
    id: level,
    boardSize: Math.min(8 + Math.floor(index / 3), 10),
    moves: Math.max(30 - index * 2, 12),
    target: 350 + level * 180
  };
});

const ANIMATION_SPEED = {
  fast: 0.7,
  normal: 1,
  slow: 1.3
};

const {
  areAdjacent,
  createBoardWithoutMatches,
  findMatches,
  indexToCoord,
  collapseBoard,
  swapCells
} = window.GameLogic;

const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const bestEl = document.getElementById('best');
const boardEl = document.getElementById('board');
const messageEl = document.getElementById('message');
const resetBtn = document.getElementById('resetBtn');
const levelTitleEl = document.getElementById('levelTitle');
const levelGoalEl = document.getElementById('levelGoal');

const mainScreen = document.getElementById('mainScreen');
const settingsScreen = document.getElementById('settingsScreen');
const mapScreen = document.getElementById('mapScreen');
const gameScreen = document.getElementById('gameScreen');
const levelGrid = document.getElementById('levelGrid');

const playBtn = document.getElementById('playBtn');
const openLevelsBtn = document.getElementById('openLevelsBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const mapBackBtn = document.getElementById('mapBackBtn');
const backToMapBtn = document.getElementById('backToMapBtn');

const animationSpeedSelect = document.getElementById('animationSpeed');
const hintsToggle = document.getElementById('hintsToggle');

let board = [];
let selected = null;
let score = 0;
let moves = 30;
let isResolving = false;
let activeLevelIndex = 0;
let unlockedLevel = Number(localStorage.getItem('match-color-unlocked-level') ?? 1);
let bestScore = Number(localStorage.getItem('match-color-best') ?? 0);
let settings = {
  animationSpeed: localStorage.getItem('match-color-animation-speed') ?? 'normal',
  showHints: localStorage.getItem('match-color-show-hints') !== 'false'
};

bestEl.textContent = String(bestScore);
animationSpeedSelect.value = settings.animationSpeed;
hintsToggle.checked = settings.showHints;

function getActiveLevel() {
  return LEVELS[activeLevelIndex];
}

function getAnimationDelay(ms) {
  return Math.max(50, Math.floor(ms * ANIMATION_SPEED[settings.animationSpeed]));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCandyType(id) {
  return CANDY_TYPES[id];
}

function showScreen(screen) {
  const screens = [mainScreen, settingsScreen, mapScreen, gameScreen];
  for (const item of screens) {
    item.classList.toggle('hidden', item !== screen);
  }
}

function persistSettings() {
  localStorage.setItem('match-color-animation-speed', settings.animationSpeed);
  localStorage.setItem('match-color-show-hints', String(settings.showHints));
}

function updateLevelHeader() {
  const level = getActiveLevel();
  levelTitleEl.textContent = `Level ${level.id}`;
  levelGoalEl.textContent = `Target score: ${level.target} • Board: ${level.boardSize}x${level.boardSize}`;
}

function renderLevelMap() {
  levelGrid.innerHTML = '';

  for (const level of LEVELS) {
    const levelButton = document.createElement('button');
    levelButton.className = 'level-node';
    levelButton.textContent = String(level.id);

    const isUnlocked = level.id <= unlockedLevel;
    if (!isUnlocked) {
      levelButton.disabled = true;
      levelButton.classList.add('locked');
    }

    if (level.id - 1 === activeLevelIndex) {
      levelButton.classList.add('current');
    }

    levelButton.setAttribute(
      'aria-label',
      `Level ${level.id}. ${isUnlocked ? 'Unlocked' : 'Locked'}. Target ${level.target}`
    );

    levelButton.addEventListener('click', () => {
      activeLevelIndex = level.id - 1;
      startLevel();
      showScreen(gameScreen);
    });

    levelGrid.appendChild(levelButton);
  }
}

function renderBoard(options = {}) {
  const { crushed = new Set(), swapped = [] } = options;
  const level = getActiveLevel();

  boardEl.innerHTML = '';
  boardEl.style.setProperty('--board-size', String(level.boardSize));

  for (let row = 0; row < level.boardSize; row += 1) {
    for (let col = 0; col < level.boardSize; col += 1) {
      const idx = row * level.boardSize + col;
      const candyType = getCandyType(board[row][col]);
      const candy = document.createElement('button');
      candy.className = `candy ${candyType.classes.join(' ')}`;
      candy.dataset.index = String(idx);
      candy.setAttribute('aria-label', `${candyType.name} candy row ${row + 1} column ${col + 1}`);

      if (selected === idx) candy.classList.add('selected');
      if (swapped.includes(idx)) candy.classList.add('swap-in');
      if (crushed.has(idx)) candy.classList.add('crush');

      candy.addEventListener('click', () => onCellClick(idx));
      boardEl.appendChild(candy);
    }
  }
}

function animateInvalidSwap(indices) {
  for (const idx of indices) {
    const cell = boardEl.querySelector(`[data-index="${idx}"]`);
    if (cell) cell.classList.add('invalid');
  }
}

function setMessage(text = '') {
  messageEl.textContent = text;
}

function updateHud() {
  scoreEl.textContent = String(score);
  movesEl.textContent = String(moves);
  if (score > bestScore) {
    bestScore = score;
    bestEl.textContent = String(bestScore);
    localStorage.setItem('match-color-best', String(bestScore));
  }
}

function initializeBoard() {
  const level = getActiveLevel();
  board = createBoardWithoutMatches(level.boardSize, CANDY_TYPES.length);
}

async function resolveMatches(chain = 1) {
  const level = getActiveLevel();
  let matches = findMatches(board, level.boardSize);
  let totalPoints = 0;

  while (matches.size > 0) {
    const points = matches.size * 10 * chain * level.id;
    totalPoints += points;

    renderBoard({ crushed: matches });
    await sleep(getAnimationDelay(220));

    for (const match of matches) {
      const [row, col] = indexToCoord(match, level.boardSize);
      board[row][col] = null;
    }

    board = collapseBoard(board, level.boardSize, CANDY_TYPES.length);
    chain += 1;
    renderBoard();
    await sleep(getAnimationDelay(130));

    matches = findMatches(board, level.boardSize);
  }

  return totalPoints;
}

async function onCellClick(index) {
  const level = getActiveLevel();

  if (isResolving || moves <= 0) return;

  if (selected === null) {
    selected = index;
    renderBoard();
    return;
  }

  if (selected === index) {
    selected = null;
    renderBoard();
    return;
  }

  if (!areAdjacent(selected, index, level.boardSize)) {
    selected = index;
    renderBoard();
    return;
  }

  const first = selected;
  const second = index;
  selected = null;
  isResolving = true;
  setMessage('');

  swapCells(board, first, second, level.boardSize);
  renderBoard({ swapped: [first, second] });
  await sleep(getAnimationDelay(150));

  if (findMatches(board, level.boardSize).size === 0) {
    animateInvalidSwap([first, second]);
    await sleep(getAnimationDelay(230));
    swapCells(board, first, second, level.boardSize);
    renderBoard();
    setMessage('Invalid move. Try another swap.');
    isResolving = false;
    return;
  }

  moves -= 1;
  const gained = await resolveMatches(1);
  score += gained;
  updateHud();
  renderBoard();

  if (gained > 0) setMessage(`Sweet! +${gained} points`);

  if (score >= level.target) {
    unlockedLevel = Math.max(unlockedLevel, Math.min(level.id + 1, LEVELS.length));
    localStorage.setItem('match-color-unlocked-level', String(unlockedLevel));
    setMessage(`Level ${level.id} complete! Next level unlocked.`);
    renderLevelMap();
  }

  if (moves <= 0 && score < level.target) {
    setMessage(`Out of moves. You need ${level.target - score} more points.`);
  }

  isResolving = false;
}

function startLevel() {
  const level = getActiveLevel();
  score = 0;
  moves = level.moves;
  selected = null;
  isResolving = false;
  setMessage(
    settings.showHints
      ? `Level ${level.id}: reach ${level.target} points in ${level.moves} moves.`
      : ''
  );
  initializeBoard();
  updateLevelHeader();
  updateHud();
  renderBoard();
}

resetBtn.addEventListener('click', startLevel);
playBtn.addEventListener('click', () => {
  activeLevelIndex = Math.max(0, Math.min(unlockedLevel - 1, LEVELS.length - 1));
  startLevel();
  showScreen(gameScreen);
});
openLevelsBtn.addEventListener('click', () => {
  renderLevelMap();
  showScreen(mapScreen);
});
openSettingsBtn.addEventListener('click', () => showScreen(settingsScreen));
closeSettingsBtn.addEventListener('click', () => showScreen(mainScreen));
mapBackBtn.addEventListener('click', () => showScreen(mainScreen));
backToMapBtn.addEventListener('click', () => {
  renderLevelMap();
  showScreen(mapScreen);
});

animationSpeedSelect.addEventListener('change', (event) => {
  settings.animationSpeed = event.target.value;
  persistSettings();
});

hintsToggle.addEventListener('change', (event) => {
  settings.showHints = event.target.checked;
  persistSettings();
});

renderLevelMap();
showScreen(mainScreen);
