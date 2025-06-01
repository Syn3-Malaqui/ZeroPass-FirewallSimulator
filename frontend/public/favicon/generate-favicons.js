#!/usr/bin/env node

/**
 * Favicon Generator Script for ZeroPass
 * 
 * This script generates all required favicon sizes from the source SVG.
 * Requires: sharp package (npm install sharp)
 * 
 * Usage: node generate-favicons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Sharp package not found. Please install it first:');
  console.error('   npm install sharp');
  process.exit(1);
}

// Favicon configurations
const faviconSizes = [
  // Standard favicons
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  
  // Apple touch icons
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-precomposed.png', size: 180 },
  
  // Android/Chrome icons
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  
  // Microsoft tiles
  { name: 'mstile-150x150.png', size: 150 },
];

// Paths
const svgPath = path.join(__dirname, 'favicon.svg');
const outputDir = __dirname;

async function generateFavicons() {
  console.log('🚀 Starting favicon generation...');
  
  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('❌ favicon.svg not found in:', svgPath);
    process.exit(1);
  }
  
  console.log('📁 Source SVG:', svgPath);
  console.log('📁 Output directory:', outputDir);
  console.log('');
  
  // Generate each size
  for (const config of faviconSizes) {
    try {
      const outputPath = path.join(outputDir, config.name);
      
      await sharp(svgPath)
        .resize(config.size, config.size)
        .png({
          quality: 100,
          compressionLevel: 9,
          adaptiveFiltering: true
        })
        .toFile(outputPath);
      
      console.log(`✅ Generated: ${config.name} (${config.size}x${config.size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${config.name}:`, error.message);
    }
  }
  
  // Generate ICO file (requires multiple sizes)
  try {
    console.log('');
    console.log('🔄 Generating favicon.ico...');
    
    // Create multiple PNG buffers for ICO
    const icoSizes = [16, 32, 48];
    const buffers = [];
    
    for (const size of icoSizes) {
      const buffer = await sharp(svgPath)
        .resize(size, size)
        .png()
        .toBuffer();
      buffers.push(buffer);
    }
    
    // Note: This creates a simple ICO by copying the 32x32 PNG
    // For proper ICO generation, you might want to use a dedicated library
    const ico32Path = path.join(outputDir, 'favicon-32x32.png');
    const icoPath = path.join(outputDir, 'favicon.ico');
    
    if (fs.existsSync(ico32Path)) {
      fs.copyFileSync(ico32Path, icoPath);
      console.log('✅ Generated: favicon.ico (basic version)');
      console.log('💡 For better ICO support, consider using a dedicated ICO generator');
    }
  } catch (error) {
    console.error('❌ Failed to generate favicon.ico:', error.message);
  }
  
  console.log('');
  console.log('🎉 Favicon generation complete!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Add favicon links to your layout.tsx');
  console.log('2. Test favicons in different browsers');
  console.log('3. Verify PWA manifest is working');
  console.log('');
  console.log('📖 See README.md for implementation instructions');
}

// Run the generator
generateFavicons().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 