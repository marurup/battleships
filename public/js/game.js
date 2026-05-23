'use strict';

// ===== CONSTANTS =====
const GRID = 10;
const COLS = 'ABCDEFGHIJ';

const SHIPS_DEF = [
  { id: 'carrier',    name: 'Hangarskib', size: 5 },
  { id: 'battleship', name: 'Slagskib',   size: 4 },
  { id: 'cruiser',    name: 'Krydser',    size: 3 },
  { id: 'submarine',  name: 'Ubåd',       size: 3 },
  { id: 'destroyer',  name: 'Destroyer',  size: 2 },
];

// ===== STATE =====
const State = {
  mode: null,           // 'ai' | 'local' | 'online'
  phase: null,          // 'placement' | 'battle' | 'gameover'
  difficulty: 'medium',
  players: [],          // [{name, board, ships, shots}]
  current: 0,           // index of player whose turn it is (0 or 1)
  placing: 0,           // which player is currently placing ships
  online: {
    connected: false,
    roomCode: null,
    myIndex: null,
  },
  placingShip: null,    // currently selected ship for placement
  horizontal: true,     // placement orientation
  passAfterPlace: false,
  battleTab: 'attack',
  lastShot: null,       // { row, col, hit, boardId } — for flash animation
};

// ===== BOARD =====
function makeBoard() {
  return {
    grid: Array.from({ length: GRID }, () => Array(GRID).fill(null)),
    ships: [],
    shots: [],
  };
}

function canPlaceShip(board, shipDef, row, col, horiz) {
  for (let i = 0; i < shipDef.size; i++) {
    const r = horiz ? row : row + i;
    const c = horiz ? col + i : col;
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return false;
    if (board.grid[r][c] !== null) return false;
  }
  return true;
}

function placeShip(board, shipDef, row, col, horiz) {
  const ship = {
    id: shipDef.id,
    name: shipDef.name,
    size: shipDef.size,
    row, col, horiz,
    cells: [],
    hits: 0,
    sunk: false,
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

function removeShip(board, shipId) {
  const idx = board.ships.findIndex(s => s.id === shipId);
  if (idx === -1) return;
  const ship = board.ships[idx];
  for (const [r, c] of ship.cells) board.grid[r][c] = null;
  board.ships.splice(idx, 1);
}

function shootAt(board, row, col) {
  // Returns: { hit, sunk, ship, alreadyShot }
  if (board.shots.some(s => s[0] === row && s[1] === col)) return { alreadyShot: true };
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
  return board.ships.every(s => s.sunk);
}

function randomPlaceAll(board) {
  // Clear board first
  board.grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  board.ships = [];
  for (const def of SHIPS_DEF) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() < 0.5;
      const row = Math.floor(Math.random() * (horiz ? GRID : GRID - def.size + 1));
      const col = Math.floor(Math.random() * (horiz ? GRID - def.size + 1 : GRID));
      if (canPlaceShip(board, def, row, col, horiz)) {
        placeShip(board, def, row, col, horiz);
        placed = true;
      }
    }
  }
}

// ===== AI =====
class AI {
  constructor(difficulty) {
    this.difficulty = difficulty;
    this.shotHistory = new Set();
    this.hits = [];          // unprocessed hits
    this.huntTargets = [];   // cells to try in hunt mode
  }

  getShot(board) {
    if (this.difficulty === 'easy') return this._randomShot();
    if (this.difficulty === 'hard') return this._probabilityShot(board);
    return this._huntShot();
  }

  _key(r, c) { return r * 10 + c; }
  _valid(r, c) { return r >= 0 && r < GRID && c >= 0 && c < GRID && !this.shotHistory.has(this._key(r, c)); }

  _randomShot() {
    const avail = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (!this.shotHistory.has(this._key(r, c))) avail.push([r, c]);
    if (avail.length === 0) return null;
    return avail[Math.floor(Math.random() * avail.length)];
  }

  _huntShot() {
    // If we have hunt targets, use them
    while (this.huntTargets.length > 0) {
      const [r, c] = this.huntTargets.shift();
      if (this._valid(r, c)) return [r, c];
    }
    // Checkerboard pattern for efficiency
    const avail = [];
    for (let r = 0; r < GRID; r++)
      for (let c = (r % 2); c < GRID; c += 2)
        if (!this.shotHistory.has(this._key(r, c))) avail.push([r, c]);
    if (avail.length === 0) return this._randomShot();
    return avail[Math.floor(Math.random() * avail.length)];
  }

