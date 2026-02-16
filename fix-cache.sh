#!/bin/bash

echo "🔧 Fixing 'Modal is not defined' error..."
echo ""

# Kill any running dev server
echo "1️⃣ Stopping dev server..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "   No server running on port 5173"

# Clear Vite cache
echo ""
echo "2️⃣ Clearing Vite cache..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .turbo
echo "   ✅ Cache cleared!"

# Clear temp files
echo ""
echo "3️⃣ Clearing temp files..."
find . -name "*.log" -type f -delete 2>/dev/null
echo "   ✅ Temp files cleared!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Cache cleared successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo ""
echo "   1. Run: npm run dev"
echo "   2. Wait for server to start"
echo "   3. In browser: Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo ""
echo "💡 If still getting error:"
echo "   - Try incognito/private mode"
echo "   - Or clear browser data for localhost:5173"
echo ""
