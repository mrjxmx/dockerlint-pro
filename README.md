# 🐳 dockerlint-pro

[![CI](https://github.com/YOUR_USERNAME/dockerlint-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/dockerlint-pro/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![GitHub Achievements](https://img.shields.io/badge/GitHub-Achievements-blueviolet.svg)](https://github.com/YOUR_USERNAME)

> Dockerfile linter and best-practice checker — catch security issues, bloat, and anti-patterns before they ship.

## ✨ Features

- 🛡️ 15 rules covering security, performance, and best practices
- 🔍 Detects: root user, pinned tags, sudo usage, apt cache cleanup, HEALTHCHECK, WORKDIR, layer bloat
- 📋 Layer analysis — visualize every instruction in your Dockerfile
- 💾 JSON report output for CI pipelines
- ❌ Non-zero exit on errors (CI-friendly)

## 🚀 Quick Start

```bash
npm install
node src/dockerlint.js lint Dockerfile
```

## 📖 Usage

```bash
# Lint a Dockerfile
node src/dockerlint.js lint
node src/dockerlint.js lint path/to/Dockerfile

# Save JSON report
node src/dockerlint.js lint Dockerfile --out report.json

# Analyze layer structure
node src/dockerlint.js analyze Dockerfile

# List all rules
node src/dockerlint.js rules
```

## 🏆 Achievement Scripts

```bash
bash scripts/setup.sh
bash scripts/unlock-all.sh
```