  _probabilityShot(board) {
    // Hunt mode if we have targets
    if (this.huntTargets.length > 0) {
      while (this.huntTargets.length > 0) {
        const [r, c] = this.huntTargets.shift();
        if (this._valid(r, c)) return [r, c];
      }
    }

    // Build probability map
    const prob = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    const remainingSizes = SHIPS_DEF
      .filter(def => !board.ships.find(s => s.id === def.id)?.sunk)
      .map(def => def.size);

    for (const size of remainingSizes) {
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c <= GRID - size; c++) {
          if (this._canFit(board, r, c, true, size)) {
            for (let i = 0; i < size; i++) prob[r][c + i]++;
          }
        }
      }
      for (let c = 0; c < GRID; c++) {
        for (let r = 0; r <= GRID - size; r++) {
          if (this._canFit(board, r, c, false, size)) {
            for (let i = 0; i < size; i++) prob[r + i][c]++;
          }
        }
      }
    }

    // Zero out already shot cells
    for (const [r, c] of board.shots) prob[r][c] = 0;

    let best = -1, bestCells = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (prob[r][c] > best) { best = prob[r][c]; bestCells = [[r, c]]; }
        else if (prob[r][c] === best) bestCells.push([r, c]);

    return bestCells[Math.floor(Math.random() * bestCells.length)];
  }

  _canFit(board, r, c, horiz, size) {
    for (let i = 0; i < size; i++) {
      const row = horiz ? r : r + i;
      const col = horiz ? c + i : c;
      if (row >= GRID || col >= GRID) return false;
      if (board.shots.some(s => s[0] === row && s[1] === col && board.grid[row][col] === null)) return false;
    }
    return true;
  }

  recordResult(row, col, result) {
    this.shotHistory.add(this._key(row, col));
    if (result.sunk) {
      // Clear hunt targets related to this ship
      this.huntTargets = [];
    } else if (result.hit) {
      // Add adjacent cells as targets
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      // If we already have hits forming a line, prioritize that direction
      if (this.hits.length > 0) {
        const [pr, pc] = this.hits[this.hits.length - 1];
        const dr = row - pr, dc = col - pc;
        if (dr !== 0 || dc !== 0) {
          // Extend line
          if (this._valid(row + dr, col + dc)) this.huntTargets.unshift([row + dr, col + dc]);
          if (this._valid(pr - dr, pc - dc)) this.huntTargets.push([pr - dr, pc - dc]);
        }
      }
      for (const [dr, dc] of dirs) {
        if (this._valid(row + dr, col + dc)) this.huntTargets.push([row + dr, col + dc]);
      }
      this.hits.push([row, col]);
    }
  }
}

// ===== NETWORK =====
// P2P networking via PeerJS — no server required for game data.
// PeerJS uses a free public broker for WebRTC signaling only.
const PEER_PREFIX = 'battleships-v1-';

class Network {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.onMessage = null;
    this._myName = '';
  }

  _genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  }

  // Create a hosted room. Resolves with the 6-char display code.
  host(name) {
    this._myName = name;
    const code = this._genCode();
    return new Promise((resolve, reject) => {
      this.peer = new Peer(PEER_PREFIX + code, { debug: 0 });
      const timer = setTimeout(() => reject(new Error('PeerJS timeout – prøv igen')), 15000);
      this.peer.on('open', () => {
        clearTimeout(timer);
        this.peer.on('connection', (conn) => {
          this.conn = conn;
          conn.on('open', () => {
            this._setupConn(conn);
            // Tell joiner their player index and the host's name
            conn.send({ type: 'room_joined', playerIndex: 1, opponentName: name });
            // Notify local app that opponent connected
            if (this.onMessage) this.onMessage({
              type: 'opponent_joined',
              opponentName: conn.metadata?.name || 'Spiller 2',
            });
          });
        });
        resolve(code);
      });
      this.peer.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(err.type === 'unavailable-id' ? 'Rumkode optaget – prøv igen' : 'PeerJS fejl: ' + err.type));
      });
    });
  }

  // Join a hosted room by 6-char code.
  join(code, name) {
    this._myName = name;
    return new Promise((resolve, reject) => {
      this.peer = new Peer({ debug: 0 });
      const timer = setTimeout(() => reject(new Error('Timeout – tjek rumkoden og prøv igen')), 15000);
      this.peer.on('open', () => {
        const conn = this.peer.connect(PEER_PREFIX + code.toUpperCase(), {
          metadata: { name },
          reliable: true,
        });
        this.conn = conn;
        conn.on('open', () => {
          clearTimeout(timer);
          this._setupConn(conn);
          resolve();
        });
        conn.on('error', () => { clearTimeout(timer); reject(new Error('Forbindelsesfejl')); });
      });
      this.peer.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(err.type === 'peer-unavailable' ? 'Rum ikke fundet – tjek koden' : 'PeerJS fejl: ' + err.type));
      });
    });
  }

  _setupConn(conn) {
    conn.on('data', (data) => { if (this.onMessage) this.onMessage(data); });
    conn.on('close', () => { if (this.onMessage) this.onMessage({ type: 'opponent_disconnected' }); });
    conn.on('error', () => { if (this.onMessage) this.onMessage({ type: 'opponent_disconnected' }); });
  }

  relay(data) {
    if (this.conn && this.conn.open) this.conn.send({ type: 'relay', data });
  }

  disconnect() {
    try { if (this.conn) this.conn.close(); } catch {}
    try { if (this.peer) this.peer.destroy(); } catch {}
    this.conn = null;
    this.peer = null;
  }
}

