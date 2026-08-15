const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updater', {
  onProgress: (cb) => ipcRenderer.on('updater:progress', (_, d) => cb(d)),
  close:       ()   => ipcRenderer.invoke('updater:close'),
});
