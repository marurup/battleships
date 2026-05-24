'use strict';

// ===== CONSTANTS =====
const COLS_ALL = 'ABCDEFGHIJKLMN';

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
    id: 'open-sea',
    name: 'Åbent Hav',
    desc: 'Klassisk kamp på åbent hav',
    rows: 10, cols: 10,
    blocked: [],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'small-lake',
    name: 'Lille Sø',
    desc: 'Tæt kamp på en lille sø',
    rows: 8, cols: 8,
    blocked: [],
    ships: [ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'arctic',
    name: 'Arktis',
    desc: 'Isørkener og frosne farvande',
    rows: 10, cols: 10,
    blocked: [
      [0,0],[1,0],[0,1],
      [0,9],[0,8],[1,9],
      [9,0],[8,0],[9,1],
      [9,9],[9,8],[8,9],
      [4,4],[4,5],[5,4],[5,5],
    ],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'island-sea',
    name: 'Øhav',
    desc: 'Spredte øer gør det vanskeligt',
    rows: 10, cols: 10,
    blocked: [
      [1,5],[2,2],[2,7],[4,1],[4,8],[5,5],[7,3],[7,7],[8,1],[8,8],
    ],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'channel',
    name: 'Kanalen',
    desc: 'Smalt farvand — bred og kort bane',
    rows: 8, cols: 14,
    blocked: [
      [2,4],[2,5],[2,6],[2,7],[2,8],[2,9],
      [5,4],[5,5],[5,6],[5,7],[5,8],[5,9],
    ],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'great-sea',
    name: 'Storhavet',
    desc: 'Enormt hav — seks skibe i kamp',
    rows: 12, cols: 12,
    blocked: [
      [2,2],[2,9],[5,5],[5,6],[6,5],[6,6],[9,2],[9,9],
    ],
    ships: [ST.dreadnought, ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'minefield',
    name: 'Minestræde',
    desc: 'Indsnævrede løb med minefelter',
    rows: 10, cols: 10,
    blocked: [
      [1,3],[2,3],[3,3],[4,3],[5,3],[6,3],
      [3,6],[4,6],[5,6],[6,6],[7,6],[8,6],
    ],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'coral-reef',
    name: 'Koralrev',
    desc: 'Farverige rev skjuler farerne',
    rows: 10, cols: 12,
    blocked: [
      [1,2],[1,3],[2,2],
      [1,9],[2,8],[2,9],
      [4,5],[4,6],[5,5],
      [6,9],[7,8],[7,9],
      [8,3],[8,4],[9,4],
    ],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'polar',
    name: 'Polarekspedition',
    desc: 'Enorm isblok i midten — lille flåde',
    rows: 8, cols: 8,
    blocked: [
      [2,2],[2,3],[2,4],[2,5],
      [3,2],[3,3],[3,4],[3,5],
      [4,2],[4,3],[4,4],[4,5],
      [5,2],[5,3],[5,4],[5,5],
    ],
    ships: [ST.cruiser, ST.submarine, ST.destroyer, ST.frigate],
  },
  {
    id: 'delta',
    name: 'Deltaet',
    desc: 'Floddeltaets grene deler havet',
    rows: 10, cols: 12,
    blocked: [
      [0,5],[0,6],[1,5],[1,6],
      [2,4],[2,7],
      [3,3],[3,8],
      [4,3],[4,8],
    ],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
  {
    id: 'titans',
    name: 'Titanernes Hav',
    desc: 'Syv skibe på et enormt slagmark',
    rows: 12, cols: 14,
    blocked: [
      [3,5],[3,6],[3,7],[3,8],
      [8,5],[8,6],[8,7],[8,8],
      [5,11],[6,11],[7,11],
      [5,2],[6,2],[7,2],
    ],
    ships: [ST.dreadnought, ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer, ST.frigate],
  },
  {
    id: 'labyrinth',
    name: 'Labyrinten',
    desc: 'Snørklede gange — find vej til sejr',
    rows: 10, cols: 10,
    blocked: [
      [2,1],[2,2],[2,3],[2,4],
      [4,5],[4,6],[4,7],[4,8],[4,9],
      [6,0],[6,1],[6,2],[6,3],[6,4],
      [8,4],[8,5],[8,6],[8,7],[8,8],
    ],
    ships: [ST.carrier, ST.battleship, ST.cruiser, ST.submarine, ST.destroyer],
  },
];

// ===== STATE =====
const State = {
  mode: null,           // 'ai' | 'local' | 'online'
  phase: null,          // 'placement' | 'battle' | 'gameover'
  difficulty: 'medium',
  map: null,            // currently selected MAPS entry
  shipDefs: [],         // ships for this game (from map)
  players: [],          // [{name, board}]
  current: 0,
  placing: 0,
  online: {
    connected: false,
    roomCode: null,
    myIndex: null,
  },
  placingShip: null,
  horizontal: true,
  passAfterPlace: false,
  battleTab: 'attack',
  lastShot: null,       // { row, col, hit, boardId }
};

// ===== BOARD =====
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

// ===== AI =====
class AI {
  constructor(difficulty) {
    this.difficulty = difficulty;
    this.shotHistory = new Set();
    this.hits = [];
    this.huntTargets = [];
  }

  getShot(board) {
    if (this.difficulty === 'easy') return this._randomShot(board);
    if (this.difficulty === 'hard') return this._probabilityShot(board);
    return this._huntShot(board);
  }

  _key(r, c) { return r * 100 + c; }

  _valid(r, c, board) {
    return r >= 0 && r < board.rows
        && c >= 0 && c < board.cols
        && !this.shotHistory.has(this._key(r, c))
        && !isBlocked(board, r, c);
  }

  _randomShot(board) {
    const avail = [];
    for (let r = 0; r < board.rows; r++)
      for (let c = 0; c < board.cols; c++)
        if (this._valid(r, c, board)) avail.push([r, c]);
    if (avail.length === 0) return null;
    return avail[Math.floor(Math.random() * avail.length)];
  }

  _huntShot(board) {
    while (this.huntTargets.length > 0) {
      const [r, c] = this.huntTargets.shift();
      if (this._valid(r, c, board)) return [r, c];
    }
    const avail = [];
    for (let r = 0; r < board.rows; r++)
      for (let c = (r % 2); c < board.cols; c += 2)
        if (this._valid(r, c, board)) avail.push([r, c]);
    if (avail.length === 0) return this._randomShot(board);
    return avail[Math.floor(Math.random() * avail.length)];
  }

  _probabilityShot(board) {
    if (this.huntTargets.length > 0) {
      while (this.huntTargets.length > 0) {
        const [r, c] = this.huntTargets.shift();
        if (this._valid(r, c, board)) return [r, c];
      }
    }

    const prob = Array.from({ length: board.rows }, () => Array(board.cols).fill(0));
    const remainingSizes = State.shipDefs
      .filter(def => !board.ships.find(s => s.id === def.id)?.sunk)
      .map(def => def.size);

    for (const size of remainingSizes) {
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c <= board.cols - size; c++) {
          if (this._canFit(board, r, c, true, size)) {
            for (let i = 0; i < size; i++) prob[r][c + i]++;
          }
        }
      }
      for (let c = 0; c < board.cols; c++) {
        for (let r = 0; r <= board.rows - size; r++) {
          if (this._canFit(board, r, c, false, size)) {
            for (let i = 0; i < size; i++) prob[r + i][c]++;
          }
        }
      }
    }

    for (const [r, c] of board.shots) prob[r][c] = 0;

    let best = -1, bestCells = [];
    for (let r = 0; r < board.rows; r++)
      for (let c = 0; c < board.cols; c++)
        if (prob[r][c] > best) { best = prob[r][c]; bestCells = [[r, c]]; }
        else if (prob[r][c] === best) bestCells.push([r, c]);

    return bestCells.length
      ? bestCells[Math.floor(Math.random() * bestCells.length)]
      : this._randomShot(board);
  }

  _canFit(board, r, c, horiz, size) {
    for (let i = 0; i < size; i++) {
      const row = horiz ? r : r + i;
      const col = horiz ? c + i : c;
      if (row >= board.rows || col >= board.cols) return false;
      if (isBlocked(board, row, col)) return false;
      if (board.shots.some(s => s[0] === row && s[1] === col) && board.grid[row][col] === null) return false;
    }
    return true;
  }

  recordResult(row, col, result) {
    this.shotHistory.add(this._key(row, col));
    if (result.sunk) {
      this.huntTargets = [];
      this.hits = [];
    } else if (result.hit) {
      if (this.hits.length > 0) {
        const [pr, pc] = this.hits[this.hits.length - 1];
        const dr = row - pr, dc = col - pc;
        if (dr !== 0 || dc !== 0) {
          this.huntTargets.unshift([row + dr, col + dc]);
          this.huntTargets.push([pr - dr, pc - dc]);
        }
      }
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) this.huntTargets.push([row + dr, col + dc]);
      this.hits.push([row, col]);
    }
  }
}

