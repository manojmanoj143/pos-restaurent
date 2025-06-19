const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const axios = require('axios');

let mainWindow;
let flaskProcess;
let mongoProcess;
let printPreviewWindow;

let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  console.log('electron-updater loaded successfully');
} catch (error) {
  console.error('Failed to load electron-updater:', error.message);
  process.exit(1);
}

function isFlaskServerRunning() {
  return new Promise((resolve, reject) => {
    http
      .get('http://127.0.0.1:5000/api/test', { timeout: 2000 }, (res) => {
        if (res.statusCode === 200) resolve(true);
        else reject(new Error(`Flask server responded with ${res.statusCode}`));
      })
      .on('error', () => reject(new Error('Flask server not available')))
      .on('timeout', () => reject(new Error('Flask server timeout')));
  });
}

function shutdownFlaskServer() {
  return new Promise((resolve) => {
    axios
      .post('http://127.0.0.1:5000/api/shutdown')
      .then(() => {
        console.log('Flask server shutdown request sent');
        resolve();
      })
      .catch((err) => {
        console.error('Shutdown request failed:', err.message);
        resolve(); // Proceed even if shutdown fails
      });
  });
}

function startMongoDB() {
  const mongoPath =
    process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '..', 'mongodb-binaries', 'mongod.exe')
      : path.join(process.resourcesPath, 'mongodb-binaries', 'mongod.exe');
  const dataDir = path.join(app.getPath('userData'), 'mongo-data');

  console.log(`MongoDB path: ${mongoPath}`);
  console.log(`Data directory: ${dataDir}`);

  return fs
    .access(dataDir)
    .catch(() => fs.mkdir(dataDir, { recursive: true }))
    .then(() => {
      mongoProcess = execFile(
        mongoPath,
        ['--dbpath', dataDir, '--bind_ip', '127.0.0.1', '--port', '27017'],
        { windowsHide: true },
        (err, stdout, stderr) => {
          if (err) console.error(`MongoDB error: ${err.message}`);
          if (stdout) console.log(`MongoDB stdout: ${stdout}`);
          if (stderr) console.error(`MongoDB stderr: ${stderr}`);
        }
      );

      mongoProcess.on('spawn', () => console.log('MongoDB spawned'));
      mongoProcess.on('error', (err) => {
        console.error(`MongoDB failed: ${err.message}`);
        app.quit();
      });
      mongoProcess.on('exit', (code) => console.log(`MongoDB exited with code ${code}`));

      app.on('before-quit', () => {
        if (mongoProcess && !mongoProcess.killed) {
          mongoProcess.kill('SIGTERM');
          console.log('MongoDB terminated');
        }
      });
    });
}

function startFlaskServer() {
  const flaskExePath =
    process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '..', 'dist', 'flask_server_dist', 'flask_server.exe')
      : path.join(process.resourcesPath, 'flask_server.exe');
  const preExistingUploads = path.join(process.resourcesPath, 'pre-existing-uploads');
  const userUploads = path.join(app.getPath('userData'), 'uploads');

  if (!fsSync.existsSync(userUploads)) {
    fsSync.mkdirSync(userUploads, { recursive: true });
    fsSync.cpSync(preExistingUploads, userUploads, { recursive: true });
    console.log(`Copied images to ${userUploads}`);
  }

  console.log(`Flask path: ${flaskExePath}`);

  flaskProcess = execFile(
    flaskExePath,
    [],
    { env: { ...process.env, UPLOAD_FOLDER: userUploads }, windowsHide: true },
    (err, stdout, stderr) => {
      if (err) console.error(`Flask error: ${err.message}`);
      if (stdout) console.log(`Flask stdout: ${stdout}`);
      if (stderr) console.error(`Flask stderr: ${stderr}`);
    }
  );

  flaskProcess.on('spawn', () => console.log('Flask spawned'));
  flaskProcess.on('error', (err) => {
    console.error(`Flask failed: ${err.message}`);
    app.quit();
  });
  flaskProcess.on('exit', (code) => console.log(`Flask exited with code ${code}`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: process.env.NODE_ENV === 'development',
      webSecurity: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Load a local loading screen first
  const loadingHtml = `
    <html>
      <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0;">
        <div style="text-align: center;">Loading POS Application...</div>
      </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`);
  mainWindow.show();

  const startUrl = 'http://127.0.0.1:5000';
  const loadApp = () => {
    isFlaskServerRunning()
      .then(() => {
        mainWindow.loadURL(startUrl);
        mainWindow.webContents.on('did-finish-load', () => {
          console.log('App loaded');
          mainWindow.show();
          mainWindow.focus();
        });
      })
      .catch(() => setTimeout(loadApp, 1000)); // Retry every 1 second
  };
  loadApp();

  mainWindow.on('closed', () => (mainWindow = null));
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.on('checking-for-update', () => console.log('Checking for updates...'));
  autoUpdater.on('update-available', (info) => console.log('Update available:', info.version));
  autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall());
  autoUpdater.on('error', (err) => console.error('Auto-update error:', err.message));
  autoUpdater.checkForUpdates().catch((err) => console.error('Update check failed:', err.message));
}

ipcMain.on('open-print-preview', (event, content) => {
  if (printPreviewWindow) printPreviewWindow.close();
  printPreviewWindow = new BrowserWindow({
    width: 600,
    height: 800,
    parent: mainWindow,
    modal: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    autoHideMenuBar: true,
  });

  const htmlContent = `
    <html>
      <head><style>@media print { .no-print { display: none; } }</style></head>
      <body>
        <div style="width: 80mm; margin: auto;">${content}</div>
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
    </html>
  `;
  printPreviewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  printPreviewWindow.on('closed', () => {
    printPreviewWindow = null;
    event.reply('print-preview-response', { success: true });
  });
});

ipcMain.on('send-email', async (event, emailContent) => {
  try {
    const response = await axios.post('http://127.0.0.1:5000/api/send-email', emailContent, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    event.sender.send('email-response', { success: response.data.success, message: response.data.message });
  } catch (error) {
    event.sender.send('email-response', { success: false, error: error.message });
  }
});

app.whenReady().then(() => {
  startMongoDB()
    .then(() => {
      startFlaskServer();
      createWindow();
      setupAutoUpdater();
    })
    .catch((err) => {
      console.error(`Startup failed: ${err.message}`);
      app.quit();
    });

  app.on('before-quit', async (event) => {
    event.preventDefault();
    if (flaskProcess && !flaskProcess.killed) {
      await shutdownFlaskServer();
      flaskProcess.kill('SIGTERM');
    }
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});