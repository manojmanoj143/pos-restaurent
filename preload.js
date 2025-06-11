const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  reloadPage: () => ipcRenderer.send('reload-page') // Send reload request to main
});