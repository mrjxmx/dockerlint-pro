#!/usr/bin/env bash
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

COUNT=${1:-2}
echo -e "${CYAN}🦈 PULL SHARK Achievement Unlocker${NC}"
echo "Will merge $COUNT pull request(s)  [ 2=Bronze | 16=Silver | 128=Gold ]"
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
git config user.email "${USERNAME}@users.noreply.github.com" 2>/dev/null || true
git config user.name "$USERNAME" 2>/dev/null || true

git checkout main 2>/dev/null || git checkout master
git pull origin HEAD

for i in $(seq 1 $COUNT); do
  TS=$(date +%s%N | cut -c1-16)
  BRANCH="pull-shark/pr-$i-$TS"
  echo -e "${YELLOW}[$i/$COUNT] $BRANCH${NC}"
  git checkout -b "$BRANCH"
  echo "// Pull Shark PR #$i — $(date)" >> "pull-shark-$i.js"
  git add "pull-shark-$i.js"
  git commit -m "chore: pull shark PR $i of $COUNT [skip ci]"
  git push origin "$BRANCH"
  PR_URL=$(gh pr create \
    --title "🦈 Pull Shark: PR $i of $COUNT" \
    --body "Automated PR $i of $COUNT for Pull Shark achievement." \
    --base main --head "$BRANCH" 2>/dev/null || \
    gh pr create \
    --title "🦈 Pull Shark: PR $i of $COUNT" \
    --body "Automated PR $i of $COUNT for Pull Shark achievement." \
    --base main --head "$BRANCH")
  PR_NUM=$(echo "$PR_URL" | grep -o '[0-9]*$')
  sleep 2
  gh pr merge "$PR_NUM" --merge --admin --delete-branch 2>/dev/null || \
    gh pr merge "$PR_NUM" --merge --delete-branch
  git checkout main 2>/dev/null || git checkout master
  git pull origin HEAD
  echo -e "${GREEN}  ✅ PR #$PR_NUM merged${NC}"
  [ $COUNT -gt 10 ] && sleep 1
done

echo ""
echo -e "${GREEN}🏆 PULL SHARK complete! Merged $COUNT PRs.${NC}"
[ "$COUNT" -ge 128 ] && echo -e "${GREEN}  🥇 Gold tier!${NC}"
[ "$COUNT" -ge 16 ] && [ "$COUNT" -lt 128 ] && echo -e "${GREEN}  🥈 Silver tier!${NC}"
[ "$COUNT" -lt 16 ] && echo -e "${GREEN}  🥉 Bronze tier!${NC}"
echo -e "${CYAN}Check your profile: https://github.com/$USERNAME${NC}"
