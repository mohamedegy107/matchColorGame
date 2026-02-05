(function (globalScope) {
  function randomCandyId(candyTypesLength, randomFn = Math.random) {
    return Math.floor(randomFn() * candyTypesLength);
  }

  function indexToCoord(index, boardSize) {
    return [Math.floor(index / boardSize), index % boardSize];
  }

  function areAdjacent(a, b, boardSize) {
    const [r1, c1] = indexToCoord(a, boardSize);
    const [r2, c2] = indexToCoord(b, boardSize);
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  function cloneBoard(board) {
    return board.map((row) => [...row]);
  }

  function findMatches(board, boardSize) {
    const matched = new Set();

    for (let row = 0; row < boardSize; row += 1) {
      let runStart = 0;
      for (let col = 1; col <= boardSize; col += 1) {
        const current = col < boardSize ? board[row][col] : null;
        const previous = board[row][col - 1];

        if (current !== previous) {
          const runLength = col - runStart;
          if (previous !== null && runLength >= 3) {
            for (let c = runStart; c < col; c += 1) {
              matched.add(row * boardSize + c);
            }
          }
          runStart = col;
        }
      }
    }

    for (let col = 0; col < boardSize; col += 1) {
      let runStart = 0;
      for (let row = 1; row <= boardSize; row += 1) {
        const current = row < boardSize ? board[row][col] : null;
        const previous = board[row - 1][col];

        if (current !== previous) {
          const runLength = row - runStart;
          if (previous !== null && runLength >= 3) {
            for (let r = runStart; r < row; r += 1) {
              matched.add(r * boardSize + col);
            }
          }
          runStart = row;
        }
      }
    }

    return matched;
  }

  function swapCells(board, firstIndex, secondIndex, boardSize) {
    const [r1, c1] = indexToCoord(firstIndex, boardSize);
    const [r2, c2] = indexToCoord(secondIndex, boardSize);
    [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
  }

  function collapseBoard(board, boardSize, candyTypesLength, randomFn = Math.random) {
    const nextBoard = cloneBoard(board);

    for (let col = 0; col < boardSize; col += 1) {
      const nonNull = [];
      for (let row = boardSize - 1; row >= 0; row -= 1) {
        if (nextBoard[row][col] !== null) {
          nonNull.push(nextBoard[row][col]);
        }
      }

      for (let row = boardSize - 1, i = 0; row >= 0; row -= 1, i += 1) {
        nextBoard[row][col] =
          i < nonNull.length ? nonNull[i] : randomCandyId(candyTypesLength, randomFn);
      }
    }

    return nextBoard;
  }

  function createBoardWithoutMatches(boardSize, candyTypesLength, randomFn = Math.random) {
    let board = Array.from({ length: boardSize }, () =>
      Array.from({ length: boardSize }, () => randomCandyId(candyTypesLength, randomFn))
    );

    let matches = findMatches(board, boardSize);
    while (matches.size > 0) {
      for (const matchIndex of matches) {
        const [row, col] = indexToCoord(matchIndex, boardSize);
        board[row][col] = randomCandyId(candyTypesLength, randomFn);
      }
      matches = findMatches(board, boardSize);
    }

    return board;
  }

  const api = {
    areAdjacent,
    collapseBoard,
    createBoardWithoutMatches,
    findMatches,
    indexToCoord,
    randomCandyId,
    swapCells
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.GameLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