const net = new Network();
let ai = null;

// ===== SOUND EFFECTS (Web Audio API — no files needed) =====
const SFX = {
  _ctx: null,
  _muted: false,

  ctx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },

  _noise(duration) {
    const ctx = this.ctx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

  _play(fn) { if (!this._muted) try { fn(this.ctx()); } catch {} },

  cannon() {
    this._play(ctx => {
      const t = ctx.currentTime;
      // Low boom
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.25);
      // Crack
      const src = ctx.createBufferSource();
      src.buffer = this._noise(0.12);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.4, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(ng); ng.connect(ctx.destination); src.start(t);
    });
  },

  explosion() {
    this._play(ctx => {
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this._noise(1.2);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(600, t);
      f.frequency.exponentialRampToValueAtTime(40, t + 1.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(1.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
    });
  },

  splash() {
    this._play(ctx => {
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this._noise(0.9);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.setValueAtTime(2500, t);
      f.frequency.exponentialRampToValueAtTime(400, t + 0.9); f.Q.value = 0.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
    });
  },

  sunk() {
    this.explosion();
    this._play(ctx => {
      const t = ctx.currentTime + 0.1;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 1.8);
      g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.8);
    });
  },

  place() {
    this._play(ctx => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t); osc.frequency.setValueAtTime(780, t + 0.06);
      g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.18);
    });
  },
};

// ===== HELPERS =====
function el(id) { return document.getElementById(id); }
function q(sel) { return document.querySelector(sel); }

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  el(`screen-${name}`).classList.add('active');
}

function showMessage(text, duration = 2500) {
  const msg = el('battle-message');
  msg.textContent = text;
  msg.classList.remove('hidden');
  clearTimeout(showMessage._timer);
  showMessage._timer = setTimeout(() => msg.classList.add('hidden'), duration);
}

function flashLastShot() {
  if (!State.lastShot) return;
  const { row, col, hit, boardId } = State.lastShot;
  const cell = el(boardId)?.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return;
  cell.classList.add(hit ? 'cell-hit-flash' : 'cell-miss-flash');
  const clean = () => cell.classList.remove('cell-hit-flash', 'cell-miss-flash');
  cell.addEventListener('animationend', clean, { once: true });
  setTimeout(clean, 900);
}

// ===== BOARD RENDERING =====
function addShipClasses(cell, ship, row, col) {
  if (!ship) return;
  cell.classList.add('ship', `ship-${ship.id}`, ship.horiz ? 'ship-h' : 'ship-v');
  const idx = ship.cells.findIndex(([r, c]) => r === row && c === col);
  if (idx === 0) cell.classList.add('ship-bow');
  else if (idx === ship.cells.length - 1) cell.classList.add('ship-stern');
  else cell.classList.add('ship-mid');
}

function renderBoard(container, board, opts = {}) {
  const { interactive = false, showShips = false, onShot, previewRow, previewCol, previewHoriz, previewSize, previewValid } = opts;
  container.innerHTML = '';

  // Build 11x11 grid (label row + label col + 10x10 cells)
  // Corner
  const corner = document.createElement('div');
  corner.className = 'board-label';
  container.appendChild(corner);

  // Column labels (A-J)
  for (let c = 0; c < GRID; c++) {
    const lbl = document.createElement('div');
    lbl.className = 'board-label';
    lbl.textContent = COLS[c];
    container.appendChild(lbl);
  }

  for (let r = 0; r < GRID; r++) {
    // Row label
    const rowLbl = document.createElement('div');
    rowLbl.className = 'board-label';
    rowLbl.textContent = r + 1;
    container.appendChild(rowLbl);

    for (let c = 0; c < GRID; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      const shipId = board.grid[r][c];
      const shot = board.shots.find(s => s[0] === r && s[1] === c);

      if (shot !== undefined) {
        const marker = document.createElement('span');
        marker.className = 'shot-marker';
        if (shipId) {
          const ship = board.ships.find(s => s.id === shipId);
          const sunk = ship?.sunk;
          cell.classList.add(sunk ? 'sunk' : 'hit');
          // Show ship shape on own board (showShips) or when sunk (revealed to attacker)
          if (ship && (showShips || sunk)) addShipClasses(cell, ship, r, c);
          marker.textContent = '✕';
        } else {
          cell.classList.add('miss');
          marker.textContent = '○';
        }
        cell.appendChild(marker);
      } else if (showShips && shipId) {
        const ship = board.ships.find(s => s.id === shipId);
        addShipClasses(cell, ship, r, c);
      }

      // Preview overlay for placement
      if (previewRow !== undefined && previewSize !== undefined) {
        let inPreview = false;
        for (let i = 0; i < previewSize; i++) {
          const pr = previewHoriz ? previewRow : previewRow + i;
          const pc = previewHoriz ? previewCol + i : previewCol;
          if (pr === r && pc === c) { inPreview = true; break; }
        }
        if (inPreview && !shot) {
          cell.classList.add(previewValid ? 'ship-preview' : 'ship-invalid');
        }
      }

      if (interactive && !shot) {
        cell.addEventListener('click', () => onShot && onShot(r, c));
        cell.addEventListener('touchend', (e) => { e.preventDefault(); onShot && onShot(r, c); });
      } else if (!interactive) {
        cell.classList.add('no-hover');
      }

      container.appendChild(cell);
    }
  }
}

