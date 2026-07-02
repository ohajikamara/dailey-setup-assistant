const { app, BrowserWindow, ipcMain, nativeImage, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const jsonc = require("jsonc-parser");

const isDev = process.env.DAILEY_ASSISTANT_DEV === "1";
const homeDir = process.env.DAILEY_ASSISTANT_HOME || os.homedir();
let installUpdateWhenReady = false;
let latestUpdateInfo = null;
let downloadedUpdateInfo = null;

function appIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.png");
  }
  return path.join(__dirname, "..", "build", "icon.png");
}

function appIconImage() {
  const image = nativeImage.createFromPath(appIconPath());
  return image.isEmpty() ? undefined : image;
}

function commandPath() {
  return [
    process.env.DAILEY_ASSISTANT_TEST_BIN || "",
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    process.env.PATH || ""
  ].filter(Boolean).join(":");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1586,
    height: 992,
    useContentSize: true,
    minWidth: 1180,
    minHeight: 740,
    title: "Dailey Setup Assistant",
    icon: appIconImage(),
    backgroundColor: "#f7f5ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    win.loadURL("http://127.0.0.1:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function sendUpdateStatus(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("assistant:update-status", payload);
  }
}

function configureAutoUpdates() {
  if (isDev || !app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus({
      status: "checking",
      automatic: !installUpdateWhenReady,
      detail: "Checking GitHub for the latest Dailey Setup Assistant update..."
    });
  });

  autoUpdater.on("update-available", (info) => {
    latestUpdateInfo = info;
    sendUpdateStatus({
      status: "available",
      version: info.version,
      detail: `Version ${info.version} is available. Click Latest Update to install it.`
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent || 0);
    sendUpdateStatus({
      status: "downloading",
      percent,
      detail: `Downloading the latest update from GitHub... ${percent}%`
    });
  });

  autoUpdater.on("update-not-available", () => {
    installUpdateWhenReady = false;
    latestUpdateInfo = null;
    downloadedUpdateInfo = null;
    sendUpdateStatus({
      status: "not-available",
      detail: "You already have the latest version installed."
    });
  });

  autoUpdater.on("error", (error) => {
    installUpdateWhenReady = false;
    sendUpdateStatus({
      status: "error",
      detail: `Could not check for updates: ${error.message}`
    });
    console.error("Update check failed:", error);
  });

  autoUpdater.on("update-downloaded", (info) => {
    downloadedUpdateInfo = info;
    sendUpdateStatus({
      status: installUpdateWhenReady ? "installing" : "downloaded",
      version: info.version,
      detail: installUpdateWhenReady
        ? `Version ${info.version} downloaded. Restarting now to install it.`
        : `Version ${info.version} downloaded. It will install when the app quits.`
    });
    console.log("Update downloaded. It will install when the app quits.");
    if (installUpdateWhenReady) {
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true);
      }, 1200);
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error("Update check failed:", error);
    });
  }, 4000);
}

app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) {
    const icon = appIconImage();
    if (icon) app.dock.setIcon(icon);
  }
  createWindow();
  configureAutoUpdates();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function execCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, {
      timeout: options.timeout ?? 12000,
      env: {
        ...process.env,
        HOME: homeDir,
        PATH: commandPath()
      }
    }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code ?? 0,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim()
      });
    });
  });
}

