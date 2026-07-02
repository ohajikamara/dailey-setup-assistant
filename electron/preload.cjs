const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("daileyAssistant", {
  diagnostics: () => ipcRenderer.invoke("assistant:diagnostics"),
  configureCodex: () => ipcRenderer.invoke("assistant:configure-codex"),
  configureClient: (client) => ipcRenderer.invoke("assistant:configure-client", client),
  openTerminal: (command) => ipcRenderer.invoke("assistant:open-terminal", command),
  openUrl: (url) => ipcRenderer.invoke("assistant:open-url", url),
  restartAiApps: (apps) => ipcRenderer.invoke("assistant:restart-ai-apps", apps),
  installTools: () => ipcRenderer.send("assistant:install-tools"),
  onLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("assistant:log", listener);
    return () => ipcRenderer.removeListener("assistant:log", listener);
  }
});