// ===== PLACEMENT UI =====
function renderPlacementBoard() {
  const board = State.players[State.placing].board;
  renderBoard(el('placement-board'), board, {
    interactive: true,
    showShips: true,
    previewRow: State._prevRow,
    previewCol: State._prevCol,
    previewHoriz: State.horizontal,
    previewSize: State.placingShip?.size,
    previewValid: State._prevValid,
    onShot: (r, c) => App.placementClick(r, c),
  });
  // No event listeners here — they are set up once in setupPlacementListeners()
}

// Called once per placement phase. AbortController ensures old listeners are removed before new ones are added.
let _placementAbort = null;
function setupPlacementListeners() {
  if (_placementAbort) _placementAbort.abort();
  _placementAbort = new AbortController();
  const { signal } = _placementAbort;
  const container = el('placement-board');

  container.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell || !State.placingShip) return;
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    if (r === State._prevRow && c === State._prevCol) return;
    const board = State.players[State.placing].board;
    const def = SHIPS_DEF.find(d => d.id === State.placingShip.id);
    // Temporarily exclude the ship's own cells so canPlaceShip works for re-placement
    const savedCells = [];
    for (const [rr, cc] of (board.ships.find(s => s.id === def.id)?.cells || [])) {
      savedCells.push([rr, cc, board.grid[rr][cc]]);
      board.grid[rr][cc] = null;
    }
    State._prevRow = r;
    State._prevCol = c;
    State._prevValid = canPlaceShip(board, def, r, c, State.horizontal);
    for (const [rr, cc, v] of savedCells) board.grid[rr][cc] = v;
    updatePlacementPreview();
  }, { signal });

  container.addEventListener('mouseleave', () => {
    if (State._prevRow === undefined) return;
    State._prevRow = undefined;
    State._prevCol = undefined;
    updatePlacementPreview();
  }, { signal });
}

// Only updates CSS classes on existing cells — no DOM rebuild.
function updatePlacementPreview() {
  const container = el('placement-board');
  const ship = State.placingShip;
  container.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('ship-preview', 'ship-invalid');
    if (State._prevRow === undefined || !ship) return;
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    for (let i = 0; i < ship.size; i++) {
      const pr = State.horizontal ? State._prevRow : State._prevRow + i;
      const pc = State.horizontal ? State._prevCol + i : State._prevCol;
      if (pr === r && pc === c) {
        cell.classList.add(State._prevValid ? 'ship-preview' : 'ship-invalid');
        break;
      }
    }
  });
}

function renderShipList() {
  const list = el('ship-list');
  list.innerHTML = '';
  const board = State.players[State.placing].board;
  const placedIds = board.ships.map(s => s.id);

  for (const def of SHIPS_DEF) {
    const placed = placedIds.includes(def.id);
    const selected = State.placingShip?.id === def.id;

    const item = document.createElement('div');
    item.className = `ship-item ${placed ? 'placed' : ''} ${selected ? 'selected' : ''}`;

    const preview = document.createElement('div');
    preview.className = 'ship-preview';
    for (let i = 0; i < def.size; i++) {
      const c = document.createElement('div');
      c.className = 'ship-cell-preview';
      preview.appendChild(c);
    }

    const name = document.createElement('div');
    name.className = 'ship-name';
    name.textContent = `${def.name} (${def.size})`;

    item.appendChild(preview);
    item.appendChild(name);

    if (!placed) {
      item.addEventListener('click', () => {
        State.placingShip = def;
        State._prevRow = undefined; // clear stale preview position
        renderShipList();
        renderPlacementBoard();
        setupPlacementListeners(); // board DOM was rebuilt, re-attach
      });
    }

    list.appendChild(item);
  }
}

function updatePlacementDoneBtn() {
  const board = State.players[State.placing].board;
  el('placement-done-btn').disabled = board.ships.length < SHIPS_DEF.length;
}

