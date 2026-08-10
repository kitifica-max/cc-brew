const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cc', {
  save: (data) => ipcRenderer.invoke('setup:save', data),
  close: () => ipcRenderer.invoke('setup:close'),
});
