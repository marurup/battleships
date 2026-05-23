# ⚓ Sænke Slagskibe

Et klassisk Sænke Slagskibe-spil bygget som en **Progressive Web App (PWA)** — kan installeres og spilles på PC, iOS og Android uden app store.

**[▶ Spil her](https://marurup.github.io/battleships/)**

---

## Spiltilstande

| Tilstand | Beskrivelse |
|---|---|
| 🤖 **Mod Computer** | Spil mod en AI med tre sværhedsgrader |
| 📱 **Lokal Multiplayer** | To spillere på samme enhed — skærmen skiftes imellem |
| 🌐 **Online Multiplayer** | Hver spiller på sin egen enhed via P2P-forbindelse |

## Funktioner

- **PWA** — installerbar på alle platforme, virker offline
- **P2P multiplayer** uden server — én spiller opretter et rum og deler den 6-tegns kode med modstanderen
- **AI** i tre sværhedsgrader: let (tilfældig), medium (hunt-mode) og svær (sandsynlighedsberegning)
- **Skibsgrafik** med bov/hæk-former og typespecifikke farver
- **Animationer** ved træffer og forbi
- **Lydeffekter** genereret via Web Audio API — ingen lydfiler nødvendige
- **Husker dit kaldenavn** via `localStorage`
- Responsivt layout til både mobil (portræt/landskab) og desktop

## Skibe

| Skib | Størrelse |
|---|---|
| Hangarskib | 5 |
| Slagskib | 4 |
| Krydser | 3 |
| Ubåd | 3 |
| Destroyer | 2 |

## Placering af skibe

- Vælg et skib fra listen og klik/tryk på brættet for at placere det
- **Roter**-knappen (eller `R` på tastatur) skifter mellem vandret og lodret
- Klik/tryk på et allerede placeret skib for at flytte det
- **🎲 Tilfældig** placerer alle skibe automatisk

## Kør lokalt

```bash
git clone https://github.com/marurup/battleships.git
cd battleships
npm install
npm start
# Åbn http://localhost:3000
```

Node.js bruges kun til at servere de statiske filer under lokal udvikling. Online multiplayer kræver ingen server — det kører direkte browser-til-browser via [PeerJS](https://peerjs.com/) (WebRTC).

## Teknologi

- **Frontend:** Vanilla HTML, CSS og JavaScript — ingen frameworks
- **Multiplayer:** [PeerJS](https://peerjs.com/) (WebRTC P2P)
- **Lyd:** Web Audio API (proceduralt genereret)
- **Offline:** Service Worker med cache-first strategi
- **Hosting:** GitHub Pages via GitHub Actions

## Deploy

Ethvert push til `main` deployer automatisk til GitHub Pages via `.github/workflows/deploy.yml`. Kun indholdet af `public/`-mappen deployes.