// ===== BATTLE UI =====
function renderBattleScreen() {
  const me = State.players[State.current];
  const opp = State.players[1 - State.current];
  const myName = me.name;
  const oppName = opp.name;

  el('turn-indicator').textContent = `⚔️ ${myName}s tur`;
  el('attack-board-label').textContent = `${oppName}s hav`;
  el('defend-board-label').textContent = `${myName}s hav`;

  const oppSunk = opp.board.ships.filter(s => s.sunk).length;
  const mySunk = me.board.ships.filter(s => s.sunk).length;
  el('battle-stats').textContent = `Du: ${oppSunk}/${SHIPS_DEF.length} sænket | Modst.: ${mySunk}/${SHIPS_DEF.length} sænket`;

  // Render enemy board (interactive attack)
  renderBoard(el('enemy-board'), opp.board, {
    interactive: true,
    showShips: false,
    onShot: (r, c) => App.fireShot(r, c),
  });

  // Render own board (defensive view, no interaction)
  renderBoard(el('own-board'), me.board, {
    interactive: false,
    showShips: true,
  });

  // Mobile tabs
  const isMobile = window.innerWidth < 700;
  el('board-tabs').style.display = isMobile ? 'flex' : 'none';
  if (isMobile) {
    el('section-attack').classList.toggle('hidden', State.battleTab !== 'attack');
    el('section-defend').classList.toggle('hidden', State.battleTab !== 'defend');
  } else {
    el('section-attack').classList.remove('hidden');
    el('section-defend').classList.remove('hidden');
  }
}

