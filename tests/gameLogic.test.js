const test = require('node:test');
const assert = require('node:assert/strict');

const {
  areAdjacent,
  createBoardWithoutMatches,
  findMatches,
  collapseBoard,
  swapCells
} = require('../gameLogic');

test('areAdjacent validates orthogonal neighbors only', () => {
  assert.equal(areAdjacent(0, 1, 8), true);
  assert.equal(areAdjacent(0, 8, 8), true);
  assert.equal(areAdjacent(0, 9, 8), false);
  assert.equal(areAdjacent(0, 2, 8), false);
});

test('findMatches detects horizontal and vertical runs', () => {
  const board = [
    [0, 0, 0, 1],
    [2, 1, 2, 1],
    [2, 1, 3, 1],
    [2, 4, 5, 0]
  ];

  const matches = findMatches(board, 4);
  const sorted = [...matches].sort((a, b) => a - b);

  assert.deepEqual(sorted, [0, 1, 2, 3, 4, 7, 8, 11, 12]);
});

test('swapCells swaps the two requested indexes in-place', () => {
  const board = [
    [0, 1, 2],
    [3, 4, 5],
    [0, 1, 2]
  ];

  swapCells(board, 0, 4, 3);
  assert.equal(board[0][0], 4);
  assert.equal(board[1][1], 0);
});

test('collapseBoard pulls values down and refills null entries', () => {
  const source = [
    [null, 1, null],
    [2, null, 3],
    [4, 5, null]
  ];

  const filled = collapseBoard(source, 3, 6, () => 0.7);

  assert.deepEqual(filled, [
    [4, 4, 4],
    [2, 1, 4],
    [4, 5, 3]
  ]);
});

test('createBoardWithoutMatches starts without immediate matches', () => {
  const board = createBoardWithoutMatches(8, 6);
  assert.equal(findMatches(board, 8).size, 0);
});
