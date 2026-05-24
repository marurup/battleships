'use strict';

// ===== Extract core game logic (pure functions, no DOM) =====

const SHIP_TYPES = {
  dreadnought: { id: 'dreadnought', name: 'Slagkrydser',  size: 6 },
  carrier:     { id: 'carrier',     name: 'Hangarskib',   size: 5 },
  battleship:  { id: 'battleship',  name: 'Slagskib',     size: 4 },
  cruiser:     { id: 'cruiser',     name: 'Krydser',      size: 3 },
  submarine:   { id: 'submarine',   name: 'Ubåd',         size: 3 },
  destroyer:   { id: 'destroyer',   name: 'Destroyer',    size: 2 },
  frigate:     { id: 'frigate',     name: 'Fregat',       size: 2 },
};
const ST = SHIP_TYPES;

const MAPS = [
  {
    id: 'open-sea', name: 'Åbent Hav', desc: 'Klassisk',
    rows: 10, cols: 10, blocked: [],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'arctic', name: 'Arktis', desc: 'Is',
    rows: 10, cols: 10,
    blocked: [
      [0,0],[1,0],[0,1],[0,9],[0,8],[1,9],
      [9,0],[8,0],[9,1],[9,9],[9,8],[8,9],
      [4,4],[4,5],[5,4],[5,5],
    ],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
];

function makeBoard(map) {
  const { rows, cols } = map;
  const blocked = map.blocked || [];
  const blockedSet = new Set(blocked.map(([r, c]) => `${r},${c}`));
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const [r, c] of blocked) grid[r][c] = 'blocked';
  return { rows, cols, blocked, blockedSet, grid, ships: [], shots: [] };
}

function resetBoardGrid(board) {
  const { rows, cols } = board;
  board.grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const [r, c] of board.blocked) board.grid[r][c] = 'blocked';
}

function isBlocked(board, r, c) {
  return board.blockedSet.has(`${r},${c}`);
}

function canPlaceShip(board, shipDef, row, col, horiz) {
  const { rows, cols } = board;
  for (let i = 0; i < shipDef.size; i++) {
    const r = horiz ? row : row + i;
    const c = horiz ? col + i : col;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (board.grid[r][c] !== null) return false;
  }
  return true;
}

function placeShip(board, shipDef, row, col, horiz) {
  const ship = {
    id: shipDef.id, name: shipDef.name, size: shipDef.size,
    row, col, horiz, cells: [], hits: 0, sunk: false,
  };
  for (let i = 0; i < shipDef.size; i++) {
    const r = horiz ? row : row + i;
    const c = horiz ? col + i : col;
    board.grid[r][c] = ship.id;
    ship.cells.push([r, c]);
  }
  board.ships.push(ship);
  return ship;
}

function shootAt(board, row, col) {
  if (board.shots.some(s => s[0] === row && s[1] === col)) return { alreadyShot: true };
  if (isBlocked(board, row, col)) return { alreadyShot: true };
  board.shots.push([row, col]);
  const shipId = board.grid[row][col];
  if (!shipId) return { hit: false, sunk: false };
  const ship = board.ships.find(s => s.id === shipId);
  ship.hits++;
  if (ship.hits >= ship.size) {
    ship.sunk = true;
    return { hit: true, sunk: true, ship };
  }
  return { hit: true, sunk: false, ship };
}

function isWon(board) {
  return board.ships.length > 0 && board.ships.every(s => s.sunk);
}

function randomPlaceAll(board, shipDefs) {
  resetBoardGrid(board);
  board.ships = [];
  for (const def of shipDefs) {
    let placed = false, tries = 0;
    while (!placed && tries++ < 2000) {
      const horiz = Math.random() < 0.5;
      const row = Math.floor(Math.random() * (horiz ? board.rows : board.rows - def.size + 1));
      const col = Math.floor(Math.random() * (horiz ? board.cols - def.size + 1 : board.cols));
      if (canPlaceShip(board, def, row, col, horiz)) {
        placeShip(board, def, row, col, horiz);
        placed = true;
      }
    }
  }
}

