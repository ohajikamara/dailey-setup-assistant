# Dailey Setup Assistant

A friendly desktop setup assistant for connecting Dailey OS to local AI tools.

This first version supports:

- Codex
- Claude Desktop
- OpenCode
- GitHub CLI sign-in
- Dailey CLI sign-in
- Dailey CLI + MCP version and connection checks
- Safe config backups before editing local AI app config files

## Open The App

From this folder, run:

```bash
npm start
```

## Development Mode

Use this while actively changing the interface:

```bash
npm run dev
```

## Build Check

Run this to confirm the app compiles:

```bash
npm run build
```

## Send An Update To The Installed App

The source code lives in GitHub. The installed Mac app receives updates from GitHub Releases.

### 1. Save your code changes

```bash
git status
git add .
git commit -m "Describe the update"
git push
```

### 2. Bump the app version

Each public update needs a higher version number in `package.json`.

Example:

```bash
npm version patch
```

That changes `0.1.0` to `0.1.1`, creates a git commit, and creates a version tag.

### 3. Publish the Mac update

```bash
GH_TOKEN=$(gh auth token) npm run release:github
git push --follow-tags
```

This builds the app, uploads the `.dmg`, `.zip`, and update metadata to GitHub Releases, then pushes the version tag.

### 4. Install once, then let updates work

Open the newest `.dmg` from the GitHub release and drag `Dailey Setup Assistant.app` into Applications.

After that, packaged copies of the app check GitHub Releases for updates when they start.

## What The Buttons Do

### Install / Repair Dailey Tools

Runs the official Dailey installer:

```bash
curl -fsSL https://get.dailey.cloud/install.sh | bash
```

Then refreshes both Dailey packages to their latest releases:

```bash
npm install -g @daileyos/cli@latest @daileyos/mcp-server@latest
```

### Open Dailey Setup

Opens Terminal and runs:

```bash
dailey setup
```

### Open GitHub Login

Opens Terminal and runs:

```bash
gh auth login
```

### Connect Codex

Backs up and updates:

```text
~/.codex/config.toml
```

### Connect Claude Desktop

Backs up and updates:

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Connect OpenCode

Backs up and updates:

```text
~/.config/opencode/opencode.json
```

After connecting an AI app, fully restart that app so it reloads the MCP configuration.

The assistant keeps the Dailey MCP command on `@latest`, which matters because
Dailey WordPress tools evolve with the platform. Existing Dailey environment
variables and nested tool settings are kept when Codex is refreshed.
