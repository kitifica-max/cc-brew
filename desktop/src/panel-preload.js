import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('cc', {
  onState:       (cb) => ipcRenderer.on('panel:state',  (_, d) => cb(d)),
  onChunk:       (cb) => ipcRenderer.on('panel:chunk',  (_, d) => cb(d)),
  onStatus:      (cb) => ipcRenderer.on('panel:status', (_, d) => cb(d)),
  advance:       (projectId, phase) => ipcRenderer.invoke('panel:advance-phase', projectId, phase),
  openTerminal:  (projectId)        => ipcRenderer.invoke('panel:open-terminal', projectId),
  switchProject: (id)               => ipcRenderer.invoke('panel:switch-project', id),
  openMenu:      ()                 => ipcRenderer.invoke('panel:open-menu'),
  markSeen:      ()                 => ipcRenderer.invoke('panel:mark-seen'),
  close:         ()                 => ipcRenderer.invoke('panel:close'),
});
