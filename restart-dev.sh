#!/bin/bash

echo "🧹 Cleaning build cache..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .turbo

echo "✅ Cache cleared!"
echo ""
echo "🚀 Starting dev server..."
echo "   Please run: npm run dev"
echo ""
echo "📝 After server starts:"
echo "   1. Open browser"
echo "   2. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) for hard refresh"
echo "   3. Or press Cmd+Option+I (Mac) / F12 (Windows) → Right-click refresh → Empty Cache and Hard Reload"
