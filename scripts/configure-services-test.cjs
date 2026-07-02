const { _electron: electron } = require("playwright");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");

const root = path.resolve(__dirname, "..");

async function writeExecutable(filePath, content) {
  await fs.writeFile(filePath, content, "utf8");
  await fs.chmod(filePath, 0o755);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function waitForFile(filePath, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  await fs.access(filePath);
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dailey-assistant-config-test-"));
  const fakeHome = path.join(tempRoot, "home");
  const fakeBin = path.join(tempRoot, "bin");
  await fs.mkdir(fakeHome, { recursive: true });
  await fs.mkdir(fakeBin, { recursive: true });
  await fs.mkdir(path.join(fakeHome, "Applications", "Claude.app"), { recursive: true });

  await writeExecutable(path.join(fakeBin, "dailey"), `#!/bin/sh
case "$1" in
  --version) echo "0.99.0-test" ;;
  whoami) echo "Logged in as:"; echo "  Name:   Test User"; echo "  Email:  test@dailey.cloud" ;;
  projects) echo "test-project" ;;
  *) echo "dailey test stub $@" ;;
esac
`);

  await writeExecutable(path.join(fakeBin, "gh"), `#!/bin/sh
case "$1 $2" in
  "--version ") echo "gh version 9.9.9-test" ;;
  "auth status") echo "github.com"; echo "  Logged in to github.com account test-user" ;;
  *) echo "gh test stub $@" ;;
esac
`);

  await writeExecutable(path.join(fakeBin, "npm"), `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "99.0.0-test"
elif [ "$1" = "list" ]; then
  echo "$HOME/.npm-global/lib"
  echo "└── @daileyos/mcp-server@9.9.9-test"
else
  echo "npm test stub $@"
fi
`);

  await writeExecutable(path.join(fakeBin, "codex"), `#!/bin/sh
if [ "$1" = "mcp" ] && [ "$2" = "list" ]; then
  echo "dailey-os"
elif [ "$1" = "--version" ]; then
  echo "codex 9.9.9-test"
else
  echo "codex test stub $@"
fi
`);

  await writeExecutable(path.join(fakeBin, "opencode"), `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "opencode 9.9.9-test"
else
  echo "opencode test stub $@"
fi
`);

  const app = await electron.launch({
    args: [root],
    env: {
      ...process.env,
      DAILEY_ASSISTANT_HOME: fakeHome,
      DAILEY_ASSISTANT_TEST_BIN: fakeBin
    }
  });

  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await window.getByText("Dailey Setup Assistant").first().waitFor({ timeout: 15000 });
    await window.locator(".ai-group-title strong", { hasText: "Found on this Mac" }).waitFor({ timeout: 15000 });
    await window.getByText("3 supported apps found on this Mac.").waitFor({ timeout: 15000 });

    await window.getByRole("button", { name: "Connect Codex" }).click();
    await waitForFile(path.join(fakeHome, ".codex", "config.toml"));

    await window.evaluate(() => window.daileyAssistant.configureClient("claude"));
    await waitForFile(path.join(fakeHome, "Library", "Application Support", "Claude", "claude_desktop_config.json"));

    await window.evaluate(() => window.daileyAssistant.configureClient("opencode"));
    await waitForFile(path.join(fakeHome, ".config", "opencode", "opencode.json"));

    const codexConfig = await fs.readFile(path.join(fakeHome, ".codex", "config.toml"), "utf8");
    if (!codexConfig.includes("[mcp_servers.dailey-os]") || !codexConfig.includes("@daileyos/mcp-server@latest")) {
      throw new Error("Codex config did not include Dailey MCP block");
    }

    const claudeConfig = await readJson(path.join(fakeHome, "Library", "Application Support", "Claude", "claude_desktop_config.json"));
    const claudeServer = claudeConfig.mcpServers?.["dailey-os"];
    if (claudeServer?.command !== "npx" || !claudeServer?.args?.includes("@daileyos/mcp-server@latest")) {
      throw new Error("Claude Desktop config did not include Dailey MCP server");
    }

    const opencodeConfig = await readJson(path.join(fakeHome, ".config", "opencode", "opencode.json"));
    const opencodeServer = opencodeConfig.mcp?.["dailey-os"];
    if (opencodeServer?.type !== "local" || opencodeServer?.command?.[0] !== "npx" || opencodeServer?.enabled !== true) {
      throw new Error("OpenCode config did not include Dailey local MCP server");
    }

    const backups = [
      ...(await fs.readdir(path.join(fakeHome, ".codex"))),
      ...(await fs.readdir(path.join(fakeHome, "Library", "Application Support", "Claude"))),
      ...(await fs.readdir(path.join(fakeHome, ".config", "opencode")))
    ].filter((name) => name.includes(".backup-"));
    if (backups.length < 3) {
      throw new Error("Expected config backups were not created");
    }

    console.log(`Configure-services test passed using sandbox home: ${fakeHome}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