// ===== TEST RUNNER =====
let passed = 0, failed = 0, errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    const detail = `${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    errors.push(detail);
    console.log(`  FAIL: ${detail}`);
  }
}

function test(name, fn) {
  console.log(`\n--- ${name} ---`);
  try {
    fn();
  } catch (e) {
    failed++;
    errors.push(`${name} threw: ${e.message}`);
    console.log(`  ERROR: ${e.message}\n${e.stack}`);
  }
}

// ===== TESTS =====

test('makeBoard creates correct dimensions', () => {
  const board = makeBoard(MAPS[0]);
  assertEqual(board.rows, 10, 'rows');
  assertEqual(board.cols, 10, 'cols');
  assertEqual(board.grid.length, 10, 'grid rows');
  assertEqual(board.grid[0].length, 10, 'grid cols');
  assertEqual(board.ships.length, 0, 'no ships');
  assertEqual(board.shots.length, 0, 'no shots');
});

test('makeBoard marks blocked cells', () => {
  const board = makeBoard(MAPS[1]); // arctic with blocked cells
  assertEqual(board.grid[0][0], 'blocked', 'corner blocked');
  assertEqual(board.grid[4][4], 'blocked', 'center blocked');
  assertEqual(board.grid[3][3], null, 'non-blocked cell is null');
  assert(isBlocked(board, 0, 0), 'isBlocked returns true for blocked');
  assert(!isBlocked(board, 3, 3), 'isBlocked returns false for open');
});

test('canPlaceShip basic placement', () => {
  const board = makeBoard(MAPS[0]);
  assert(canPlaceShip(board, ST.carrier, 0, 0, true), 'carrier at origin horizontal');
  assert(canPlaceShip(board, ST.carrier, 0, 0, false), 'carrier at origin vertical');
  assert(!canPlaceShip(board, ST.carrier, 0, 6, true), 'carrier overflows right');
  assert(!canPlaceShip(board, ST.carrier, 6, 0, false), 'carrier overflows bottom');
  assert(canPlaceShip(board, ST.carrier, 0, 5, true), 'carrier fits exactly right');
  assert(canPlaceShip(board, ST.carrier, 5, 0, false), 'carrier fits exactly bottom');
});

test('canPlaceShip respects blocked cells', () => {
  const board = makeBoard(MAPS[1]); // arctic
  assert(!canPlaceShip(board, ST.destroyer, 0, 0, true), 'cant place on blocked cell');
  assert(!canPlaceShip(board, ST.cruiser, 4, 3, true), 'cruiser overlaps blocked center');
});

test('canPlaceShip respects existing ships', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.carrier, 0, 0, true);
  assert(!canPlaceShip(board, ST.battleship, 0, 0, true), 'overlap at start');
  assert(!canPlaceShip(board, ST.battleship, 0, 2, true), 'overlap in middle');
  assert(canPlaceShip(board, ST.battleship, 1, 0, true), 'no overlap row below');
});

test('placeShip sets grid and creates ship', () => {
  const board = makeBoard(MAPS[0]);
  const ship = placeShip(board, ST.cruiser, 2, 3, true);
  assertEqual(ship.id, 'cruiser', 'ship id');
  assertEqual(ship.size, 3, 'ship size');
  assertEqual(ship.cells.length, 3, 'ship cells count');
  assertEqual(board.grid[2][3], 'cruiser', 'grid cell 1');
  assertEqual(board.grid[2][4], 'cruiser', 'grid cell 2');
  assertEqual(board.grid[2][5], 'cruiser', 'grid cell 3');
  assertEqual(board.grid[2][6], null, 'grid cell after ship');
  assertEqual(board.ships.length, 1, 'ships array length');
});

test('placeShip vertical', () => {
  const board = makeBoard(MAPS[0]);
  const ship = placeShip(board, ST.destroyer, 4, 7, false);
  assertEqual(ship.horiz, false, 'ship is vertical');
  assertEqual(board.grid[4][7], 'destroyer', 'grid top');
  assertEqual(board.grid[5][7], 'destroyer', 'grid bottom');
  assertEqual(board.grid[6][7], null, 'grid after ship');
});

test('shootAt miss', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.cruiser, 2, 3, true);
  const result = shootAt(board, 0, 0);
  assertEqual(result.hit, false, 'miss hit=false');
  assertEqual(result.sunk, false, 'miss sunk=false');
  assertEqual(board.shots.length, 1, 'shot recorded');
});

test('shootAt hit', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.cruiser, 2, 3, true);
  const result = shootAt(board, 2, 3);
  assertEqual(result.hit, true, 'hit=true');
  assertEqual(result.sunk, false, 'not sunk yet');
  assertEqual(result.ship.id, 'cruiser', 'ship id');
  assertEqual(result.ship.hits, 1, 'hits count');
});

test('shootAt sunk', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.destroyer, 5, 5, true); // size 2
  shootAt(board, 5, 5);
  const result = shootAt(board, 5, 6);
  assertEqual(result.hit, true, 'hit=true');
  assertEqual(result.sunk, true, 'sunk=true');
  assertEqual(result.ship.sunk, true, 'ship.sunk=true');
});

test('shootAt alreadyShot', () => {
  const board = makeBoard(MAPS[0]);
  shootAt(board, 0, 0);
  const result = shootAt(board, 0, 0);
  assertEqual(result.alreadyShot, true, 'already shot');
});

test('shootAt blocked', () => {
  const board = makeBoard(MAPS[1]); // arctic has blocked at 0,0
  const result = shootAt(board, 0, 0);
  assertEqual(result.alreadyShot, true, 'blocked treated as already shot');
});

test('isWon false when no ships sunk', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.destroyer, 0, 0, true);
  assert(!isWon(board), 'not won');
});

test('isWon false when empty board (vacuous truth guard)', () => {
  const board = makeBoard(MAPS[0]);
  assert(!isWon(board), 'empty board is NOT won');
});

test('isWon true when all ships sunk', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.destroyer, 0, 0, true); // size 2
  shootAt(board, 0, 0);
  shootAt(board, 0, 1);
  assert(isWon(board), 'all ships sunk = won');
});

test('isWon false when some ships still afloat', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.destroyer, 0, 0, true); // size 2
  placeShip(board, ST.cruiser, 2, 2, true);   // size 3
  shootAt(board, 0, 0);
  shootAt(board, 0, 1); // destroyer sunk
  assert(!isWon(board), 'cruiser still afloat');
});

test('randomPlaceAll places all ships', () => {
  const map = MAPS[0];
  const board = makeBoard(map);
  randomPlaceAll(board, map.ships);
  assertEqual(board.ships.length, map.ships.length, 'all ships placed');
  for (const ship of board.ships) {
    assertEqual(ship.cells.length, ship.size, `${ship.id} has correct cell count`);
    for (const [r, c] of ship.cells) {
      assertEqual(board.grid[r][c], ship.id, `grid cell matches ship id`);
    }
  }
});

test('randomPlaceAll on blocked map', () => {
  const map = MAPS[1]; // arctic
  const board = makeBoard(map);
  randomPlaceAll(board, map.ships);
  assertEqual(board.ships.length, map.ships.length, 'all ships placed');
  // Verify no ship overlaps blocked cells
  for (const ship of board.ships) {
    for (const [r, c] of ship.cells) {
      assert(!isBlocked(board, r, c), `ship ${ship.id} cell [${r},${c}] not on blocked`);
    }
  }
});

// ===== ONLINE PROTOCOL SIMULATION =====

test('Online protocol: full game simulation', () => {
  const map = MAPS[0];

  // --- Host setup (myIndex=0) ---
  const hostState = {
    myIndex: 0,
    players: [
      { name: 'Host', board: makeBoard(map) },
      { name: 'Joiner', board: makeBoard(map) },
    ],
    current: 0,
    waitingForResult: false,
  };

  // --- Joiner setup (myIndex=1) ---
  const joinerState = {
    myIndex: 1,
    players: [
      { name: 'Host', board: makeBoard(map) },
      { name: 'Joiner', board: makeBoard(map) },
    ],
    current: 0,
    waitingForResult: false,
  };

  // Place ships on each player's REAL board
  // Host places on hostState.players[0].board
  placeShip(hostState.players[0].board, ST.destroyer, 0, 0, true); // size 2

  // Joiner places on joinerState.players[1].board
  placeShip(joinerState.players[1].board, ST.destroyer, 5, 5, true); // size 2

  // --- Simulate: Host fires at (5,5) - a hit on joiner's destroyer ---
  // Host side: fireShot(5, 5)
  assertEqual(hostState.current, 0, 'host turn initially');
  assertEqual(hostState.current, hostState.myIndex, 'its hosts turn');

  // Host sends: {type:'shot', row:5, col:5}
  const shotMsg1 = { type: 'shot', row: 5, col: 5 };
  hostState.waitingForResult = true;

  // Joiner receives the shot
  const joinerBoard = joinerState.players[joinerState.myIndex].board;
  const result1 = shootAt(joinerBoard, shotMsg1.row, shotMsg1.col);
  assertEqual(result1.hit, true, 'shot1 hits joiner destroyer');
  assertEqual(result1.sunk, false, 'shot1 not sunk yet');

  // Joiner sends shot_result back
  const reply1 = {
    type: 'shot_result',
    row: shotMsg1.row, col: shotMsg1.col,
    hit: result1.hit, sunk: result1.sunk,
    shipId: result1.ship?.id || null,
    shipName: result1.ship?.name || null,
    won: isWon(joinerBoard),
  };
  if (result1.sunk && result1.ship) {
    reply1.shipCells = result1.ship.cells;
    reply1.shipSize = result1.ship.size;
    reply1.shipHoriz = result1.ship.horiz;
  }

  // Joiner updates turn
  joinerState.current = joinerState.myIndex; // joiner's turn now
  assertEqual(joinerState.current, 1, 'joiner turn after receiving shot');

  // Host receives shot_result
  hostState.waitingForResult = false;
  const oppBoard = hostState.players[1 - hostState.myIndex].board;
  oppBoard.shots.push([reply1.row, reply1.col]);

  if (reply1.hit && reply1.shipId) {
    oppBoard.grid[reply1.row][reply1.col] = reply1.shipId;
    let ship = oppBoard.ships.find(s => s.id === reply1.shipId);
    if (!ship) {
      ship = { id: reply1.shipId, name: reply1.shipName, size: 0,
               cells: [], hits: 0, sunk: false, horiz: true };
      oppBoard.ships.push(ship);
    }
    ship.hits++;
    if (reply1.sunk && reply1.shipCells) {
      ship.sunk = true;
      ship.cells = reply1.shipCells;
      ship.size = reply1.shipSize;
      ship.horiz = reply1.shipHoriz;
      for (const [r, c] of reply1.shipCells) oppBoard.grid[r][c] = reply1.shipId;
    } else {
      ship.cells.push([reply1.row, reply1.col]);
    }
  }

  // Host updates turn
  hostState.current = 1 - hostState.myIndex; // 1 (joiner's turn)
  assertEqual(hostState.current, 1, 'host sees joiner turn');

  // Verify host's local copy of opponent's board
  assertEqual(oppBoard.shots.length, 1, 'host: opp board has 1 shot');
  assertEqual(oppBoard.grid[5][5], 'destroyer', 'host: opp grid updated with shipId');
  assertEqual(oppBoard.ships.length, 1, 'host: opp has 1 known ship');
  assertEqual(oppBoard.ships[0].hits, 1, 'host: ship has 1 hit');
  assertEqual(oppBoard.ships[0].sunk, false, 'host: ship not sunk yet');

  // --- Simulate: Joiner fires at (0,0) - a hit on host's destroyer ---
  assertEqual(joinerState.current, joinerState.myIndex, 'its joiners turn');

  const shotMsg2 = { type: 'shot', row: 0, col: 0 };
  joinerState.waitingForResult = true;

  // Host receives the shot
  const hostBoard = hostState.players[hostState.myIndex].board;
  const result2 = shootAt(hostBoard, shotMsg2.row, shotMsg2.col);
  assertEqual(result2.hit, true, 'shot2 hits host destroyer');
  assertEqual(result2.sunk, false, 'shot2 not sunk yet');

  // Host sends shot_result
  const reply2 = {
    type: 'shot_result',
    row: shotMsg2.row, col: shotMsg2.col,
    hit: result2.hit, sunk: result2.sunk,
    shipId: result2.ship?.id || null,
    shipName: result2.ship?.name || null,
    won: isWon(hostBoard),
  };

  // Host updates turn
  hostState.current = hostState.myIndex; // host's turn now

  // Joiner receives shot_result
  joinerState.waitingForResult = false;
  const joinerOppBoard = joinerState.players[1 - joinerState.myIndex].board;
  joinerOppBoard.shots.push([reply2.row, reply2.col]);

  if (reply2.hit && reply2.shipId) {
    joinerOppBoard.grid[reply2.row][reply2.col] = reply2.shipId;
    let ship = joinerOppBoard.ships.find(s => s.id === reply2.shipId);
    if (!ship) {
      ship = { id: reply2.shipId, name: reply2.shipName, size: 0,
               cells: [], hits: 0, sunk: false, horiz: true };
      joinerOppBoard.ships.push(ship);
    }
    ship.hits++;
    if (reply2.sunk && reply2.shipCells) {
      ship.sunk = true;
      ship.cells = reply2.shipCells;
      ship.size = reply2.shipSize;
      ship.horiz = reply2.shipHoriz;
    } else {
      ship.cells.push([reply2.row, reply2.col]);
    }
  }

  // Joiner updates turn
  joinerState.current = 1 - joinerState.myIndex; // 0 (host's turn)
  assertEqual(joinerState.current, 0, 'joiner sees host turn');
  assertEqual(hostState.current, 0, 'both agree: host turn');

  // --- Simulate: Host fires at (5,6) - sinks joiner's destroyer ---
  const shotMsg3 = { type: 'shot', row: 5, col: 6 };
  hostState.waitingForResult = true;

  const result3 = shootAt(joinerBoard, shotMsg3.row, shotMsg3.col);
  assertEqual(result3.hit, true, 'shot3 hits');
  assertEqual(result3.sunk, true, 'shot3 sinks destroyer');

  const reply3 = {
    type: 'shot_result',
    row: shotMsg3.row, col: shotMsg3.col,
    hit: result3.hit, sunk: result3.sunk,
    shipId: result3.ship?.id || null,
    shipName: result3.ship?.name || null,
    won: isWon(joinerBoard),
  };
  if (result3.sunk && result3.ship) {
    reply3.shipCells = result3.ship.cells;
    reply3.shipSize = result3.ship.size;
    reply3.shipHoriz = result3.ship.horiz;
  }

  assertEqual(reply3.won, true, 'joiner board is won (all ships sunk)');
  assertEqual(reply3.shipCells.length, 2, 'sunk ship cells sent');

  // Host receives shot_result for the sinking shot
  hostState.waitingForResult = false;
  oppBoard.shots.push([reply3.row, reply3.col]);
  if (reply3.hit && reply3.shipId) {
    oppBoard.grid[reply3.row][reply3.col] = reply3.shipId;
    let ship = oppBoard.ships.find(s => s.id === reply3.shipId);
    if (!ship) {
      ship = { id: reply3.shipId, name: reply3.shipName, size: 0,
               cells: [], hits: 0, sunk: false, horiz: true };
      oppBoard.ships.push(ship);
    }
    ship.hits++;
    if (reply3.sunk && reply3.shipCells) {
      ship.sunk = true;
      ship.cells = reply3.shipCells;
      ship.size = reply3.shipSize;
      ship.horiz = reply3.shipHoriz;
      for (const [r, c] of reply3.shipCells) oppBoard.grid[r][c] = reply3.shipId;
    } else {
      ship.cells.push([reply3.row, reply3.col]);
    }
  }

  // Verify final state of host's copy of opponent's board
  assertEqual(oppBoard.shots.length, 2, 'host: opp board has 2 shots');
  assertEqual(oppBoard.ships[0].sunk, true, 'host: destroyer sunk on local copy');
  assertEqual(oppBoard.ships[0].cells.length, 2, 'host: sunk ship has full cells');
  assertEqual(oppBoard.grid[5][5], 'destroyer', 'host: grid cell [5,5]');
  assertEqual(oppBoard.grid[5][6], 'destroyer', 'host: grid cell [5,6]');

  // Verify data.won triggers game over
  assert(reply3.won, 'won flag set correctly');
});

test('Online protocol: miss renders correctly on attacker board', () => {
  const map = MAPS[0];
  const oppBoard = makeBoard(map);
  // Opponent has no ship at (3,3)

  // Simulate receiving shot_result for a miss
  const data = { row: 3, col: 3, hit: false, sunk: false, shipId: null };
  oppBoard.shots.push([data.row, data.col]);

  // Verify board state that renderBoard would use
  const shotExists = oppBoard.shots.some(s => s[0] === 3 && s[1] === 3);
  assert(shotExists, 'shot recorded in shots array');

  const shipId = oppBoard.grid[3][3];
  assertEqual(shipId, null, 'no shipId for miss');
  // renderBoard checks: if (shot !== undefined) → if (shipId) → else → miss
  // This should render as miss correctly
});

test('Online protocol: hit renders correctly on attacker board', () => {
  const map = MAPS[0];
  const oppBoard = makeBoard(map);

  // Simulate receiving shot_result for a hit
  const data = { row: 2, col: 5, hit: true, sunk: false, shipId: 'cruiser', shipName: 'Krydser' };
  oppBoard.shots.push([data.row, data.col]);
  oppBoard.grid[data.row][data.col] = data.shipId;
  let ship = oppBoard.ships.find(s => s.id === data.shipId);
  if (!ship) {
    ship = { id: data.shipId, name: data.shipName, size: 0,
             cells: [], hits: 0, sunk: false, horiz: true };
    oppBoard.ships.push(ship);
  }
  ship.hits++;
  ship.cells.push([data.row, data.col]);

  // Verify board state that renderBoard would use
  const shotExists = oppBoard.shots.some(s => s[0] === 2 && s[1] === 5);
  assert(shotExists, 'shot recorded');
  assertEqual(oppBoard.grid[2][5], 'cruiser', 'grid has shipId');
  const foundShip = oppBoard.ships.find(s => s.id === 'cruiser');
  assert(foundShip !== undefined, 'ship exists in ships array');
  assertEqual(foundShip.sunk, false, 'ship not sunk');
  // renderBoard checks: if (shot) → if (shipId) → ship exists, sunk=false → add 'hit' class
});

test('Online protocol: sunk ship renders with full cells on attacker board', () => {
  const map = MAPS[0];
  const oppBoard = makeBoard(map);

  // First hit
  const data1 = { row: 5, col: 5, hit: true, sunk: false, shipId: 'destroyer', shipName: 'Destroyer' };
  oppBoard.shots.push([data1.row, data1.col]);
  oppBoard.grid[data1.row][data1.col] = data1.shipId;
  let ship = { id: data1.shipId, name: data1.shipName, size: 0,
               cells: [], hits: 0, sunk: false, horiz: true };
  oppBoard.ships.push(ship);
  ship.hits++;
  ship.cells.push([data1.row, data1.col]);

  // Second hit — sinks it
  const data2 = {
    row: 5, col: 6, hit: true, sunk: true,
    shipId: 'destroyer', shipName: 'Destroyer',
    shipCells: [[5, 5], [5, 6]], shipSize: 2, shipHoriz: true,
  };
  oppBoard.shots.push([data2.row, data2.col]);
  oppBoard.grid[data2.row][data2.col] = data2.shipId;
  ship = oppBoard.ships.find(s => s.id === data2.shipId);
  ship.hits++;
  ship.sunk = true;
  ship.cells = data2.shipCells;
  ship.size = data2.shipSize;
  ship.horiz = data2.shipHoriz;
  for (const [r, c] of data2.shipCells) oppBoard.grid[r][c] = data2.shipId;

  // Verify
  assertEqual(ship.sunk, true, 'ship is sunk');
  assertEqual(ship.cells.length, 2, 'full cells available');
  assertEqual(ship.size, 2, 'size updated');
  assertEqual(ship.horiz, true, 'orientation available');

  // renderBoard would: if (shot) → if (shipId) → ship.sunk=true → add 'sunk' class, addShipClasses
  // addShipClasses uses ship.cells to find bow/mid/stern — this should work now
  const idx0 = ship.cells.findIndex(([r, c]) => r === 5 && c === 5);
  assertEqual(idx0, 0, 'cell [5,5] is index 0 (bow)');
  const idx1 = ship.cells.findIndex(([r, c]) => r === 5 && c === 6);
  assertEqual(idx1, 1, 'cell [5,6] is index 1 (stern for size-2)');
});

test('Receiver board: incoming shot updates own-board correctly', () => {
  const map = MAPS[0];
  const myBoard = makeBoard(map);
  placeShip(myBoard, ST.cruiser, 2, 3, true);

  // Opponent fires at (2, 3) — hits my cruiser
  const result = shootAt(myBoard, 2, 3);
  assertEqual(result.hit, true, 'hit my cruiser');
  assertEqual(myBoard.shots.length, 1, 'shot recorded on my board');
  assertEqual(myBoard.grid[2][3], 'cruiser', 'grid still shows ship id');

  // renderBoard with showShips:true would show: shot + shipId → hit + ship classes
  // This is the defender's view — should show correctly

  // Opponent fires at (7, 7) — miss
  const result2 = shootAt(myBoard, 7, 7);
  assertEqual(result2.hit, false, 'miss');
  assertEqual(myBoard.shots.length, 2, '2 shots on my board');
  assertEqual(myBoard.grid[7][7], null, 'no ship at miss location');
});

test('Multiple ships: isWon requires ALL sunk', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.destroyer, 0, 0, true); // size 2
  placeShip(board, ST.cruiser, 2, 0, true);   // size 3
  placeShip(board, ST.carrier, 4, 0, true);   // size 5

  // Sink destroyer
  shootAt(board, 0, 0); shootAt(board, 0, 1);
  assert(!isWon(board), 'not won after 1 ship sunk');

  // Sink cruiser
  shootAt(board, 2, 0); shootAt(board, 2, 1); shootAt(board, 2, 2);
  assert(!isWon(board), 'not won after 2 ships sunk');

  // Sink carrier
  shootAt(board, 4, 0); shootAt(board, 4, 1); shootAt(board, 4, 2);
  shootAt(board, 4, 3); shootAt(board, 4, 4);
  assert(isWon(board), 'won after all 3 ships sunk');
});

test('Board shots tracking consistency', () => {
  const board = makeBoard(MAPS[0]);
  placeShip(board, ST.destroyer, 0, 0, true);

  // Fire several shots
  shootAt(board, 0, 0); // hit
  shootAt(board, 0, 1); // hit + sunk
  shootAt(board, 5, 5); // miss
  shootAt(board, 3, 3); // miss

  assertEqual(board.shots.length, 4, '4 shots recorded');

  // Verify each shot is findable (like renderBoard does)
  for (const [r, c] of [[0,0],[0,1],[5,5],[3,3]]) {
    const found = board.shots.find(s => s[0] === r && s[1] === c);
    assert(found !== undefined, `shot at [${r},${c}] findable`);
  }

  // Verify non-shot cells are not found
  const notShot = board.shots.find(s => s[0] === 8 && s[1] === 8);
  assertEqual(notShot, undefined, 'unshot cell not found');
});

test('Duplicate ship ID handling in online protocol', () => {
  // When attacker hits the same ship twice (not sunk), the ship object should be reused
  const oppBoard = makeBoard(MAPS[0]);

  // First hit on cruiser
  oppBoard.shots.push([2, 3]);
  oppBoard.grid[2][3] = 'cruiser';
  let ship = { id: 'cruiser', name: 'Krydser', size: 0, cells: [], hits: 0, sunk: false, horiz: true };
  oppBoard.ships.push(ship);
  ship.hits++;
  ship.cells.push([2, 3]);

  // Second hit on same cruiser
  oppBoard.shots.push([2, 4]);
  oppBoard.grid[2][4] = 'cruiser';
  ship = oppBoard.ships.find(s => s.id === 'cruiser');
  assert(ship !== undefined, 'existing ship found');
  ship.hits++;
  ship.cells.push([2, 4]);

  assertEqual(oppBoard.ships.length, 1, 'still only 1 ship object');
  assertEqual(ship.hits, 2, '2 hits tracked');
  assertEqual(ship.cells.length, 2, '2 cells tracked');
});

test('resetBoardGrid preserves blocked cells', () => {
  const board = makeBoard(MAPS[1]); // arctic
  placeShip(board, ST.destroyer, 2, 2, true);
  assertEqual(board.grid[2][2], 'destroyer', 'ship placed');

  resetBoardGrid(board);
  assertEqual(board.grid[2][2], null, 'ship removed after reset');
  assertEqual(board.grid[0][0], 'blocked', 'blocked preserved after reset');
  assertEqual(board.grid[4][4], 'blocked', 'center blocked preserved');
});

// ===== RESULTS =====
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (errors.length > 0) {
  console.log('\nFailures:');
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
}
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
