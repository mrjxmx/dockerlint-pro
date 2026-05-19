#!/usr/bin/env bash
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

COAUTHOR_NAME="${1:-}"
COAUTHOR_EMAIL="${2:-}"

echo -e "${CYAN}🤝 PAIR EXTRAORDINAIRE Achievement Unlocker${NC}"
echo ""

if [ -z "$COAUTHOR_NAME" ] || [ -z "$COAUTHOR_EMAIL" ]; then
  echo -e "${RED}❌ Usage: bash scripts/pair-extraordinaire.sh \"Partner Name\" \"partner@email.com\"${NC}"
  echo "The email must be linked to your partner's GitHub account."; exit 1
fi

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
BRANCH="pair/co-authored-$TS"

git config user.email "${USERNAME}@users.noreply.github.com" 2>/dev/null || true
git config user.name "$USERNAME" 2>/dev/null || true

git checkout main 2>/dev/null || git checkout master
git pull origin HEAD
git checkout -b "$BRANCH"

echo "# Pair session $TS — $(date)" >> "pair-$TS.md"
echo "Co-authored with: $COAUTHOR_NAME" >> "pair-$TS.md"
git add "pair-$TS.md"
git commit -m "feat: pair programming session $TS [skip ci]

Co-authored-by: $COAUTHOR_NAME <$COAUTHOR_EMAIL>"
git push origin "$BRANCH"

PR_URL=$(gh pr create \
  --title "🤝 Pair Extraordinaire: Co-authored $TS" \
  --body "Co-authored PR for Pair Extraordinaire achievement.

Co-authored-by: $COAUTHOR_NAME <$COAUTHOR_EMAIL>" \
  --base main --head "$BRANCH")
PR_NUM=$(echo "$PR_URL" | grep -o '[0-9]*$')
sleep 3
gh pr merge "$PR_NUM" --merge --admin --delete-branch 2>/dev/null || \
  gh pr merge "$PR_NUM" --merge --delete-branch
git checkout main 2>/dev/null || git checkout master
git pull origin HEAD
echo ""
echo -e "${GREEN}🏆 PAIR EXTRAORDINAIRE complete!${NC}"
echo -e "${CYAN}Check your profile: https://github.com/$USERNAME${NC}"