// ===== NETWORK =====
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
            conn.send({
              type: 'room_joined',
              playerIndex: 1,
              opponentName: name,
              mapId: State.map ? State.map.id : 'open-sea',
            });
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
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.25);
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

// ===== DEBUG =====
const DEBUG = true;
function dbg(...args) { if (DEBUG) console.log('[BSH]', ...args); }

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
  addShipDetail(cell, ship, idx);
}

function addShipDetail(cell, ship, idx) {
  const last = ship.cells.length - 1;

  // Carrier: runway stripe on every cell
  if (ship.id === 'carrier') {
    const rw = document.createElement('div');
    rw.className = 'sd sd-runway';
    cell.appendChild(rw);
  }

  // Pick detail type based on ship + position
  let cls = null;
  switch (ship.id) {
    case 'dreadnought':
      if (idx === 0 || idx === 4)      cls = 'sd-turret';
      else if (idx === 2)              cls = 'sd-bridge';
      else if (idx === 1 || idx === 3) cls = 'sd-turret-sm';
      break;
    case 'carrier':
      if (idx === 1)                   cls = 'sd-tower';
      break;
    case 'battleship':
      if (idx === 0 || idx === 2)      cls = 'sd-turret';
      else if (idx === 1)              cls = 'sd-bridge';
      break;
    case 'cruiser':
      if (idx === 0)                   cls = 'sd-turret';
      else if (idx === 1)              cls = 'sd-bridge';
      else if (idx === last)           cls = 'sd-turret-sm';
      break;
    case 'submarine':
      if (idx === 1)                   cls = 'sd-conning';
      break;
    case 'destroyer':
      if (idx === 0)                   cls = 'sd-turret-sm';
      else                             cls = 'sd-bridge-sm';
      break;
    case 'frigate':
      if (idx === 0)                   cls = 'sd-bridge-sm';
      else                             cls = 'sd-helipad';
      break;
  }

  if (cls) {
    const d = document.createElement('div');
    d.className = `sd ${cls}`;
    cell.appendChild(d);
  }
}

