const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("daileyAssistant", {
  diagnostics: () => ipcRenderer.invoke("assistant:diagnostics"),
  configureCodex: () => ipcRenderer.invoke("assistant:configure-codex"),
  configureClient: (client) => ipcRenderer.invoke("assistant:configure-client", client),
  openTerminal: (command) => ipcRenderer.invoke("assistant:open-terminal", command),
  startGithubLogin: () => ipcRenderer.invoke("assistant:start-github-login"),
  openUrl: (url) => ipcRenderer.invoke("assistant:open-url", url),
  restartAiApps: (apps) => ipcRenderer.invoke("assistant:restart-ai-apps", apps),
  latestUpdate: () => ipcRenderer.invoke("assistant:latest-update"),
  installTools: () => ipcRenderer.send("assistant:install-tools"),
  onUpdateStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("assistant:update-status", listener);
    return () => ipcRenderer.removeListener("assistant:update-status", listener);
  },
  onLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("assistant:log", listener);
    return () => ipcRenderer.removeListener("assistant:log", listener);
  }
});
