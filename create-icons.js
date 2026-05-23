// Simple icon creator using pure Node.js (no extra dependencies)
// Creates PNG icons from raw pixel data using a minimal PNG encoder

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function encodePNG(width, height, pixels) {
  // pixels: Uint8Array of RGBA values, row by row
  function crc32(buf) {
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, t, data, c]);
  }

  // Build raw image data (filter byte 0 per row)
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = y * (1 + width * 4) + 1 + x * 4;
      raw[ri] = pixels[pi];
      raw[ri+1] = pixels[pi+1];
      raw[ri+2] = pixels[pi+2];
      raw[ri+3] = pixels[pi+3];
    }
  }

  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRGBA(hex, a = 255) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r, g, b, a];
}

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (Math.round(y) * size + Math.round(x)) * 4;
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
  }

  function fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let py = Math.max(0, Math.round(y)); py < Math.min(size, Math.round(y+h)); py++)
      for (let px = Math.max(0, Math.round(x)); px < Math.min(size, Math.round(x+w)); px++)
        setPixel(px, py, r, g, b, a);
  }

  function fillCircle(cx, cy, radius, r, g, b, a = 255) {
    for (let py = Math.round(cy - radius); py <= Math.round(cy + radius); py++)
      for (let px = Math.round(cx - radius); px <= Math.round(cx + radius); px++)
        if ((px-cx)**2 + (py-cy)**2 <= radius**2)
          setPixel(px, py, r, g, b, a);
  }

  function strokeCircle(cx, cy, radius, lineWidth, r, g, b, a = 255) {
    for (let angle = 0; angle < 360; angle += 0.5) {
      const rad = angle * Math.PI / 180;
      for (let d = radius - lineWidth/2; d <= radius + lineWidth/2; d += 0.5)
        setPixel(cx + Math.cos(rad)*d, cy + Math.sin(rad)*d, r, g, b, a);
    }
  }

  function line(x1, y1, x2, y2, lw, r, g, b, a = 255) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    for (let i = 0; i <= len; i += 0.5) {
      const t = len > 0 ? i/len : 0;
      const px = x1 + dx*t, py = y1 + dy*t;
      for (let ox = -lw/2; ox <= lw/2; ox += 0.5)
        for (let oy = -lw/2; oy <= lw/2; oy += 0.5)
          setPixel(px+ox, py+oy, r, g, b, a);
    }
  }

  const S = size / 192;

  // Background: dark navy
  fillRect(0, 0, size, size, 10, 22, 40);

  // Ocean
  fillRect(0, size*0.65, size, size*0.35, 15, 45, 90);

  // Wave effect
  fillRect(size*0.05, size*0.65, size*0.9, size*0.04, 25, 65, 120);

  // Hull (trapezoid approximation)
  const hy = size * 0.58;
  for (let y = 0; y < size*0.1; y++) {
    const progress = y / (size*0.1);
    const left = size*0.15 + progress * size*0.07;
    const right = size*0.85 - progress * size*0.07;
    fillRect(left, hy + y, right-left, 1, 84, 110, 122);
  }

  // Ship body
  fillRect(size*0.25, hy - size*0.18, size*0.5, size*0.18, 96, 125, 139);

  // Superstructure
  fillRect(size*0.33, hy - size*0.34, size*0.34, size*0.16, 120, 144, 156);

  // Funnel/chimney
  fillRect(size*0.43, hy - size*0.46, size*0.07, size*0.14, 69, 90, 100);

  // Target circle
  strokeCircle(size*0.72, size*0.28, size*0.12, size*0.025, 229, 57, 53);
  // Crosshair
  line(size*0.72, size*0.12, size*0.72, size*0.44, size*0.025, 229, 57, 53);
  line(size*0.56, size*0.28, size*0.88, size*0.28, size*0.025, 229, 57, 53);

  return encodePNG(size, size, pixels);
}

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), drawIcon(512));
console.log('Icons created in public/icons/');