async function commandVersion(command, args = ["--version"]) {
  const result = await execCommand(command, args);
  const firstLine = (result.stdout || result.stderr).split("\n").find(Boolean) || "";
  return {
    found: result.ok,
    detail: result.ok ? firstLine : `${command} was not found`
  };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findMacApp(appNames) {
  if (process.platform !== "darwin") return null;

  const appFolders = [
    "/Applications",
    path.join(homeDir, "Applications")
  ];

  for (const appName of appNames) {
    for (const folder of appFolders) {
      const appPath = path.join(folder, `${appName}.app`);
      if (await pathExists(appPath)) return appPath;
    }
  }

  return null;
}

async function commandExists(command) {
  const result = await execCommand(command, ["--version"], { timeout: 6000 });
  return result.ok;
}

async function clientInstallState(client, configExists = false) {
  const clientMeta = {
    codex: {
      displayName: "Codex",
      appNames: ["Codex"],
      command: "codex"
    },
    claude: {
      displayName: "Claude Desktop",
      appNames: ["Claude", "Claude Desktop"],
      command: null
    },
    opencode: {
      displayName: "OpenCode",
      appNames: ["OpenCode", "OpenCode Desktop"],
      command: "opencode"
    }
  }[client];

  if (!clientMeta) {
    throw new Error(`Unknown client: ${client}`);
  }

  const [appPath, cliFound] = await Promise.all([
    findMacApp(clientMeta.appNames),
    clientMeta.command ? commandExists(clientMeta.command) : Promise.resolve(false)
  ]);

  const installed = Boolean(appPath || cliFound);
  let detail = `${clientMeta.displayName} was not found on this Mac`;
  if (appPath) detail = `${clientMeta.displayName} app found`;
  if (!appPath && cliFound) detail = `${clientMeta.displayName} command found`;
  if (!installed && configExists) detail = `${clientMeta.displayName} settings exist, but the app was not found`;

  return {
    installed,
    appPath,
    cliFound,
    detail
  };
}

async function readCodexConfig() {
  const configPath = path.join(homeDir, ".codex", "config.toml");
  const exists = await pathExists(configPath);
  const install = await clientInstallState("codex", exists);
  if (!exists) {
    return {
      exists: false,
      path: configPath,
      hasDaileyBlock: false,
      daileyBlockLooksValid: false,
      ...install
    };
  }

  const content = await fs.readFile(configPath, "utf8");
  const hasDaileyBlock = /^\[mcp_servers\."?dailey-os"?\]/m.test(content);
  const daileyBlockLooksValid = hasDaileyBlock && /@daileyos\/mcp-server/.test(content);

  return {
    exists: true,
    path: configPath,
    hasDaileyBlock,
    daileyBlockLooksValid,
    ...install
  };
}

function claudeDesktopConfigPath() {
  if (process.platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"), "Claude", "claude_desktop_config.json");
  }
  return path.join(homeDir, ".config", "Claude", "claude_desktop_config.json");
}

function opencodeConfigPath() {
  return path.join(homeDir, ".config", "opencode", "opencode.json");
}

function mcpServerJson() {
  return {
    type: "stdio",
    command: "npx",
    args: ["-y", "@daileyos/mcp-server@latest"],
    env: {}
  };
}

function opencodeMcpServerJson() {
  return {
    type: "local",
    command: ["npx", "-y", "@daileyos/mcp-server@latest"],
    enabled: true
  };
}

async function readJsonClientConfig(client) {
  const configPath = client === "claude" ? claudeDesktopConfigPath() : opencodeConfigPath();
  const exists = await pathExists(configPath);
  const install = await clientInstallState(client, exists);
  if (!exists) {
    return {
      exists: false,
      path: configPath,
      hasDaileyBlock: false,
      daileyBlockLooksValid: false,
      parseError: false,
      ...install
    };
  }

  const content = await fs.readFile(configPath, "utf8");
  const errors = [];
  const parsed = jsonc.parse(content, errors, { allowTrailingComma: true });
  const block = client === "claude"
    ? parsed?.mcpServers?.["dailey-os"]
    : parsed?.mcp?.["dailey-os"];
  const serialized = JSON.stringify(block || {});

  return {
    exists: true,
    path: configPath,
    hasDaileyBlock: Boolean(block),
    daileyBlockLooksValid: /@daileyos\/mcp-server/.test(serialized),
    parseError: errors.length > 0,
    ...install
  };
}

async function readMcpClients() {
  const [codex, claude, opencode] = await Promise.all([
    readCodexConfig(),
    readJsonClientConfig("claude"),
    readJsonClientConfig("opencode")
  ]);

  return {
    codex,
    claude,
    opencode
  };
}

async function diagnostics() {
  const [node, npm, gh, dailey, clients, mcpPackage] = await Promise.all([
    commandVersion("node"),
    commandVersion("npm"),
    commandVersion("gh"),
    commandVersion("dailey"),
    readMcpClients(),
    execCommand("npm", ["list", "-g", "@daileyos/mcp-server", "--depth=0"], { timeout: 15000 })
  ]);

  const githubAuth = gh.found
    ? await execCommand("gh", ["auth", "status"], { timeout: 15000 })
    : { ok: false, stdout: "", stderr: "GitHub CLI is not installed" };

  const daileyAuth = dailey.found
    ? await execCommand("dailey", ["whoami"], { timeout: 15000 })
    : { ok: false, stdout: "", stderr: "Dailey CLI is not installed" };

  const projects = dailey.found
    ? await execCommand("dailey", ["projects"], { timeout: 20000 })
    : { ok: false, stdout: "", stderr: "Dailey CLI is not installed" };

  return {
    checkedAt: new Date().toISOString(),
    platform: {
      os: process.platform,
      arch: process.arch,
      release: os.release()
    },
    tools: {
      node,
      npm,
      gh,
      dailey,
      daileyMcp: {
        found: mcpPackage.ok,
        detail: mcpPackage.ok ? "Dailey MCP package is installed globally" : "Dailey MCP package is not installed globally"
      }
    },
    accounts: {
      github: {
        connected: githubAuth.ok,
        detail: githubAuth.ok ? firstUsefulLine(githubAuth.stdout) : firstUsefulLine(githubAuth.stderr || githubAuth.stdout)
      },
      dailey: {
        connected: daileyAuth.ok,
        detail: daileyAuth.ok ? firstUsefulLine(daileyAuth.stdout) : firstUsefulLine(daileyAuth.stderr || daileyAuth.stdout)
      }
    },
    clients,
    codex: clients.codex,
    projects: {
      available: projects.ok,
      detail: projects.ok ? firstUsefulLine(projects.stdout) : firstUsefulLine(projects.stderr || projects.stdout)
    }
  };
}

function firstUsefulLine(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) || "No detail returned";
}

