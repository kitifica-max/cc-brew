const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cc', {
  checkClaude: () => ipcRenderer.invoke('setup:check-claude'),
  signIn: (data) => ipcRenderer.invoke('setup:sign-in', data),
  save: (data) => ipcRenderer.invoke('setup:save', data),
  close: () => ipcRenderer.invoke('setup:close'),
});
