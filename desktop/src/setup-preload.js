const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cc', {
  checkClaude: () => ipcRenderer.invoke('setup:check-claude'),
  save: (data) => ipcRenderer.invoke('setup:save', data),
  close: () => ipcRenderer.invoke('setup:close'),
});
