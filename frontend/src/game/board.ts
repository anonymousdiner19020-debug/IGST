// Match-3 board engine. Grid of ingredient IDs.
// Simple, deterministic, no random matches on init.

export type Cell = string; // ingredient id

export const BOARD_SIZE = 7;

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function wouldCreateMatch(grid: Cell[][], r: number, c: number, id: Cell): boolean {
  // check horizontal
  if (c >= 2 && grid[r][c - 1] === id && grid[r][c - 2] === id) return true;
  // check vertical
  if (r >= 2 && grid[r - 1][c] === id && grid[r - 2][c] === id) return true;
  return false;
}

export function createBoard(palette: string[]): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      let id = randChoice(palette);
      let guard = 0;
      while (wouldCreateMatch(row.length === c ? [...grid, row] : grid, r, c, id) && guard < 20) {
        id = randChoice(palette);
        guard++;
      }
      row.push(id);
    }
    grid.push(row);
  }
  return grid;
}

export function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map((row) => [...row]);
}

// Returns set of "r,c" positions in matches (>=3 in a row/col).
export function findMatches(grid: Cell[][]): Set<string> {
  const matched = new Set<string>();
  const n = grid.length;
  // horizontal
  for (let r = 0; r < n; r++) {
    let run = 1;
    for (let c = 1; c <= n; c++) {
      if (c < n && grid[r][c] === grid[r][c - 1]) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matched.add(`${r},${c - 1 - k}`);
        }
        run = 1;
      }
    }
  }
  // vertical
  for (let c = 0; c < n; c++) {
    let run = 1;
    for (let r = 1; r <= n; r++) {
      if (r < n && grid[r][c] === grid[r - 1][c]) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matched.add(`${r - 1 - k},${c}`);
        }
        run = 1;
      }
    }
  }
  return matched;
}

export function countByIngredient(matched: Set<string>, grid: Cell[][]): Record<string, number> {
  const counts: Record<string, number> = {};
  matched.forEach((key) => {
    const [rs, cs] = key.split(",");
    const id = grid[+rs][+cs];
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

// Collapse matched cells: null them, drop others down, refill from top with palette.
export function collapseAndRefill(grid: Cell[][], matched: Set<string>, palette: string[]): Cell[][] {
  const n = grid.length;
  const g: (Cell | null)[][] = grid.map((row) => [...row]);
  matched.forEach((k) => {
    const [rs, cs] = k.split(",");
    g[+rs][+cs] = null;
  });
  for (let c = 0; c < n; c++) {
    // pull down
    const col: (Cell | null)[] = [];
    for (let r = n - 1; r >= 0; r--) {
      if (g[r][c] !== null) col.push(g[r][c]);
    }
    while (col.length < n) col.push(randChoice(palette));
    for (let r = n - 1, i = 0; r >= 0; r--, i++) {
      g[r][c] = col[i];
    }
  }
  return g as Cell[][];
}

// True if swapping (r1,c1) with (r2,c2) results in a match.
export function isValidSwap(grid: Cell[][], r1: number, c1: number, r2: number, c2: number): boolean {
  const g = cloneGrid(grid);
  const tmp = g[r1][c1];
  g[r1][c1] = g[r2][c2];
  g[r2][c2] = tmp;
  return findMatches(g).size > 0;
}

export function performSwap(grid: Cell[][], r1: number, c1: number, r2: number, c2: number): Cell[][] {
  const g = cloneGrid(grid);
  const tmp = g[r1][c1];
  g[r1][c1] = g[r2][c2];
  g[r2][c2] = tmp;
  return g;
}
