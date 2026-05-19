#!/usr/bin/env bash
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

clear
echo -e "${CYAN}${BOLD}"
echo "  ██████  ██████  ██  ████████ ██   ██ ██    ██ ██████  "
echo " ██       ██   ██ ██     ██    ██   ██ ██    ██ ██   ██ "
echo " ██   ███ ██████  ██     ██    ███████ ██    ██ ██████  "
echo " ██    ██ ██   ██ ██     ██    ██   ██ ██    ██ ██   ██ "
echo "  ██████  ██   ██ ██     ██    ██   ██  ██████  ██████  "
echo -e "${NC}"
echo -e "${BOLD}🏆 GitHub Achievement Unlocker — Interactive Menu${NC}"
echo ""

if ! gh auth status &>/dev/null; then
  echo -e "${RED}❌ Not authenticated!${NC}"
  echo "  unset GITHUB_TOKEN && gh auth login && gh auth setup-git"; exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown")
USERNAME=$(gh api user -q .login 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ Authenticated as: $USERNAME${NC}"
echo -e "${GREEN}📌 Repo: $REPO${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1) ⚡  Quickdraw"
echo "  2) 🤠  YOLO"
echo "  3) 📢  Publicist"
echo "  4) 🦈  Pull Shark Bronze  (2 PRs)"
echo "  5) 🦈  Pull Shark Silver (16 PRs)"
echo "  6) 🦈  Pull Shark Gold  (128 PRs)"
echo "  7) 🤝  Pair Extraordinaire"
echo "  8) 🚀  Full Blast (options 1–4 auto)"
echo "  9) 📊  View Achievement Progress"
echo "  0) ❌  Exit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Choose an option: " CHOICE

case $CHOICE in
  1) bash scripts/quickdraw.sh ;;
  2) bash scripts/yolo.sh ;;
  3) bash scripts/publicist.sh ;;
  4) bash scripts/pull-shark.sh 2 ;;
  5) bash scripts/pull-shark.sh 16 ;;
  6) bash scripts/pull-shark.sh 128 ;;
  7)
    read -p "Co-author name: " PAIR_NAME
    read -p "Co-author email: " PAIR_EMAIL
    bash scripts/pair-extraordinaire.sh "$PAIR_NAME" "$PAIR_EMAIL"
    ;;
  8)
    echo -e "${CYAN}🚀 Full Blast starting...${NC}"
    bash scripts/quickdraw.sh
    bash scripts/yolo.sh
    bash scripts/publicist.sh
    bash scripts/pull-shark.sh 2
    echo -e "${GREEN}🏆 Full Blast complete! Check https://github.com/$USERNAME in 24 hours.${NC}"
    ;;
  9) node src/achievement-tracker.js ;;
  0) echo "Bye! 👋"; exit 0 ;;
  *) echo -e "${RED}Invalid option${NC}" ;;
esac
