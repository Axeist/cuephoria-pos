#!/usr/bin/env node

/**
 * Splash Screen Generator for Cuephoria Gaming
 * Generates all required splash screen sizes for Android
 * 
 * Usage:
 *   1. Save your logo as 'splash-screen-base.png' (at least 3000x3000px)
 *   2. Run: node generate-splash.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_IMAGE = 'splash-screen-base.png';
const OUTPUT_DIR = 'android/app/src/main/res';
const BACKGROUND_COLOR = '#1a1a2e'; // Dark blue-purple gaming theme

// Splash screen configurations
const SPLASH_CONFIGS = [
  // Portrait
  { width: 480, height: 800, dir: 'drawable-port-mdpi' },
  { width: 800, height: 1280, dir: 'drawable-port-hdpi' },
  { width: 1280, height: 1920, dir: 'drawable-port-xhdpi' },
  { width: 1600, height: 2560, dir: 'drawable-port-xxhdpi' },
  { width: 1920, height: 3200, dir: 'drawable-port-xxxhdpi' },
  
  // Landscape
  { width: 800, height: 480, dir: 'drawable-land-mdpi' },
  { width: 1280, height: 800, dir: 'drawable-land-hdpi' },
  { width: 1920, height: 1280, dir: 'drawable-land-xhdpi' },
  { width: 2560, height: 1600, dir: 'drawable-land-xxhdpi' },
  { width: 3200, height: 1920, dir: 'drawable-land-xxxhdpi' },
  
  // Fallback
  { width: 2732, height: 2732, dir: 'drawable' },
];

console.log('🎮 Cuephoria Gaming - Splash Screen Generator');
console.log('==============================================\n');

// Check if source image exists
if (!fs.existsSync(SOURCE_IMAGE)) {
  console.error('❌ Source image not found:', SOURCE_IMAGE);
  console.error('\nPlease save your Cuephoria Gaming logo as:', SOURCE_IMAGE);
  console.error('The logo should be a high-resolution PNG (at least 3000x3000px)\n');
  process.exit(1);
}

// Check if sharp is available
let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
} catch (e) {
  console.log('📦 Installing sharp package for image processing...\n');
  const childProcess = await import('child_process');
  try {
    childProcess.execSync('npm install sharp', { stdio: 'inherit' });
    const sharpModule = await import('sharp');
    sharp = sharpModule.default;
    console.log('\n✅ Sharp installed successfully!\n');
  } catch (installError) {
    console.error('❌ Failed to install sharp. Please install it manually:');
    console.error('   npm install sharp\n');
    process.exit(1);
  }
}

// Generate splash screens
async function generateSplashScreens() {
  console.log('Source image:', SOURCE_IMAGE);
  console.log('Background color:', BACKGROUND_COLOR, '\n');
  
  let completed = 0;
  let failed = 0;
  
  for (const config of SPLASH_CONFIGS) {
    try {
      const outputPath = path.join(OUTPUT_DIR, config.dir, 'splash.png');
      const outputDir = path.dirname(outputPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Generate splash screen
      await sharp(SOURCE_IMAGE)
        .resize(config.width, config.height, {
          fit: 'contain',
          background: BACKGROUND_COLOR,
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated: ${config.dir}/splash.png (${config.width}×${config.height})`);
      completed++;
      
    } catch (error) {
      console.error(`✗ Failed: ${config.dir}/splash.png - ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n==============================================');
  if (failed === 0) {
    console.log('✅ All splash screens generated successfully!');
    console.log(`   Total: ${completed} images created\n`);
    
    console.log('📋 Next steps:');
    console.log('   1. Review the generated images in android/app/src/main/res/');
    console.log('   2. Run: npm run android:sync');
    console.log('   3. Open in Android Studio: npm run cap:open:android');
    console.log('   4. Test on a device or emulator\n');
    
    console.log('🎨 To customize the background color, edit BACKGROUND_COLOR in this script\n');
  } else {
    console.log(`⚠️  Completed with errors: ${completed} succeeded, ${failed} failed\n`);
  }
}

// Run the generator
generateSplashScreens().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
