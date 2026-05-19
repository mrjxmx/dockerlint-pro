#!/usr/bin/env bash
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}⚡ QUICKDRAW Achievement Unlocker${NC}"
echo "Opens and closes a GitHub issue in under 5 minutes"
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
TS=$(date +%s)

echo -e "${GREEN}📌 Repo: $REPO${NC}"
echo -e "${YELLOW}Opening issue...${NC}"

ISSUE_URL=$(gh issue create \
  --title "⚡ Quickdraw: Automated Issue $TS" \
  --body "This issue was opened and closed automatically by the Quickdraw achievement script." \
  --label "automation" 2>/dev/null || \
  gh issue create \
  --title "⚡ Quickdraw: Automated Issue $TS" \
  --body "This issue was opened and closed automatically by the Quickdraw achievement script.")

ISSUE_NUM=$(echo "$ISSUE_URL" | grep -o '[0-9]*$')
echo -e "${GREEN}✅ Issue #$ISSUE_NUM opened${NC}"
sleep 2
gh issue close "$ISSUE_NUM" --comment "Closed by Quickdraw achievement script ⚡"
echo ""
echo -e "${GREEN}🏆 QUICKDRAW complete!${NC}"
echo -e "${CYAN}Check your profile: https://github.com/$USERNAME${NC}"
