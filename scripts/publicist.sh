#!/usr/bin/env bash
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}📢 PUBLICIST Achievement Unlocker${NC}"
echo "Creates a v1.0.0 GitHub Release"
echo ""

if ! gh auth status &>/dev/null; then
  echo -e "${RED}❌ Not authenticated. Run:${NC}"
  echo "  unset GITHUB_TOKEN && gh auth login && gh auth setup-git"; exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
  echo -e "${RED}❌ Not inside a GitHub repo.${NC}"; exit 1
fi
USERNAME=$(gh api user -q .login)
TAG="v1.0.0"

if gh release view "$TAG" &>/dev/null; then
  TAG="v1.0.$(date +%s)"
  echo -e "${YELLOW}⚠️  v1.0.0 exists — using $TAG${NC}"
fi

echo -e "${GREEN}📌 Repo: $REPO${NC}"
gh release create "$TAG" \
  --title "🚀 Release $TAG" \
  --notes "## What's New

### ✨ Features
- Initial public release
- Full feature set available

### 📦 Installation
\`\`\`bash
npm install
npm start
\`\`\`

*Released with the Publicist achievement script 📢*" \
  --latest

echo ""
echo -e "${GREEN}🏆 PUBLICIST complete! Release $TAG created.${NC}"
echo -e "${CYAN}Check your profile: https://github.com/$USERNAME${NC}"
