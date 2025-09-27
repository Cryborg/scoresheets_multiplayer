// Script simple pour générer des icônes PWA de base
// Utilise Canvas pour créer des icônes avec le logo Oh Sheet!

const fs = require('fs');
const path = require('path');

// Crée un fichier SVG simple pour les icônes
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>

  <!-- Sheet icon -->
  <rect x="${size * 0.2}" y="${size * 0.15}" width="${size * 0.6}" height="${size * 0.7}" rx="${size * 0.05}" fill="white" opacity="0.9"/>

  <!-- Lines on sheet -->
  <line x1="${size * 0.3}" y1="${size * 0.35}" x2="${size * 0.7}" y2="${size * 0.35}" stroke="#3b82f6" stroke-width="${size * 0.02}"/>
  <line x1="${size * 0.3}" y1="${size * 0.5}" x2="${size * 0.7}" y2="${size * 0.5}" stroke="#3b82f6" stroke-width="${size * 0.02}"/>
  <line x1="${size * 0.3}" y1="${size * 0.65}" x2="${size * 0.7}" y2="${size * 0.65}" stroke="#3b82f6" stroke-width="${size * 0.02}"/>

  <!-- Exclamation mark (Oh!) -->
  <circle cx="${size * 0.85}" cy="${size * 0.25}" r="${size * 0.1}" fill="#fbbf24"/>
  <rect x="${size * 0.82}" y="${size * 0.15}" width="${size * 0.06}" height="${size * 0.12}" rx="${size * 0.03}" fill="white"/>
  <circle cx="${size * 0.85}" cy="${size * 0.32}" r="${size * 0.02}" fill="white"/>
</svg>`;

// Tailles d'icônes PWA requises
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Crée le dossier icons s'il n'existe pas
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Génère les fichiers SVG pour chaque taille
sizes.forEach(size => {
  const svg = createIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);

  fs.writeFileSync(filepath, svg.trim());
  console.log(`✅ Created ${filename}`);
});

// Crée aussi les PNGs en copiant le SVG (pour la compatibilité)
// Note: Dans un vrai projet, tu convertirais SVG → PNG avec sharp ou canvas
sizes.forEach(size => {
  const svg = createIconSVG(size);
  const filename = `icon-${size}x${size}.png.svg`; // Extension temporaire
  const filepath = path.join(iconsDir, filename);

  fs.writeFileSync(filepath, svg.trim());
  console.log(`📝 Created ${filename} (rename to .png for production)`);
});

console.log('\n🎨 PWA icons generated!');
console.log('📋 Todo for production:');
console.log('  1. Convert SVG files to PNG using imagemagick or online tool');
console.log('  2. Optimize PNGs with tools like tinypng.com');
console.log('  3. Update manifest.json if needed');
console.log('\n🚀 For now, the SVG files will work for development!');