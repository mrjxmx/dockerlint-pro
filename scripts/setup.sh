#!/usr/bin/env bash
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${GREEN}🔧 Running setup...${NC}"

if ! command -v node &>/dev/null; then
  echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org${NC}"; exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

if ! command -v gh &>/dev/null; then
  echo -e "${RED}❌ GitHub CLI not found. Install from https://cli.github.com${NC}"; exit 1
fi
echo -e "${GREEN}✅ GitHub CLI $(gh --version | head -1)${NC}"

chmod +x scripts/*.sh
echo -e "${GREEN}✅ Scripts made executable${NC}"

if ! gh auth status &>/dev/null; then
  echo -e "${YELLOW}⚠️  Not authenticated. Run:${NC}"
  echo "  unset GITHUB_TOKEN"
  echo "  gh auth login"
  echo "  gh auth setup-git"
else
  echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
fi

echo -e "${GREEN}🎉 Setup complete! Run: bash scripts/unlock-all.sh${NC}"