// ===== MAIN APP =====
const App = {
  _deferredInstall: null,

  init() {
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      App._deferredInstall = e;
      el('install-btn').classList.remove('hidden');
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    showScreen('menu');
  },

  installPWA() {
    if (App._deferredInstall) {
      App._deferredInstall.prompt();
    }
  },

  showMenu() {
    net.disconnect();
    State.mode = null;
    showScreen('menu');
  },

  selectMode(mode) {
    State.mode = mode;
    if (mode === 'online') {
      const saved = localStorage.getItem('playerName') || '';
      el('online-name-create').value = saved;
      el('online-name-join').value = saved;
      showScreen('online-setup');
    } else {
      // Show name entry
      el('names-title').textContent = mode === 'ai' ? 'Dit navn' : 'Spillernavne';
      el('name2-group').classList.toggle('hidden', mode === 'ai');
      el('difficulty-group').classList.toggle('hidden', mode !== 'ai');
      const saved = localStorage.getItem('playerName') || '';
      el('name1').value = saved;
      el('name2').value = '';
      showScreen('names');
      setTimeout(() => {
        const input = el('name1');
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100);
    }
  },

  submitNames() {
    const n1 = el('name1').value.trim() || 'Spiller 1';
    const n2 = State.mode === 'local' ? (el('name2').value.trim() || 'Spiller 2') : 'Computer';
    localStorage.setItem('playerName', n1);
    const diff = q('input[name="difficulty"]:checked')?.value || 'medium';

    State.difficulty = diff;
    State.players = [
      { name: n1, board: makeBoard() },
      { name: n2, board: makeBoard() },
    ];

    if (State.mode === 'ai') {
      ai = new AI(diff);
    }

    State.placing = 0;
    State.passAfterPlace = State.mode === 'local';
    App.startPlacement();
  },

  startPlacement() {
    const p = State.players[State.placing];
    el('placement-title').textContent = `${p.name}: Placer dine skibe`;
    State.placingShip = null;
    State.horizontal = true;
    el('rotate-label').textContent = 'Vandret';
    State._prevRow = undefined;
    State._prevCol = undefined;

    const touch = window.matchMedia('(pointer: coarse)').matches;
    el('placement-hint').innerHTML = touch
      ? `<span class="hint-step">1️⃣ <strong>Tryk på et skib</strong> i listen til venstre</span>` +
        `<span class="hint-step">2️⃣ <strong>Tryk på brættet</strong> for at placere det</span>` +
        `<span class="hint-step">🔄 Brug <strong>Roter</strong>-knappen til at skifte retning</span>` +
        `<span class="hint-step">✏️ Tryk på et placeret skib for at flytte det</span>`
      : `<span class="hint-step">1️⃣ <strong>Klik på et skib</strong> i listen til venstre</span>` +
        `<span class="hint-step">2️⃣ <strong>Klik på brættet</strong> for at placere det</span>` +
        `<span class="hint-step">🔄 <strong>Roter</strong>-knappen eller tast <span class="hint-key">R</span> for at skifte retning</span>` +
        `<span class="hint-step">✏️ Klik på et placeret skib for at flytte det</span>`;

    renderShipList();
    renderPlacementBoard();
    updatePlacementDoneBtn();
    showScreen('placement');
    // Set up hover listeners once after screen is shown
    setupPlacementListeners();
  },

  toggleRotation() {
    State.horizontal = !State.horizontal;
    el('rotate-label').textContent = State.horizontal ? 'Vandret' : 'Lodret';
    // Re-validate preview with new orientation and refresh board
    if (State._prevRow !== undefined && State.placingShip) {
      const board = State.players[State.placing].board;
      const def = SHIPS_DEF.find(d => d.id === State.placingShip.id);
      State._prevValid = canPlaceShip(board, def, State._prevRow, State._prevCol, State.horizontal);
    }
    renderPlacementBoard();
    // Re-attach listeners since renderBoard rebuilt the DOM
    setupPlacementListeners();
  },

  randomPlacement() {
    randomPlaceAll(State.players[State.placing].board);
    State.placingShip = null;
    State._prevRow = undefined;
    renderShipList();
    renderPlacementBoard();
    setupPlacementListeners();
    updatePlacementDoneBtn();
  },

  clearPlacement() {
    const board = State.players[State.placing].board;
    board.grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
    board.ships = [];
    State.placingShip = null;
    State._prevRow = undefined;
    renderShipList();
    renderPlacementBoard();
    setupPlacementListeners();
    updatePlacementDoneBtn();
  },

  placementClick(row, col) {
    if (!State.placingShip) {
      // Clicking a placed ship picks it up for re-placement
      const board = State.players[State.placing].board;
      const shipId = board.grid[row][col];
      if (shipId) {
        removeShip(board, shipId);
        State.placingShip = SHIPS_DEF.find(d => d.id === shipId);
        State._prevRow = undefined;
        renderShipList();
        renderPlacementBoard();
        setupPlacementListeners();
        updatePlacementDoneBtn();
      }
      return;
    }

    const board = State.players[State.placing].board;
    const def = SHIPS_DEF.find(d => d.id === State.placingShip.id);

    // Remove old placement BEFORE canPlaceShip so own cells don't block re-placement
    if (board.ships.find(s => s.id === def.id)) {
      removeShip(board, def.id);
    }

    if (!canPlaceShip(board, def, row, col, State.horizontal)) {
      // Can't place here — put it back if it was on the board (shouldn't happen, but safe)
      return;
    }

    placeShip(board, def, row, col, State.horizontal);
    SFX.place();
    State.placingShip = null;
    State._prevRow = undefined;
    renderShipList();
    renderPlacementBoard();
    setupPlacementListeners();
    updatePlacementDoneBtn();
  },

  donePlacing() {
    if (State.mode === 'ai') {
      // AI places ships too
      randomPlaceAll(State.players[1].board);
      State.current = 0;
      App.startBattle();
    } else if (State.mode === 'local') {
      if (State.placing === 0) {
        // Pass to player 2
        App.showPass(
          `Giv enheden til ${State.players[1].name}`,
          `${State.players[1].name} skal nu placere sine skibe.`,
          () => {
            State.placing = 1;
            App.startPlacement();
          }
        );
      } else {
        // Both placed, start battle
        State.current = 0;
        App.showPass(
          `${State.players[0].name}: Din tur!`,
          'Spillet begynder nu. Vælg en celle at skyde på.',
          () => App.startBattle()
        );
      }
    } else if (State.mode === 'online') {
      // Send ships placed notification (not actual positions)
      net.relay({ type: 'ships_placed' });
      el('waiting-title').textContent = 'Venter på at modstander placerer skibe...';
      el('room-code-display').classList.add('hidden');
      showScreen('waiting');
      State._myShipsPlaced = true;
      if (State._oppShipsPlaced) App.startOnlineBattle();
    }
  },

  showPass(title, message, callback) {
    el('pass-title').textContent = title;
    el('pass-message').textContent = message;
    App._passCallback = callback;
    showScreen('pass');
  },

  readyAfterPass() {
    if (App._passCallback) {
      const cb = App._passCallback;
      App._passCallback = null;
      cb();
    }
  },

  startBattle() {
    State.phase = 'battle';
    State.lastHit = null;
    State.battleTab = 'attack';
    el('tab-attack').classList.add('active');
    el('tab-defend').classList.remove('active');
    renderBattleScreen();
    showScreen('battle');
  },

  battleTab(tab) {
    State.battleTab = tab;
    el('tab-attack').classList.toggle('active', tab === 'attack');
    el('tab-defend').classList.toggle('active', tab === 'defend');
    el('section-attack').classList.toggle('hidden', tab !== 'attack');
    el('section-defend').classList.toggle('hidden', tab !== 'defend');
  },

  fireShot(row, col) {
    const opp = State.players[1 - State.current];

    if (State.mode === 'online' && State.current !== State.online.myIndex) return;
    if (opp.board.shots.some(s => s[0] === row && s[1] === col)) return;

    const result = shootAt(opp.board, row, col);
    if (result.alreadyShot) return;

    SFX.cannon();
    if (State.mode === 'online') net.relay({ type: 'shot', row, col });

    State.lastShot = { row, col, hit: result.hit, boardId: 'enemy-board' };
    App.processShotResult(row, col, result, opp);
  },

  processShotResult(row, col, result, opp) {
    let msg = result.sunk  ? `💥 ${opp.name}s ${result.ship.name} er sænket!`
            : result.hit   ? `🎯 Ramt!`
                           : `💧 Forbi!`;

    if (isWon(opp.board)) {
      renderBattleScreen();
      flashLastShot();
      setTimeout(() => {
        if (result.sunk) SFX.sunk(); else SFX.explosion();
        App.gameOver(State.current);
      }, 350);
      return;
    }

    renderBattleScreen();
    flashLastShot();

    setTimeout(() => {
      if (result.sunk) SFX.sunk();
      else if (result.hit) SFX.explosion();
      else SFX.splash();
      showMessage(msg);

      if (State.mode === 'ai') {
        ai.recordResult(row, col, result);
        setTimeout(() => App.aiTurn(), result.hit ? 700 : 900);
      } else if (State.mode === 'local') {
        setTimeout(() => {
          const next = 1 - State.current;
          State.current = next;
          App.showPass(
            `${State.players[next].name}: Din tur!`,
            'Vælg en celle at skyde på. Sørg for at modstanderen ikke kigger!',
            () => { renderBattleScreen(); showScreen('battle'); }
          );
        }, 1000);
      } else if (State.mode === 'online') {
        State.current = 1 - State.current;
        renderBattleScreen();
        if (State.current === State.online.myIndex) {
          showMessage('Din tur! Vælg en celle at skyde på.', 3000);
        } else {
          showMessage(`${State.players[State.current].name}s tur...`, 60000);
        }
      }
    }, 350);
  },

  aiTurn() {
    const targetBoard = State.players[0].board;
    const shot = ai.getShot(targetBoard);
    if (!shot) return;
    const [row, col] = shot;

    const result = shootAt(targetBoard, row, col);
    ai.recordResult(row, col, result);

    SFX.cannon();
    State.current = 0;
    State.lastShot = { row, col, hit: result.hit, boardId: 'own-board' };

    let msg = result.sunk  ? `💥 Computeren sænkede din ${result.ship.name}!`
            : result.hit   ? `🎯 Computeren ramte!`
                           : `💧 Computeren missede.`;

    if (isWon(targetBoard)) {
      renderBattleScreen();
      // Switch to defend tab on mobile so player sees the hit
      if (window.innerWidth < 700) App.battleTab('defend');
      flashLastShot();
      setTimeout(() => {
        SFX.sunk();
        App.gameOver(1);
      }, 350);
      return;
    }

    renderBattleScreen();
    flashLastShot();
    // Switch to defend tab on mobile so player sees the AI's shot
    if (window.innerWidth < 700) {
      App.battleTab('defend');
      setTimeout(() => App.battleTab('attack'), 1600);
    }
    setTimeout(() => {
      if (result.sunk) SFX.sunk();
      else if (result.hit) SFX.explosion();
      else SFX.splash();
      showMessage(msg);
    }, 350);
  },

  gameOver(winnerIndex) {
    const winner = State.players[winnerIndex];
    const loser = State.players[1 - winnerIndex];
    el('winner-emoji').textContent = winnerIndex === 0 ? '🏆' : (State.mode === 'ai' ? '🤖' : '🏆');
    el('winner-text').textContent = `${winner.name} vandt!`;
    el('gameover-detail').textContent = `${loser.name}s flåde er sænket.`;

    // Show mini boards
    const gb = el('gameover-boards');
    gb.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;';
      const title = document.createElement('h3');
      title.textContent = State.players[i].name;
      wrap.appendChild(title);
      const boardEl = document.createElement('div');
      boardEl.className = 'board';
      boardEl.style.cssText = '--cell-size:22px;--board-label:16px;';
      renderBoard(boardEl, State.players[i].board, { showShips: true, interactive: false });
      wrap.appendChild(boardEl);
      gb.appendChild(wrap);
    }

    showScreen('gameover');
  },

  playAgain() {
    if (State.mode === 'ai') {
      App.selectMode('ai');
    } else if (State.mode === 'local') {
      // Reset boards and start placement again
      State.players.forEach(p => { p.board = makeBoard(); });
      State.placing = 0;
      App.startPlacement();
    } else if (State.mode === 'online') {
      App.showMenu();
    }
  },

  // ===== ONLINE =====
  onlineTab(tab) {
    el('online-create').classList.toggle('hidden', tab !== 'create');
    el('online-join').classList.toggle('hidden', tab !== 'join');
    el('tab-create').classList.toggle('active', tab === 'create');
    el('tab-join').classList.toggle('active', tab !== 'create');
    setTimeout(() => {
      if (tab === 'create') el('online-name-create').focus();
      else el('online-name-join').focus();
    }, 100);
  },

  async createRoom() {
    const name = el('online-name-create').value.trim() || 'Spiller 1';
    localStorage.setItem('playerName', name);
    el('online-error').classList.add('hidden');
    net.onMessage = App.handleNetworkMessage;
    State.players = [
      { name, board: makeBoard() },
      { name: '...', board: makeBoard() },
    ];
    State.online.myIndex = 0;
    el('waiting-title').textContent = 'Opretter rum...';
    el('room-code-display').classList.add('hidden');
    showScreen('waiting');
    try {
      const code = await net.host(name);
      App._roomCode = code;
      el('room-code-value').textContent = code;
      el('room-code-display').classList.remove('hidden');
      el('waiting-title').textContent = 'Venter på modstander...';
    } catch (err) {
      net.disconnect();
      el('online-error').textContent = err.message;
      el('online-error').classList.remove('hidden');
      showScreen('online-setup');
    }
  },

  async joinRoom() {
    const name = el('online-name-join').value.trim() || 'Spiller 2';
    localStorage.setItem('playerName', name);
    const code = el('room-code-input').value.trim().toUpperCase();
    el('online-error').classList.add('hidden');
    if (!code || code.length < 4) {
      el('online-error').textContent = 'Indtast rumkoden.';
      el('online-error').classList.remove('hidden');
      return;
    }
    net.onMessage = App.handleNetworkMessage;
    el('waiting-title').textContent = 'Forbinder...';
    el('room-code-display').classList.add('hidden');
    showScreen('waiting');
    try {
      await net.join(code, name);
      // room_joined message arrives from host and starts placement
    } catch (err) {
      net.disconnect();
      el('online-error').textContent = err.message;
      el('online-error').classList.remove('hidden');
      showScreen('online-setup');
    }
  },

  _roomCode: null,

  copyRoomCode() {
    if (App._roomCode) {
      navigator.clipboard?.writeText(App._roomCode).then(() => showMessage('Kode kopieret! 📋'));
    }
  },

  handleNetworkMessage(msg) {
    switch (msg.type) {
      case 'room_joined': {
        // Received by the joiner from the host
        State.online.myIndex = 1;
        const myName = net._myName || 'Spiller 2';
        State.players = [
          { name: msg.opponentName, board: makeBoard() },
          { name: myName, board: makeBoard() },
        ];
        State.placing = 1;
        State._myShipsPlaced = false;
        State._oppShipsPlaced = false;
        App.startPlacement();
        break;
      }
      case 'opponent_joined': {
        // Fired locally by Network.host() when joiner connects
        State.players[1].name = msg.opponentName;
        el('waiting-title').textContent = `${msg.opponentName} er klar!`;
        State.placing = 0;
        State._myShipsPlaced = false;
        State._oppShipsPlaced = false;
        setTimeout(() => App.startPlacement(), 800);
        break;
      }
      case 'relay': {
        App.handleRelayMessage(msg.data);
        break;
      }
      case 'opponent_disconnected': {
        showMessage('Modstanderen forlod spillet. 😔', 5000);
        setTimeout(() => App.showMenu(), 3000);
        break;
      }
    }
  },

  handleRelayMessage(data) {
    if (!data) return;
    switch (data.type) {
      case 'ships_placed': {
        State._oppShipsPlaced = true;
        if (State._myShipsPlaced) App.startOnlineBattle();
        break;
      }
      case 'shot': {
        // Opponent shot at MY board
        const myBoard = State.players[State.online.myIndex].board;
        const result = shootAt(myBoard, data.row, data.col);
        State.lastHit = result.hit ? [data.row, data.col] : null;

        if (isWon(myBoard)) {
          renderBattleScreen();
          setTimeout(() => App.gameOver(1 - State.online.myIndex), 400);
          return;
        }

        // It's now my turn
        State.current = State.online.myIndex;
        renderBattleScreen();

        let msg = '';
        if (result.sunk) msg = `💥 Modstanderen sænkede din ${result.ship.name}!`;
        else if (result.hit) msg = `🎯 Modstanderen ramte dig!`;
        else msg = `💧 Modstanderen missede!`;
        showMessage(msg + ' Din tur!', 3000);
        break;
      }
    }
  },

  startOnlineBattle() {
    // Player 0 goes first
    State.current = 0;
    App.startBattle();
    if (State.online.myIndex !== 0) {
      showMessage(`${State.players[0].name} starter. Vent på din tur...`, 5000);
    } else {
      showMessage('Du starter! Vælg en celle at skyde på.', 3000);
    }
  },
};

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    if (document.getElementById('screen-placement').classList.contains('active')) {
      App.toggleRotation();
    }
  }
  if (e.key === 'Enter') {
    if (document.getElementById('screen-names').classList.contains('active')) {
      App.submitNames();
    }
  }
});

// Handle resize for responsive battle board
window.addEventListener('resize', () => {
  if (document.getElementById('screen-battle').classList.contains('active')) {
    renderBattleScreen();
  }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => App.init());
