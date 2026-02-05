const BOARD_SIZE = 8;
const CANDY_TYPES = [
  { id: 0, color: '#ff4b86' },
  { id: 1, color: '#42c7ff' },
  { id: 2, color: '#ffd54a' },
  { id: 3, color: '#7cf36b' },
  { id: 4, color: '#bc7cff' },
  { id: 5, color: '#ff974e' }
];

const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const bestEl = document.getElementById('best');
const boardEl = document.getElementById('board');
const messageEl = document.getElementById('message');
const resetBtn = document.getElementById('resetBtn');

let board = [];
let selected = null;
let score = 0;
let moves = 30;
let isResolving = false;
let bestScore = Number(localStorage.getItem('match-color-best') ?? 0);

bestEl.textContent = String(bestScore);

function randomCandyId() {
  return CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)].id;
}

function indexToCoord(index) {
  return [Math.floor(index / BOARD_SIZE), index % BOARD_SIZE];
}

function areAdjacent(a, b) {
  const [r1, c1] = indexToCoord(a);
  const [r2, c2] = indexToCoord(b);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function findMatches() {
  const matched = new Set();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    let runStart = 0;
    for (let col = 1; col <= BOARD_SIZE; col += 1) {
      const current = col < BOARD_SIZE ? board[row][col] : null;
      const previous = board[row][col - 1];
      if (current !== previous) {
        const runLength = col - runStart;
        if (previous !== null && runLength >= 3) {
          for (let c = runStart; c < col; c += 1) matched.add(row * BOARD_SIZE + c);
        }
        runStart = col;
      }
    }
  }

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    let runStart = 0;
    for (let row = 1; row <= BOARD_SIZE; row += 1) {
      const current = row < BOARD_SIZE ? board[row][col] : null;
      const previous = board[row - 1][col];
      if (current !== previous) {
        const runLength = row - runStart;
        if (previous !== null && runLength >= 3) {
          for (let r = runStart; r < row; r += 1) matched.add(r * BOARD_SIZE + col);
        }
        runStart = row;
      }
    }
  }

  return matched;
}

function collapseBoard() {
  for (let col = 0; col < BOARD_SIZE; col += 1) {
    const nonNull = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      if (board[row][col] !== null) nonNull.push(board[row][col]);
    }

    for (let row = BOARD_SIZE - 1, i = 0; row >= 0; row -= 1, i += 1) {
      board[row][col] = i < nonNull.length ? nonNull[i] : randomCandyId();
    }
  }
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const idx = row * BOARD_SIZE + col;
      const candy = document.createElement('button');
      candy.className = 'candy';
      candy.dataset.index = String(idx);
      candy.ariaLabel = `Candy row ${row + 1} column ${col + 1}`;
      const candyId = board[row][col];
      const candyColor = candyId === null ? '#1f1f2e' : CANDY_TYPES[candyId].color;
      candy.style.background = `radial-gradient(circle at 30% 30%, #ffffffa0, ${candyColor})`;

      if (selected === idx) candy.classList.add('selected');

      candy.addEventListener('click', () => onCellClick(idx));
      boardEl.appendChild(candy);
    }
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
  board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => randomCandyId())
  );

  let matches = findMatches();
  while (matches.size > 0) {
    for (const match of matches) {
      const [r, c] = indexToCoord(match);
      board[r][c] = randomCandyId();
    }
    matches = findMatches();
  }
}

async function resolveMatches(chain = 1) {
  let matches = findMatches();
  let totalPoints = 0;

  while (matches.size > 0) {
    const points = matches.size * 10 * chain;
    totalPoints += points;

    for (const match of matches) {
      const [row, col] = indexToCoord(match);
      board[row][col] = null;
    }

    renderBoard();
    await new Promise((resolve) => setTimeout(resolve, 140));

    collapseBoard();
    chain += 1;
    matches = findMatches();
  }

  return totalPoints;
}

function swapCells(a, b) {
  const [r1, c1] = indexToCoord(a);
  const [r2, c2] = indexToCoord(b);
  [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
}

async function onCellClick(index) {
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

  if (!areAdjacent(selected, index)) {
    selected = index;
    renderBoard();
    return;
  }

  const first = selected;
  const second = index;
  selected = null;
  isResolving = true;
  setMessage('');

  swapCells(first, second);
  renderBoard();

  if (findMatches().size === 0) {
    swapCells(first, second);
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
  if (moves <= 0) setMessage(`Game over! Final score: ${score}`);

  isResolving = false;
}

function startNewGame() {
  score = 0;
  moves = 30;
  selected = null;
  isResolving = false;
  setMessage('');
  initializeBoard();
  updateHud();
  renderBoard();
}

resetBtn.addEventListener('click', startNewGame);
startNewGame();