function renderBoard(container, board, opts = {}) {
  const { rows, cols } = board;
  const {
    interactive = false, showShips = false, onShot,
    previewRow, previewCol, previewHoriz, previewSize, previewValid,
  } = opts;
  container.innerHTML = '';

  // Dynamic grid layout — set inline so variable board sizes work
  container.style.gridTemplateColumns = `var(--board-label) repeat(${cols}, var(--cell-size))`;
  container.style.gridTemplateRows    = `var(--board-label) repeat(${rows}, var(--cell-size))`;
  container.dataset.cols = cols;
  container.dataset.rows = rows;

  // Corner
  const corner = document.createElement('div');
  corner.className = 'board-label';
  container.appendChild(corner);

  // Column labels (A–N)
  for (let c = 0; c < cols; c++) {
    const lbl = document.createElement('div');
    lbl.className = 'board-label';
    lbl.textContent = COLS_ALL[c];
    container.appendChild(lbl);
  }

  for (let r = 0; r < rows; r++) {
    const rowLbl = document.createElement('div');
    rowLbl.className = 'board-label';
    rowLbl.textContent = r + 1;
    container.appendChild(rowLbl);

    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      // Island / blocked cell
      if (board.grid[r][c] === 'blocked') {
        cell.classList.add('blocked');
        container.appendChild(cell);
        continue;
      }

      const shipId = board.grid[r][c];
      const shot = board.shots.find(s => s[0] === r && s[1] === c);

      if (shot !== undefined) {
        const marker = document.createElement('span');
        marker.className = 'shot-marker';
        if (shipId) {
          const ship = board.ships.find(s => s.id === shipId);
          const sunk = ship?.sunk;
          cell.classList.add(sunk ? 'sunk' : 'hit');
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
}

let _placementAbort = null;
function setupPlacementListeners() {
  if (_placementAbort) _placementAbort.abort();
  _placementAbort = new AbortController();
  const { signal } = _placementAbort;
  const container = el('placement-board');

  container.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell || !State.placingShip) return;
    if (cell.classList.contains('blocked')) return;
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    if (r === State._prevRow && c === State._prevCol) return;
    const board = State.players[State.placing].board;
    const def = State.shipDefs.find(d => d.id === State.placingShip.id);
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

function updatePlacementPreview() {
  const container = el('placement-board');
  const ship = State.placingShip;
  container.querySelectorAll('.cell:not(.blocked)').forEach(cell => {
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

  for (const def of State.shipDefs) {
    const placed = placedIds.includes(def.id);
    const selected = State.placingShip?.id === def.id;

    const item = document.createElement('div');
    item.className = `ship-item ${placed ? 'placed' : ''} ${selected ? 'selected' : ''}`;

    const preview = document.createElement('div');
    preview.className = 'ship-preview-strip';
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
        State._prevRow = undefined;
        renderShipList();
        renderPlacementBoard();
        setupPlacementListeners();
      });
    }

    list.appendChild(item);
  }
}

function updatePlacementDoneBtn() {
  const board = State.players[State.placing].board;
  el('placement-done-btn').disabled = board.ships.length < State.shipDefs.length;
}

// ===== BATTLE UI =====
function renderBattleScreen() {
  // In online mode "me" is always the local player, not whoever's turn it is
  const meIdx = State.mode === 'online' ? State.online.myIndex : State.current;
  const me  = State.players[meIdx];
  const opp = State.players[1 - meIdx];
  if (State.mode === 'online') {
    dbg('renderBattle:', { meIdx, current: State.current, waiting: State._waitingForResult,
      myShots: me.board.shots.length, myShips: me.board.ships.length,
      oppShots: opp.board.shots.length, oppShips: opp.board.ships.length });
  }

  if (State.mode === 'online') {
    el('turn-indicator').textContent = State.current === State.online.myIndex
      ? '⚔️ Din tur' : `⏳ Venter på ${State.players[State.current].name}...`;
  } else if (State.mode === 'local') {
    el('turn-indicator').textContent = `⚔️ ${me.name}, din tur!`;
  } else {
    el('turn-indicator').textContent = '⚔️ Din tur';
  }

  el('attack-board-label').textContent = `${opp.name}s hav`;
  el('defend-board-label').textContent = 'Dit hav';

  const oppSunk = opp.board.ships.filter(s => s.sunk).length;
  const mySunk  = me.board.ships.filter(s => s.sunk).length;
  el('battle-stats').textContent =
    `Du: ${oppSunk}/${State.shipDefs.length} sænket | Modst.: ${mySunk}/${State.shipDefs.length} sænket`;

  // Only allow clicking when it's my turn and I'm not waiting for a result
  const canFire = State.mode !== 'online'
    || (State.current === State.online.myIndex && !State._waitingForResult);

  renderBoard(el('enemy-board'), opp.board, {
    interactive: canFire,
    showShips: false,
    onShot: (r, c) => App.fireShot(r, c),
  });

  renderBoard(el('own-board'), me.board, {
    interactive: false,
    showShips: true,
  });

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

// ===== MAP SELECT UI =====
function renderMapGrid() {
  const container = el('map-grid');
  container.innerHTML = '';
  for (const map of MAPS) {
    const card = document.createElement('div');
    card.className = 'map-card';
    card.onclick = () => App.mapSelected(map.id);

    const preview = document.createElement('div');
    preview.className = 'map-preview';
    preview.style.gridTemplateColumns = `repeat(${map.cols}, 1fr)`;

    const blockedSet = new Set(map.blocked.map(([r, c]) => `${r},${c}`));
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const cell = document.createElement('div');
        cell.className = blockedSet.has(`${r},${c}`) ? 'mp-blocked' : 'mp-water';
        preview.appendChild(cell);
      }
    }

    const info = document.createElement('div');
    info.className = 'map-info';
    info.innerHTML =
      `<div class="map-name">${map.name}</div>` +
      `<div class="map-size">${map.cols}×${map.rows} · ${map.ships.length} skibe</div>` +
      `<div class="map-desc">${map.desc}</div>`;

    card.appendChild(preview);
    card.appendChild(info);
    container.appendChild(card);
  }
}

// ===== MAIN APP =====
const App = {
  _deferredInstall: null,

  init() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      App._deferredInstall = e;
      el('install-btn').classList.remove('hidden');
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    fetch('version.json')
      .then(r => r.json())
      .then(v => {
        const date = new Date(v.date).toLocaleString('da-DK', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        el('version-info').textContent = `${v.hash} · ${date}`;
      })
      .catch(() => {});

    showScreen('menu');
  },

  installPWA() {
    if (App._deferredInstall) App._deferredInstall.prompt();
  },

  showMenu() {
    net.disconnect();
    State.mode = null;
    State.map = null;
    State.shipDefs = [];
    showScreen('menu');
  },

  selectMode(mode) {
    State.mode = mode;
    if (mode === 'online') {
      // Joiner never needs to pick a map — host sends it via room_joined.
      // Show host/join screen first; host picks map when clicking "Opret rum".
      const saved = localStorage.getItem('playerName') || '';
      el('online-name-create').value = saved;
      el('online-name-join').value = saved;
      showScreen('online-setup');
    } else {
      State._mapContext = mode; // 'ai' or 'local'
      renderMapGrid();
      showScreen('mapselect');
    }
  },

  // Called by "Opret rum" button — host picks map before the room is created.
  showMapSelectForHost() {
    State._mapContext = 'online-host';
    renderMapGrid();
    showScreen('mapselect');
  },

  // Back button on the map select screen.
  _mapBack() {
    if (State._mapContext === 'online-host') {
      showScreen('online-setup');
    } else {
      App.showMenu();
    }
  },

  mapSelected(mapId) {
    State.map = MAPS.find(m => m.id === mapId);
    State.shipDefs = [...State.map.ships];

    if (State._mapContext === 'online-host') {
      // Proceed straight to room creation with the chosen map.
      App.createRoom();
    } else {
      // ai or local — show names screen.
      el('names-title').textContent = State.mode === 'ai' ? 'Dit navn' : 'Spillernavne';
      el('name2-group').classList.toggle('hidden', State.mode === 'ai');
      el('difficulty-group').classList.toggle('hidden', State.mode !== 'ai');
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

  applyMap(mapId) {
    State.map = MAPS.find(m => m.id === mapId) || MAPS[0];
    State.shipDefs = [...State.map.ships];
  },

  submitNames() {
    const n1 = el('name1').value.trim() || 'Spiller 1';
    const n2 = State.mode === 'local' ? (el('name2').value.trim() || 'Spiller 2') : 'Computer';
    localStorage.setItem('playerName', n1);
    const diff = q('input[name="difficulty"]:checked')?.value || 'medium';

    State.difficulty = diff;
    State.players = [
      { name: n1, board: makeBoard(State.map) },
      { name: n2, board: makeBoard(State.map) },
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
    setupPlacementListeners();
  },

  toggleRotation() {
    State.horizontal = !State.horizontal;
    el('rotate-label').textContent = State.horizontal ? 'Vandret' : 'Lodret';
    if (State._prevRow !== undefined && State.placingShip) {
      const board = State.players[State.placing].board;
      const def = State.shipDefs.find(d => d.id === State.placingShip.id);
      State._prevValid = canPlaceShip(board, def, State._prevRow, State._prevCol, State.horizontal);
    }
    renderPlacementBoard();
    setupPlacementListeners();
  },

  randomPlacement() {
    randomPlaceAll(State.players[State.placing].board, State.shipDefs);
    State.placingShip = null;
    State._prevRow = undefined;
    renderShipList();
    renderPlacementBoard();
    setupPlacementListeners();
    updatePlacementDoneBtn();
  },

  clearPlacement() {
    const board = State.players[State.placing].board;
    resetBoardGrid(board);
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
      const board = State.players[State.placing].board;
      const shipId = board.grid[row][col];
      if (shipId && shipId !== 'blocked') {
        removeShip(board, shipId);
        State.placingShip = State.shipDefs.find(d => d.id === shipId);
        State._prevRow = undefined;
        renderShipList();
        renderPlacementBoard();
        setupPlacementListeners();
        updatePlacementDoneBtn();
      }
      return;
    }

    const board = State.players[State.placing].board;
    const def = State.shipDefs.find(d => d.id === State.placingShip.id);

    if (board.ships.find(s => s.id === def.id)) {
      removeShip(board, def.id);
    }

    if (!canPlaceShip(board, def, row, col, State.horizontal)) return;

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
      randomPlaceAll(State.players[1].board, State.shipDefs);
      State.current = 0;
      App.startBattle();
    } else if (State.mode === 'local') {
      if (State.placing === 0) {
        App.showPass(
          `Giv enheden til ${State.players[1].name}`,
          `${State.players[1].name} skal nu placere sine skibe.`,
          () => {
            State.placing = 1;
            App.startPlacement();
          }
        );
      } else {
        State.current = 0;
        App.showPass(
          `${State.players[0].name}: Din tur!`,
          'Spillet begynder nu. Vælg en celle at skyde på.',
          () => App.startBattle()
        );
      }
    } else if (State.mode === 'online') {
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
    if (State.mode === 'online') {
      // Online: relay shot to opponent, wait for shot_result — don't process locally
      dbg('fireShot online', { row, col, current: State.current, myIndex: State.online.myIndex, waiting: State._waitingForResult });
      if (State.current !== State.online.myIndex) { dbg('  blocked: not my turn'); return; }
      if (State._waitingForResult) { dbg('  blocked: waiting for result'); return; }
      const opp = State.players[1 - State.online.myIndex];
      if (opp.board.shots.some(s => s[0] === row && s[1] === col)) { dbg('  blocked: already shot'); return; }
      if (isBlocked(opp.board, row, col)) { dbg('  blocked: blocked cell'); return; }
      SFX.cannon();
      dbg('  sending shot', { row, col });
      net.relay({ type: 'shot', row, col });
      State._waitingForResult = true;
      renderBattleScreen();
      return;
    }

    // Local / AI mode
    const opp = State.players[1 - State.current];
    if (opp.board.shots.some(s => s[0] === row && s[1] === col)) return;
    if (isBlocked(opp.board, row, col)) return;

    const result = shootAt(opp.board, row, col);
    if (result.alreadyShot) return;

    SFX.cannon();
    State.lastShot = { row, col, hit: result.hit, boardId: 'enemy-board' };
    App.processShotResult(row, col, result, opp);
  },

  processShotResult(row, col, result, opp) {
    const msg = result.sunk ? `💥 ${opp.name}s ${result.ship.name} er sænket!`
              : result.hit  ? `🎯 Ramt!`
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
      }
      // Online mode is handled by shot / shot_result relay messages
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

    const msg = result.sunk ? `💥 Computeren sænkede din ${result.ship.name}!`
              : result.hit  ? `🎯 Computeren ramte!`
                            : `💧 Computeren missede.`;

    if (isWon(targetBoard)) {
      renderBattleScreen();
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
    const loser  = State.players[1 - winnerIndex];
    el('winner-emoji').textContent = winnerIndex === 0 ? '🏆' : (State.mode === 'ai' ? '🤖' : '🏆');
    el('winner-text').textContent = `${winner.name} vandt!`;
    el('gameover-detail').textContent = `${loser.name}s flåde er sænket.`;

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
    if (State.mode === 'local') {
      State.players.forEach(p => { p.board = makeBoard(State.map); });
      State.placing = 0;
      App.startPlacement();
    } else if (State.mode === 'online') {
      App.showMenu();
    } else {
      // AI or other: back to map select
      renderMapGrid();
      showScreen('mapselect');
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
      { name, board: makeBoard(State.map) },
      { name: '...', board: makeBoard(State.map) },
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
    dbg('net msg:', msg.type, msg.type === 'relay' ? msg.data?.type : '');
    switch (msg.type) {
      case 'room_joined': {
        App.applyMap(msg.mapId);
        State.online.myIndex = 1;
        const myName = net._myName || 'Spiller 2';
        State.players = [
          { name: msg.opponentName, board: makeBoard(State.map) },
          { name: myName,           board: makeBoard(State.map) },
        ];
        State.placing = 1;
        State._myShipsPlaced = false;
        State._oppShipsPlaced = false;
        App.startPlacement();
        break;
      }
      case 'opponent_joined': {
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
    dbg('relay received:', JSON.stringify(data));
    switch (data.type) {
      case 'ships_placed': {
        dbg('opponent ships placed');
        State._oppShipsPlaced = true;
        if (State._myShipsPlaced) App.startOnlineBattle();
        break;
      }

      // Opponent shot at MY board — process and send result back
      case 'shot': {
        const myBoard = State.players[State.online.myIndex].board;
        dbg('incoming shot at my board', { row: data.row, col: data.col, myShips: myBoard.ships.length, myShots: myBoard.shots.length });
        const result = shootAt(myBoard, data.row, data.col);
        dbg('shot result on my board:', { hit: result.hit, sunk: result.sunk, shipId: result.ship?.id, alreadyShot: result.alreadyShot });

        // Reply with the outcome so the shooter can update their display
        const reply = {
          type: 'shot_result',
          row: data.row, col: data.col,
          hit: result.hit, sunk: result.sunk,
          shipId: result.ship?.id || null,
          shipName: result.ship?.name || null,
          won: isWon(myBoard),
        };
        // When sunk, include full ship shape so attacker can render it
        if (result.sunk && result.ship) {
          reply.shipCells = result.ship.cells;
          reply.shipSize  = result.ship.size;
          reply.shipHoriz = result.ship.horiz;
        }
        dbg('sending shot_result:', JSON.stringify(reply));
        net.relay(reply);

        SFX.cannon();
        State.lastShot = { row: data.row, col: data.col, hit: result.hit, boardId: 'own-board' };

        if (isWon(myBoard)) {
          dbg('my board is lost — game over');
          renderBattleScreen();
          if (window.innerWidth < 700) App.battleTab('defend');
          flashLastShot();
          setTimeout(() => { SFX.sunk(); App.gameOver(1 - State.online.myIndex); }, 400);
          return;
        }

        // It's now my turn
        State.current = State.online.myIndex;
        dbg('my turn now, current:', State.current);
        renderBattleScreen();
        if (window.innerWidth < 700) {
          App.battleTab('defend');
          setTimeout(() => App.battleTab('attack'), 2000);
        }
        flashLastShot();

        setTimeout(() => {
          if (result.sunk) SFX.sunk();
          else if (result.hit) SFX.explosion();
          else SFX.splash();
          const msg = result.sunk ? `💥 Modstanderen sænkede din ${result.ship.name}!`
                    : result.hit  ? `🎯 Modstanderen ramte dig!`
                                  : `💧 Modstanderen missede!`;
          showMessage(msg + ' Din tur!', 3000);
        }, 350);
        break;
      }

      // Result of MY shot against the opponent
      case 'shot_result': {
        State._waitingForResult = false;
        const oppIdx = 1 - State.online.myIndex;
        const opp = State.players[oppIdx];

        dbg('shot_result received:', { row: data.row, col: data.col, hit: data.hit, sunk: data.sunk, shipId: data.shipId, won: data.won });

        // Update local copy of opponent's board with the result
        opp.board.shots.push([data.row, data.col]);
        if (data.hit && data.shipId) {
          opp.board.grid[data.row][data.col] = data.shipId;
          let ship = opp.board.ships.find(s => s.id === data.shipId);
          if (!ship) {
            ship = { id: data.shipId, name: data.shipName, size: 0,
                     cells: [], hits: 0, sunk: false, horiz: true };
            opp.board.ships.push(ship);
          }
          ship.hits++;
          if (data.sunk && data.shipCells) {
            ship.sunk  = true;
            ship.cells = data.shipCells;
            ship.size  = data.shipSize;
            ship.horiz = data.shipHoriz;
            for (const [r, c] of data.shipCells) opp.board.grid[r][c] = data.shipId;
          } else {
            ship.cells.push([data.row, data.col]);
          }
        }

        dbg('opp board updated:', { shots: opp.board.shots.length, ships: opp.board.ships.length, grid_at_shot: opp.board.grid[data.row][data.col] });

        State.lastShot = { row: data.row, col: data.col, hit: data.hit, boardId: 'enemy-board' };

        if (data.won) {
          dbg('I won!');
          renderBattleScreen();
          flashLastShot();
          setTimeout(() => {
            if (data.sunk) SFX.sunk(); else SFX.explosion();
            App.gameOver(State.online.myIndex);
          }, 350);
          break;
        }

        // Turn switches to opponent
        State.current = 1 - State.online.myIndex;
        dbg('opponent turn now, current:', State.current);
        renderBattleScreen();
        flashLastShot();

        setTimeout(() => {
          if (data.sunk) SFX.sunk();
          else if (data.hit) SFX.explosion();
          else SFX.splash();
          const msg = data.sunk ? `💥 ${opp.name}s ${data.shipName} er sænket!`
                    : data.hit  ? `🎯 Ramt!`
                                : `💧 Forbi!`;
          showMessage(msg);
        }, 350);
        break;
      }
    }
  },

  startOnlineBattle() {
    State.current = 0;
    State._waitingForResult = false;
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

window.addEventListener('resize', () => {
  if (document.getElementById('screen-battle').classList.contains('active')) {
    renderBattleScreen();
  }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => App.init());
