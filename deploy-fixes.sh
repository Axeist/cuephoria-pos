#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deploying Tournament System Fixes${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo -e "${YELLOW}Step 1: Cleaning old dependencies...${NC}"
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo -e "${GREEN}✓ Removed node_modules${NC}"
fi

if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    echo -e "${GREEN}✓ Removed package-lock.json${NC}"
fi
echo ""

echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ npm install failed!${NC}"
    echo "Please delete node_modules manually using Finder and try again."
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 3: Building project...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

echo -e "${YELLOW}Step 4: Committing changes...${NC}"
git add .
git commit -m "Fix entry fee display and venue payment dialog z-index

- Fixed hardcoded ₹250 in Pay at Venue button to use tournament.entry_fee
- Fixed venue payment warning dialog z-index to appear on top
- Added Medal import to TournamentDialog
- Improved dialog stacking with proper z-index values"

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ Nothing to commit or commit failed${NC}"
    echo "Checking git status..."
    git status
else
    echo -e "${GREEN}✓ Changes committed${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Pushing to remote...${NC}"
git push
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Git push failed!${NC}"
    echo "Please push manually: git push"
    exit 1
fi
echo -e "${GREEN}✓ Pushed to remote${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Wait 2-3 minutes for Vercel to deploy"
echo "2. Visit: https://admin.cuephoria.in"
echo "3. Hard refresh: Cmd+Shift+R"
echo "4. Test the fixes:"
echo "   - No Medal error"
echo "   - Entry fee shows correct amount"
echo "   - Venue payment dialog appears on top"
echo ""
echo -e "${GREEN}Happy testing! 🎉${NC}"
