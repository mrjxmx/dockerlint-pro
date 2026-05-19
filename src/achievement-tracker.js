#!/usr/bin/env node
/**
 * achievement-tracker.js — Track GitHub achievement badge progress
 * Usage: node src/achievement-tracker.js [roadmap]
 */
const { execSync } = require('child_process');

const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const NC     = '\x1b[0m';

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10000 }).trim(); }
  catch { return ''; }
}

function getUsername() { return run('gh api user -q .login 2>/dev/null') || 'YOUR_USERNAME'; }

function getMergedPRs() {
  const raw = run(`gh pr list --author @me --state merged --limit 200 --json number 2>/dev/null`);
  try { return JSON.parse(raw).length; } catch { return 0; }
}

function bar(current, max, width = 20) {
  const filled = Math.min(Math.floor((current / max) * width), width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function tierLabel(count, tiers) {
  let label = 'Locked 🔒';
  for (const t of tiers) { if (count >= t.req) label = t.label; }
  return label;
}

function nextTier(count, tiers) {
  for (const t of tiers) { if (count < t.req) return t; }
  return null;
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('roadmap')) {
    console.log(`\n${BOLD}${CYAN}📅 Achievement Roadmap — Day 1 to Month 1${NC}\n`);
    const steps = [
      { day: 'Day 1', tasks: ['⚡ quickdraw.sh → Quickdraw badge','🤠 yolo.sh → YOLO badge','📢 publicist.sh → Publicist badge','🦈 pull-shark.sh 2 → Pull Shark Bronze'] },
      { day: 'Day 2–3', tasks: ['🤝 pair-extraordinaire.sh with a colleague','❤️  React ❤️ on any issue/PR → Heart On Your Sleeve','🌌 Answer a Discussion in a popular repo'] },
      { day: 'Week 1', tasks: ['🦈 pull-shark.sh 16 → Pull Shark Silver','🌟 Share repos on social media → aim for 16 stars','🔁 Repeat on each of your 5 repos to stack PR counts'] },
      { day: 'Week 2–3', tasks: ['🦈 pull-shark.sh 128 → Pull Shark Gold','🌌 Get a Discussion answer accepted → Galaxy Brain','💬 Keep commenting on issues and PRs'] },
      { day: 'Month 1', tasks: ['✅ All 8 badges unlocked!','🌟 Keep sharing for higher Starstruck tiers','📊 Run achievement-tracker.js to verify'] },
    ];
    steps.forEach(s => {
      console.log(`${BOLD}${YELLOW}${s.day}${NC}`);
      s.tasks.forEach(t => console.log(`  ${t}`));
      console.log('');
    });
    return;
  }

  const username = getUsername();
  const mergedPRs = getMergedPRs();

  console.log(`\n${BOLD}${CYAN}🏆 GitHub Achievement Tracker${NC}`);
  console.log(`${DIM}Profile: https://github.com/${username}${NC}`);
  console.log('═'.repeat(50));
  console.log(`\n${BOLD}Badge Status:${NC}\n`);

  const badges = [
    { name: '⚡ Quickdraw',          desc: 'Close an issue within 5 min of opening', script: 'bash scripts/quickdraw.sh',           tip: 'One-time badge', tiers: [{req:1,label:'✅ Unlocked!'}] },
    { name: '🤠 YOLO',               desc: 'Merge a PR without review',               script: 'bash scripts/yolo.sh',               tip: 'One-time badge', tiers: [{req:1,label:'✅ Unlocked!'}] },
    { name: '📢 Publicist',          desc: 'Create a GitHub Release',                  script: 'bash scripts/publicist.sh',          tip: 'One-time badge', tiers: [{req:1,label:'✅ Unlocked!'}] },
    { name: '🦈 Pull Shark',         desc: 'Merge pull requests',                      script: 'bash scripts/pull-shark.sh <count>', tip: `~${mergedPRs} merged PRs detected`,
      tiers: [{req:2,label:'🥉 Bronze'},{req:16,label:'🥈 Silver'},{req:128,label:'🥇 Gold'},{req:1024,label:'💎 Diamond'}], current: mergedPRs },
    { name: '🤝 Pair Extraordinaire',desc: 'Merge a co-authored PR',                   script: 'bash scripts/pair-extraordinaire.sh "Name" "email"', tip: "Need partner's GitHub email", tiers: [{req:1,label:'✅ Unlocked!'}] },
    { name: '❤️  Heart On Your Sleeve',desc:'React ❤️ on GitHub',                    script: 'Manual: add ❤️ reaction on any issue/PR', tip: 'Takes 10 seconds', tiers: [{req:1,label:'✅ Unlocked!'}] },
    { name: '🌌 Galaxy Brain',       desc: 'Get a Discussion answer accepted',          script: 'Manual: answer Discussions on popular repos', tip: 'github.com/discussions', tiers: [{req:1,label:'✅ Unlocked!'}] },
    { name: '🌟 Starstruck',         desc: 'Get stars on your repos',                  script: 'Share on Reddit/Twitter/HN/dev.to',  tip: '16 stars = Bronze',
      tiers: [{req:16,label:'🥉 Bronze'},{req:128,label:'🥈 Silver'},{req:512,label:'🥇 Gold'},{req:4096,label:'💎 Diamond'}] },
  ];

  badges.forEach(b => {
    console.log(`${BOLD}${b.name}${NC}`);
    console.log(`  ${DIM}${b.desc}${NC}`);
    if (b.current !== undefined) {
      const cur = tierLabel(b.current, b.tiers);
      const nxt = nextTier(b.current, b.tiers);
      console.log(`  Current: ${b.current} → ${cur}`);
      if (nxt) {
        const pct = Math.min(Math.floor((b.current / nxt.req) * 100), 100);
        console.log(`  Next: ${nxt.label} — [${bar(b.current, nxt.req)}] ${pct}%`);
      }
    }
    console.log(`  ${GREEN}Script: ${b.script}${NC}`);
    console.log(`  ${YELLOW}Tip: ${b.tip}${NC}\n`);
  });

  console.log('─'.repeat(50));
  console.log(`${DIM}Run with 'roadmap' arg for Day 1 → Month 1 plan${NC}`);
  console.log(`${DIM}Run 'bash scripts/unlock-all.sh' to start${NC}\n`);
}

main();
