#!/usr/bin/env node

// Icon Generator Script using resvg-js
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// SVG icon template - Samurai helmet with question mark
const generateSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFE66D;stop-opacity:1" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="115" fill="url(#gradient)"/>

  <!-- Samurai Helmet (Kabuto) -->
  <!-- Top ornament (maedate) -->
  <path d="M256 80 C 256 80, 220 100, 220 140 L 220 160 L 292 160 L 292 140 C 292 100, 256 80, 256 80 Z" fill="#2C3E50" stroke="#1A252F" stroke-width="4"/>

  <!-- Main helmet body -->
  <ellipse cx="256" cy="200" rx="130" ry="40" fill="#34495E" stroke="#1A252F" stroke-width="4"/>
  <path d="M 126 200 Q 126 280, 256 320 Q 386 280, 386 200" fill="#2C3E50" stroke="#1A252F" stroke-width="4"/>

  <!-- Helmet plates -->
  <path d="M 256 200 L 240 300" stroke="#1A252F" stroke-width="2" opacity="0.3"/>
  <path d="M 256 200 L 272 300" stroke="#1A252F" stroke-width="2" opacity="0.3"/>
  <path d="M 200 210 L 200 290" stroke="#1A252F" stroke-width="2" opacity="0.3"/>
  <path d="M 312 210 L 312 290" stroke="#1A252F" stroke-width="2" opacity="0.3"/>

  <!-- Side guards (fukikaeshi) -->
  <path d="M 120 220 L 100 260 L 110 300 L 140 280 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="3"/>
  <path d="M 392 220 L 412 260 L 402 300 L 372 280 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="3"/>

  <!-- Face guard ornament -->
  <circle cx="170" cy="250" r="8" fill="#F39C12"/>
  <circle cx="342" cy="250" r="8" fill="#F39C12"/>

  <!-- Question mark -->
  <g transform="translate(256, 380)">
    <circle cx="0" cy="0" r="80" fill="white" opacity="0.95"/>
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="100" font-weight="bold" fill="#2C3E50" text-anchor="middle" dominant-baseline="central">?</text>
  </g>

  <!-- Decorative elements -->
  <circle cx="180" cy="170" r="4" fill="#F39C12" opacity="0.8"/>
  <circle cx="332" cy="170" r="4" fill="#F39C12" opacity="0.8"/>
  <circle cx="256" cy="160" r="6" fill="#F39C12" opacity="0.8"/>
</svg>
`;

const sizes = [
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' }
];

async function generateIcons() {
  const publicDir = path.join(__dirname, '../public');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('🎨 Generating app icons...\n');

  for (const config of sizes) {
    try {
      const svg = generateSVG(config.size);

      const resvg = new Resvg(svg, {
        fitTo: {
          mode: 'width',
          value: config.size,
        },
      });

      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      const filePath = path.join(publicDir, config.name);
      fs.writeFileSync(filePath, pngBuffer);

      console.log(`✅ Generated ${config.name} (${config.size}x${config.size})`);
    } catch (err) {
      console.error(`❌ Error generating ${config.name}:`, err.message);
    }
  }

  console.log('\n🎉 All icons generated successfully!');
  console.log(`📁 Icons saved to: ${publicDir}`);
}

// Run the generator
generateIcons().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
