// Simple static file server — only needed for local development.
// Online multiplayer uses PeerJS P2P (no server required).
// For production, deploy the /public folder to any static host
// (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.)

const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIP = 'localhost';
  for (const iface of Object.values(nets).flat()) {
    if (iface.family === 'IPv4' && !iface.internal) { localIP = iface.address; break; }
  }
  console.log(`\n⚓ Sænke Slagskibe`);
  console.log(`   Lokal:   http://localhost:${PORT}`);
  console.log(`   Netværk: http://${localIP}:${PORT}\n`);
});