function openTerminalCommand(command) {
  if (process.platform === "darwin") {
    const script = [
      "tell application \"Terminal\"",
      "activate",
      `do script ${JSON.stringify(command)}`,
      "end tell"
    ].join("\n");
    return execCommand("osascript", ["-e", script], { timeout: 8000 });
  }

  return execCommand("bash", ["-lc", command], { timeout: 1000 });
}

function streamCommand(event, label, command, args = []) {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      HOME: homeDir,
      PATH: commandPath()
    },
    shell: false
  });

  event.sender.send("assistant:log", { label, line: `Started ${label}` });

  child.stdout.on("data", (data) => {
    event.sender.send("assistant:log", { label, line: data.toString() });
  });

  child.stderr.on("data", (data) => {
    event.sender.send("assistant:log", { label, line: data.toString() });
  });

  child.on("close", (code) => {
    event.sender.send("assistant:log", { label, line: `${label} finished with code ${code}` });
  });
}

function parseGithubDeviceCode(output) {
  const match = String(output || "").match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/);
  return match ? match[1] : "";
}

function parseGithubLoginUrl(output) {
  const match = String(output || "").match(/https:\/\/github\.com\/login\/device\b/);
  return match ? match[0] : "https://github.com/login/device";
}

async function startGithubLogin(event) {
  const gh = await commandVersion("gh");
  if (!gh.found) {
    return {
      ok: false,
      detail: "GitHub CLI is not installed yet. Prepare this Mac first, then try GitHub sign-in again."
    };
  }

  const existingAuth = await execCommand("gh", ["auth", "status"], { timeout: 8000 });
  if (existingAuth.ok) {
    return {
      ok: true,
      alreadyConnected: true,
      detail: `GitHub is already connected: ${firstUsefulLine(existingAuth.stdout)}`
    };
  }

  return new Promise((resolve) => {
    const child = spawn("gh", ["auth", "login", "--web", "--hostname", "github.com", "--git-protocol", "https"], {
      env: {
        ...process.env,
        HOME: homeDir,
        PATH: commandPath()
      },
      shell: false,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let settled = false;
    let pressedEnter = false;
    let buffer = "";

    const settle = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const handleOutput = (chunk) => {
      const text = String(chunk || "");
      buffer += text;
      event.sender.send("assistant:log", { label: "GitHub sign-in", line: text });

      const code = parseGithubDeviceCode(buffer);
      const url = parseGithubLoginUrl(buffer);
      if (code) {
        shell.openExternal(url);
        settle({
          ok: true,
          code,
          url,
          detail: `GitHub opened in your browser. Copy code ${code}, approve access, then return here and press Check again.`
        });
      }

      if (!pressedEnter && /press enter/i.test(buffer)) {
        pressedEnter = true;
        child.stdin.write("\n");
      }
    };

    child.stdout.on("data", handleOutput);
    child.stderr.on("data", handleOutput);
    child.on("error", (error) => {
      settle({
        ok: false,
        detail: `Could not start GitHub sign-in: ${error.message}`
      });
    });
    child.on("close", (code) => {
      const deviceCode = parseGithubDeviceCode(buffer);
      const statusLine = code === 0 ? "GitHub sign-in finished." : firstUsefulLine(buffer);
      event.sender.send("assistant:log", { label: "GitHub sign-in", line: statusLine });
      settle({
        ok: code === 0,
        code: deviceCode,
        url: parseGithubLoginUrl(buffer),
        detail: code === 0
          ? "GitHub sign-in finished. Press Check again so the assistant can verify it."
          : `GitHub sign-in needs attention: ${statusLine}`
      });
    });

    setTimeout(() => {
      const deviceCode = parseGithubDeviceCode(buffer);
      if (deviceCode) return;
      settle({
        ok: false,
        detail: "GitHub sign-in started, but the assistant could not read a device code yet. Use the Terminal window if it opened, then press Check again."
      });
    }, 9000);
  });
}

function nextSectionIndex(content, startIndex) {
  const next = content.slice(startIndex + 1).search(/^\[/m);
  return next === -1 ? content.length : startIndex + 1 + next;
}

async function configureCodex() {
  const codexDir = path.join(homeDir, ".codex");
  const configPath = path.join(codexDir, "config.toml");
  await fs.mkdir(codexDir, { recursive: true });

  const current = await pathExists(configPath)
    ? await fs.readFile(configPath, "utf8")
    : "";

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${configPath}.backup-${stamp}`;
  await fs.writeFile(backupPath, current, "utf8");

  const block = [
    "[mcp_servers.dailey-os]",
    "command = \"npx\"",
    "args = [\"-y\", \"@daileyos/mcp-server@latest\"]",
    ""
  ].join("\n");

  const start = current.search(/^\[mcp_servers\."?dailey-os"?\]/m);
  let next;
  if (start === -1) {
    next = `${current.trimEnd()}\n\n${block}`.trimStart();
  } else {
    const end = nextSectionIndex(current, start);
    next = `${current.slice(0, start)}${block}${current.slice(end).replace(/^\n+/, "")}`;
  }

  await fs.writeFile(configPath, next, "utf8");

  const check = await execCommand("codex", ["mcp", "list"], { timeout: 15000 });

  return {
    ok: true,
    configPath,
    backupPath,
    codexCheck: check.ok,
    detail: check.ok ? firstUsefulLine(check.stdout) : firstUsefulLine(check.stderr || check.stdout)
  };
}

async function updateJsonConfig({ configPath, rootKey, value }) {
  await fs.mkdir(path.dirname(configPath), { recursive: true });

  const current = await pathExists(configPath)
    ? await fs.readFile(configPath, "utf8")
    : "{\n}\n";

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${configPath}.backup-${stamp}`;
  await fs.writeFile(backupPath, current, "utf8");

  const errors = [];
  const parsed = jsonc.parse(current, errors, { allowTrailingComma: true });
  if (errors.length > 0 || !parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`The config file is not valid JSON/JSONC. Backup created at ${backupPath}`);
  }

  let next = current;
  if (!parsed[rootKey] || typeof parsed[rootKey] !== "object" || Array.isArray(parsed[rootKey])) {
    const edits = jsonc.modify(next, [rootKey], {}, {
      formattingOptions: { insertSpaces: true, tabSize: 2 }
    });
    next = jsonc.applyEdits(next, edits);
  }

  const serverEdits = jsonc.modify(next, [rootKey, "dailey-os"], value, {
    formattingOptions: { insertSpaces: true, tabSize: 2 }
  });
  next = jsonc.applyEdits(next, serverEdits);

  await fs.writeFile(configPath, next, "utf8");

  return {
    ok: true,
    configPath,
    backupPath
  };
}

async function configureClient(_event, client) {
  const install = await clientInstallState(client);
  if (!install.installed) {
    const names = {
      codex: "Codex",
      claude: "Claude Desktop",
      opencode: "OpenCode"
    };
    throw new Error(`${names[client] || client} does not appear to be installed on this Mac yet. Install it first, open it once, then come back to Dailey Setup Assistant.`);
  }

  if (client === "codex") {
    return configureCodex();
  }

  if (client === "claude") {
    return updateJsonConfig({
      configPath: claudeDesktopConfigPath(),
      rootKey: "mcpServers",
      value: mcpServerJson()
    });
  }

  if (client === "opencode") {
    return updateJsonConfig({
      configPath: opencodeConfigPath(),
      rootKey: "mcp",
      value: opencodeMcpServerJson()
    });
  }

  throw new Error(`Unknown client: ${client}`);
}

ipcMain.handle("assistant:diagnostics", diagnostics);

ipcMain.handle("assistant:configure-codex", configureCodex);
ipcMain.handle("assistant:configure-client", configureClient);

ipcMain.handle("assistant:open-terminal", async (_event, command) => {
  return openTerminalCommand(command);
});

ipcMain.handle("assistant:start-github-login", startGithubLogin);

ipcMain.handle("assistant:open-url", async (_event, url) => {
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle("assistant:latest-update", async () => {
  if (isDev || !app.isPackaged) {
    return {
      ok: false,
      status: "unavailable",
      detail: "Latest Update works after the app is installed from the DMG. Development preview cannot install itself."
    };
  }

  installUpdateWhenReady = true;
  autoUpdater.autoDownload = false;

  if (downloadedUpdateInfo) {
    sendUpdateStatus({
      status: "installing",
      version: downloadedUpdateInfo.version,
      detail: `Version ${downloadedUpdateInfo.version} is ready. Restarting now to install it.`
    });
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 800);

    return {
      ok: true,
      status: "installing",
      detail: `Version ${downloadedUpdateInfo.version} is ready. Restarting now to install it.`
    };
  }

  if (!latestUpdateInfo) {
    const result = await autoUpdater.checkForUpdates();
    if (!result?.updateInfo || result.updateInfo.version === app.getVersion()) {
      return {
        ok: false,
        status: "not-available",
        detail: "You already have the latest version installed."
      };
    }
    latestUpdateInfo = result.updateInfo;
  }

  sendUpdateStatus({
    status: "downloading",
    version: latestUpdateInfo.version,
    percent: 0,
    detail: `Downloading version ${latestUpdateInfo.version} from GitHub...`
  });
  await autoUpdater.downloadUpdate();

  return {
    ok: true,
    status: "downloading",
    version: latestUpdateInfo.version,
    detail: `Downloading version ${latestUpdateInfo.version}. The app will restart to install it when ready.`
  };
});

ipcMain.handle("assistant:restart-ai-apps", async (_event, apps = []) => {
  if (process.env.DAILEY_ASSISTANT_TEST === "1") {
    return {
      ok: true,
      detail: `Test mode skipped opening ${apps.length || 0} AI app${apps.length === 1 ? "" : "s"}.`
    };
  }

  if (process.platform !== "darwin") {
    return { ok: false, detail: "Automatic app reload is currently available on macOS only." };
  }

  const appNames = {
    codex: ["Codex"],
    claude: ["Claude"],
    opencode: ["OpenCode"]
  };

  const targets = [...new Set(apps.flatMap((appName) => appNames[appName] || []))];
  if (targets.length === 0) {
    return { ok: false, detail: "No connected AI apps were selected for reload." };
  }

  const results = [];
  for (const target of targets) {
    await execCommand("osascript", ["-e", `tell application "${target}" to quit`], { timeout: 5000 });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const opened = await execCommand("open", ["-a", target], { timeout: 8000 });
    results.push({ app: target, ok: opened.ok, detail: opened.ok ? "reloaded" : firstUsefulLine(opened.stderr || opened.stdout) });
  }

  return {
    ok: results.some((item) => item.ok),
    results,
    detail: results.map((item) => `${item.app}: ${item.detail}`).join("; ")
  };
});

ipcMain.on("assistant:install-tools", (event) => {
  streamCommand(event, "Dailey installer", "bash", [
    "-lc",
    "curl -fsSL https://get.dailey.cloud/install.sh | bash"
  ]);
});
