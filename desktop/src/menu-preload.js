const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cmenu', {
  onState:      (cb) => ipcRenderer.on('menu:state', (_, d) => cb(d)),
  quit:         ()   => ipcRenderer.invoke('menu:quit'),
  start:        ()   => ipcRenderer.invoke('menu:start'),
  stop:         ()   => ipcRenderer.invoke('menu:stop'),
  restart:      ()   => ipcRenderer.invoke('menu:restart'),
  signOut:      ()   => ipcRenderer.invoke('menu:sign-out'),
  openPwa:      ()   => ipcRenderer.invoke('menu:open-pwa'),
  openFolder:   ()   => ipcRenderer.invoke('menu:open-folder'),
  copyToken:    ()   => ipcRenderer.invoke('menu:copy-token'),
  checkUpdates: ()   => ipcRenderer.invoke('menu:check-updates'),
  brewUpdate:   ()   => ipcRenderer.invoke('menu:brew-update'),
  close:        ()   => ipcRenderer.invoke('menu:close'),
});
