#!/usr/bin/env node
/**
 * dockerlint-pro — Dockerfile linter and best-practice checker
 * Usage: node src/dockerlint.js <command> [file] [options]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Rule definitions ──────────────────────────────────────────────────────────
const RULES = [
  {
    id: 'DL001', severity: 'ERROR', title: 'Missing FROM instruction',
    check: (layers) => layers.length > 0 && layers[0].cmd !== 'FROM',
    message: 'Dockerfile must start with a FROM instruction.',
    fix: 'Add FROM <image>:<tag> as the first instruction.',
  },
  {
    id: 'DL002', severity: 'WARNING', title: 'Use specific image tags',
    lineCheck: ({ cmd, args }) => cmd === 'FROM' && !args.includes('@') && (args.endsWith(':latest') || !args.includes(':')),
    message: (l) => `FROM uses '${l.args.trim()}' — pin to a specific tag or digest.`,
    fix: 'Replace ":latest" or untagged images with explicit versions, e.g. FROM node:20.11-alpine3.19',
  },
  {
    id: 'DL003', severity: 'ERROR', title: 'Multiple CMD instructions',
    check: (layers) => layers.filter(l => l.cmd === 'CMD').length > 1,
    message: 'Only the last CMD instruction takes effect. Remove duplicates.',
    fix: 'Keep exactly one CMD instruction.',
  },
  {
    id: 'DL004', severity: 'ERROR', title: 'Multiple ENTRYPOINT instructions',
    check: (layers) => layers.filter(l => l.cmd === 'ENTRYPOINT').length > 1,
    message: 'Only the last ENTRYPOINT takes effect. Remove duplicates.',
    fix: 'Keep exactly one ENTRYPOINT.',
  },
  {
    id: 'DL005', severity: 'WARNING', title: 'apt-get without cache cleanup',
    lineCheck: ({ cmd, args }) => cmd === 'RUN' && args.includes('apt-get install') && !args.includes('rm -rf /var/lib/apt/lists'),
    message: () => 'apt-get install without cleaning up apt cache increases image size.',
    fix: 'Add && rm -rf /var/lib/apt/lists/* after apt-get install.',
  },
  {
    id: 'DL006', severity: 'WARNING', title: 'apt-get update without install',
    lineCheck: ({ cmd, args }) => cmd === 'RUN' && args.includes('apt-get update') && !args.includes('apt-get install'),
    message: () => 'apt-get update in a separate RUN layer can use stale cache. Combine with apt-get install.',
    fix: 'Combine: RUN apt-get update && apt-get install -y <packages> && rm -rf /var/lib/apt/lists/*',
  },
  {
    id: 'DL007', severity: 'INFO', title: 'Use COPY instead of ADD',
    lineCheck: ({ cmd, args }) => cmd === 'ADD' && !args.startsWith('http') && !args.endsWith('.tar.gz') && !args.endsWith('.tgz'),
    message: () => 'ADD for local files is discouraged. COPY is more explicit and predictable.',
    fix: 'Replace ADD with COPY for local file copying.',
  },
  {
    id: 'DL008', severity: 'ERROR', title: 'Do not use sudo',
    lineCheck: ({ cmd, args }) => cmd === 'RUN' && /\bsudo\b/.test(args),
    message: () => 'Do not use sudo in Dockerfiles. Commands run as root by default, or switch users with USER.',
    fix: 'Remove sudo from RUN instructions.',
  },
  {
    id: 'DL009', severity: 'WARNING', title: 'Pin apt-get package versions',
    lineCheck: ({ cmd, args }) => cmd === 'RUN' && args.includes('apt-get install') && !/=[\d]/.test(args),
    message: () => 'apt-get install without pinned versions can break builds on cache invalidation.',
    fix: 'Pin versions: apt-get install -y curl=7.81.0-1ubuntu1',
  },
  {
    id: 'DL010', severity: 'ERROR', title: 'Do not use root user',
    check: (layers) => {
      const userLayers = layers.filter(l => l.cmd === 'USER');
      return userLayers.length === 0 || userLayers[userLayers.length - 1].args.trim() === 'root';
    },
    message: 'Container runs as root. This is a security risk.',
    fix: 'Add USER <username> before CMD/ENTRYPOINT. Create a non-root user: RUN addgroup --system app && adduser --system --ingroup app app',
  },
  {
    id: 'DL011', severity: 'WARNING', title: 'EXPOSE should use standard ports',
    lineCheck: ({ cmd, args }) => cmd === 'EXPOSE' && !/^\d+(\s+\d+)*$/.test(args.trim()),
    message: () => 'EXPOSE value looks non-standard.',
    fix: 'EXPOSE should list numeric port numbers, e.g. EXPOSE 3000 or EXPOSE 80 443',
  },
  {
    id: 'DL012', severity: 'INFO', title: 'Set WORKDIR explicitly',
    check: (layers) => layers.filter(l => l.cmd === 'WORKDIR').length === 0,
    message: 'No WORKDIR instruction found. Using root / as working directory is error-prone.',
    fix: 'Add WORKDIR /app before COPY and RUN instructions.',
  },
  {
    id: 'DL013', severity: 'WARNING', title: 'Minimise RUN layers',
    check: (layers) => {
      const runs = layers.filter(l => l.cmd === 'RUN' && !l.args.includes('&&'));
      return runs.length > 3;
    },
    message: (_, runs) => `Found ${runs} separate RUN instructions. Each adds a layer.`,
    fix: 'Chain commands with && to reduce layers: RUN cmd1 && cmd2 && cmd3',
  },
  {
    id: 'DL014', severity: 'WARNING', title: 'COPY . . copies everything — check .dockerignore',
    lineCheck: ({ cmd, args }) => cmd === 'COPY' && /^\.\s+\./.test(args.trim()),
    message: () => 'COPY . . copies the entire context. Make sure .dockerignore excludes node_modules, .git, etc.',
    fix: 'Create a .dockerignore file excluding unnecessary files.',
  },
  {
    id: 'DL015', severity: 'INFO', title: 'No HEALTHCHECK defined',
    check: (layers) => layers.filter(l => l.cmd === 'HEALTHCHECK').length === 0,
    message: 'No HEALTHCHECK instruction. Docker cannot determine if your container is healthy.',
    fix: 'Add: HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health || exit 1',
  },
];

const SEV_ORDER = { ERROR: 0, WARNING: 1, INFO: 2 };
const SEV_COLOR = { ERROR: '\x1b[31m', WARNING: '\x1b[33m', INFO: '\x1b[36m' };
const NC = '\x1b[0m'; const BOLD = '\x1b[1m'; const GREEN = '\x1b[32m'; const DIM = '\x1b[2m';

// ── Parser ────────────────────────────────────────────────────────────────────
function parseDockerfile(content) {
  const layers = [];
  const rawLines = content.split('\n');
  let i = 0;
  while (i < rawLines.length) {
    let line = rawLines[i].trim();
    if (!line || line.startsWith('#')) { i++; continue; }
    // Handle line continuations
    while (line.endsWith('\\') && i + 1 < rawLines.length) {
      i++;
      line = line.slice(0, -1).trimEnd() + ' ' + rawLines[i].trim();
    }
    const spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) { layers.push({ cmd: line.toUpperCase(), args: '', lineNum: i + 1, raw: line }); }
    else {
      layers.push({
        cmd: line.slice(0, spaceIdx).toUpperCase(),
        args: line.slice(spaceIdx + 1),
        lineNum: i + 1,
        raw: line,
      });
    }
    i++;
  }
  return layers;
}

// ── Linter ────────────────────────────────────────────────────────────────────
function lint(content) {
  const layers = parseDockerfile(content);
  const findings = [];

  for (const rule of RULES) {
    if (rule.check) {
      const runRuns = layers.filter(l => l.cmd === 'RUN').length;
      if (rule.check(layers, runRuns)) {
        findings.push({
          rule: rule.id, severity: rule.severity, title: rule.title,
          message: typeof rule.message === 'function' ? rule.message(null, runRuns) : rule.message,
          fix: rule.fix, line: null,
        });
      }
    }
    if (rule.lineCheck) {
      for (const layer of layers) {
        if (rule.lineCheck(layer)) {
          findings.push({
            rule: rule.id, severity: rule.severity, title: rule.title,
            message: rule.message(layer),
            fix: rule.fix, line: layer.lineNum, snippet: layer.raw.trim().slice(0, 100),
          });
        }
      }
    }
  }

  findings.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  return { findings, layers };
}

// ── Commands ──────────────────────────────────────────────────────────────────
function lintCommand(filePath, opts = {}) {
  const resolved = filePath ? path.resolve(filePath) : path.resolve('Dockerfile');

  // Auto-discover Dockerfile if dir passed
  let target = resolved;
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    target = path.join(resolved, 'Dockerfile');
  }

  if (!fs.existsSync(target)) {
    console.error(`❌ File not found: ${target}`); process.exit(1);
  }

  const content = fs.readFileSync(target, 'utf8');
  console.log(`\n${BOLD}🐳 dockerlint-pro — Dockerfile Linter${NC}`);
  console.log(`File: ${target}\n`);

  const { findings, layers } = lint(content);

  if (findings.length === 0) {
    console.log(`${GREEN}✅ No issues found! Your Dockerfile follows best practices.${NC}\n`);
    console.log(`   Layers parsed: ${layers.length}`);
    return;
  }

  const bySev = {};
  for (const f of findings) {
    if (!bySev[f.severity]) bySev[f.severity] = [];
    bySev[f.severity].push(f);
  }

  for (const sev of ['ERROR','WARNING','INFO']) {
    if (!bySev[sev]) continue;
    const col = SEV_COLOR[sev];
    console.log(`${col}${BOLD}── ${sev} (${bySev[sev].length}) ${'─'.repeat(38)}${NC}`);
    for (const f of bySev[sev]) {
      console.log(`  ${col}${BOLD}[${f.rule}]${NC} ${f.title}${f.line ? ` (line ${f.line})` : ''}`);
      console.log(`  ${DIM}Issue:${NC} ${f.message}`);
      if (f.snippet) console.log(`  ${DIM}Code:${NC}  ${f.snippet}`);
      console.log(`  ${GREEN}Fix:${NC}   ${f.fix}`);
      console.log('');
    }
  }

  const summary = { ERROR: 0, WARNING: 0, INFO: 0 };
  for (const f of findings) summary[f.severity]++;
  console.log('─'.repeat(50));
  console.log(`${BOLD}Errors: ${summary.ERROR}  Warnings: ${summary.WARNING}  Info: ${summary.INFO}${NC}`);

  if (opts.output) {
    const report = { lintedAt: new Date().toISOString(), file: target, layers: layers.length, summary, findings };
    fs.writeFileSync(opts.output, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${opts.output}`);
  }

  if (summary.ERROR > 0 && !opts.noFail) process.exit(1);
}

function analyzeCommand(filePath) {
  const target = filePath ? path.resolve(filePath) : path.resolve('Dockerfile');
  if (!fs.existsSync(target)) { console.error(`❌ File not found: ${target}`); process.exit(1); }
  const content = fs.readFileSync(target, 'utf8');
  const { layers } = lint(content);

  console.log(`\n${BOLD}🐳 Dockerfile Analysis — ${path.basename(target)}${NC}\n`);
  console.log(`Total instructions: ${layers.length}\n`);

  const groupedByCmd = {};
  for (const l of layers) {
    if (!groupedByCmd[l.cmd]) groupedByCmd[l.cmd] = [];
    groupedByCmd[l.cmd].push(l);
  }

  for (const [cmd, ls] of Object.entries(groupedByCmd)) {
    console.log(`  ${BOLD}${cmd}${NC} (${ls.length}x)`);
    ls.forEach(l => console.log(`    ${DIM}line ${l.lineNum}:${NC} ${l.args.trim().slice(0, 80)}`));
  }
  console.log('');
}

function listRulesCommand() {
  console.log(`\n${BOLD}🐳 dockerlint-pro — Active Rules${NC}\n`);
  for (const sev of ['ERROR','WARNING','INFO']) {
    const col = SEV_COLOR[sev];
    const rules = RULES.filter(r => r.severity === sev);
    console.log(`${col}${BOLD}${sev}${NC}`);
    rules.forEach(r => console.log(`  ${r.id}  ${r.title}`));
    console.log('');
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const [,, cmd, arg1, ...rest] = process.argv;

if (!cmd || cmd === 'help') {
  console.log('dockerlint-pro — Dockerfile Linter & Best-Practice Checker\n');
  console.log('Commands:');
  console.log('  lint [file]              Lint a Dockerfile (default: ./Dockerfile)');
  console.log('  lint [file] --out file   Save JSON report');
  console.log('  lint [file] --no-fail    Do not exit 1 on errors');
  console.log('  analyze [file]           Show layer analysis');
  console.log('  rules                    List all lint rules');
  console.log('\nExamples:');
  console.log('  node src/dockerlint.js lint');
  console.log('  node src/dockerlint.js lint Dockerfile --out report.json');
  console.log('  node src/dockerlint.js analyze Dockerfile');
  process.exit(0);
}

if (cmd === 'lint') {
  const outIdx = rest.indexOf('--out');
  const output = outIdx !== -1 ? rest[outIdx + 1] : null;
  const noFail = rest.includes('--no-fail');
  lintCommand(arg1, { output, noFail });
} else if (cmd === 'analyze') {
  analyzeCommand(arg1);
} else if (cmd === 'rules') {
  listRulesCommand();
} else {
  console.error(`Unknown command: ${cmd}`); process.exit(1);
}
