const BOARD_SIZE = 8;
const CANDY_TYPES = [
  { id: 0, name: 'strawberry', classes: ['candy-strawberry', 'candy-round'] },
  { id: 1, name: 'blueberry', classes: ['candy-blueberry', 'candy-gem'] },
  { id: 2, name: 'lemon', classes: ['candy-lemon', 'candy-lozenge'] },
  { id: 3, name: 'apple', classes: ['candy-apple', 'candy-square'] },
  { id: 4, name: 'grape', classes: ['candy-grape', 'candy-flower'] },
  { id: 5, name: 'orange', classes: ['candy-orange', 'candy-pill'] }
];

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

let board = [];
let selected = null;
let score = 0;
let moves = 30;
let isResolving = false;
let bestScore = Number(localStorage.getItem('match-color-best') ?? 0);

bestEl.textContent = String(bestScore);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCandyType(id) {
  return CANDY_TYPES[id];
}

function renderBoard(options = {}) {
  const { crushed = new Set(), swapped = [] } = options;

  boardEl.innerHTML = '';
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const idx = row * BOARD_SIZE + col;
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
  board = createBoardWithoutMatches(BOARD_SIZE, CANDY_TYPES.length);
}

async function resolveMatches(chain = 1) {
  let matches = findMatches(board, BOARD_SIZE);
  let totalPoints = 0;

  while (matches.size > 0) {
    const points = matches.size * 10 * chain;
    totalPoints += points;

    renderBoard({ crushed: matches });
    await sleep(220);

    for (const match of matches) {
      const [row, col] = indexToCoord(match, BOARD_SIZE);
      board[row][col] = null;
    }

    board = collapseBoard(board, BOARD_SIZE, CANDY_TYPES.length);
    chain += 1;
    renderBoard();
    await sleep(120);

    matches = findMatches(board, BOARD_SIZE);
  }

  return totalPoints;
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

  if (!areAdjacent(selected, index, BOARD_SIZE)) {
    selected = index;
    renderBoard();
    return;
  }

  const first = selected;
  const second = index;
  selected = null;
  isResolving = true;
  setMessage('');

  swapCells(board, first, second, BOARD_SIZE);
  renderBoard({ swapped: [first, second] });
  await sleep(140);

  if (findMatches(board, BOARD_SIZE).size === 0) {
    animateInvalidSwap([first, second]);
    await sleep(220);
    swapCells(board, first, second, BOARD_SIZE);
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
