// Run with: node generate-icons.js
// Requires: npm install canvas
// Or just use the SVG icons directly

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, size, size);

  const s = size / 192; // scale factor

  // Ocean waves
  ctx.fillStyle = '#1a3a6c';
  ctx.beginPath();
  ctx.ellipse(size/2, size * 0.75, size * 0.45, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ship hull
  ctx.fillStyle = '#546e7a';
  const hullY = size * 0.6;
  ctx.beginPath();
  ctx.moveTo(size * 0.15, hullY);
  ctx.lineTo(size * 0.85, hullY);
  ctx.lineTo(size * 0.78, hullY + size * 0.12);
  ctx.lineTo(size * 0.22, hullY + size * 0.12);
  ctx.closePath();
  ctx.fill();

  // Ship body
  ctx.fillStyle = '#78909c';
  ctx.fillRect(size * 0.25, hullY - size * 0.18, size * 0.5, size * 0.18);

  // Superstructure
  ctx.fillStyle = '#90a4ae';
  ctx.fillRect(size * 0.35, hullY - size * 0.32, size * 0.3, size * 0.14);

  // Cannon
  ctx.fillStyle = '#455a64';
  ctx.fillRect(size * 0.46, hullY - size * 0.46, size * 0.08, size * 0.16);

  // Target crosshair
  ctx.strokeStyle = '#e53935';
  ctx.lineWidth = size * 0.03;
  ctx.beginPath();
  ctx.arc(size * 0.72, size * 0.28, size * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.72, size * 0.12); ctx.lineTo(size * 0.72, size * 0.44);
  ctx.moveTo(size * 0.56, size * 0.28); ctx.lineTo(size * 0.88, size * 0.28);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), drawIcon(512));
console.log('Icons generated!');
