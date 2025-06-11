const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs').promises;
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
      .get('http://127.0.0.1:5000/api/test', { timeout: 5000 }, (res) => {
        if (res.statusCode === 200) resolve(true);
        else reject(new Error(`Flask server responded with ${res.statusCode}`));
      })
      .on('error', (err) => reject(new Error(`Flask server error: ${err.message}`)))
      .on('timeout', () => reject(new Error('Flask server timeout')));
  });
}

async function shutdownFlaskServer() {
  try {
    await axios.post('http://127.0.0.1:5000/api/shutdown', {}, { timeout: 2000 });
    console.log('Flask server shutdown request sent successfully');
  } catch (err) {
    console.error('Failed to send shutdown request to Flask:', err.message);
  }
}

function startMongoDB() {
  const mongoPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '..', 'mongodb-binaries', 'mongod.exe')
    : path.join(process.resourcesPath, 'mongodb-binaries', 'mongod.exe');
  const dataDir = path.join(app.getPath('userData'), 'mongo-data');

  console.log(`MongoDB path: ${mongoPath}`);
  console.log(`MongoDB data directory: ${dataDir}`);

  return fs.access(dataDir).catch(() => fs.mkdir(dataDir, { recursive: true })).then(() => {
    mongoProcess = execFile(mongoPath, ['--dbpath', dataDir, '--bind_ip', '127.0.0.1', '--port', '27017'], { windowsHide: true }, (err, stdout, stderr) => {
      if (err) console.error(`MongoDB error: ${err.message}`);
      if (stdout) console.log(`MongoDB stdout: ${stdout}`);
      if (stderr) console.error(`MongoDB stderr: ${stderr}`);
    });

    const mongoTimeout = setTimeout(() => {
      console.error('MongoDB failed to start within 10 seconds');
      app.quit();
    }, 10000);

    mongoProcess.on('spawn', () => {
      clearTimeout(mongoTimeout);
      console.log('MongoDB process spawned successfully');
    });

    mongoProcess.on('error', (err) => {
      console.error(`Failed to start MongoDB: ${err.message}`);
      app.quit();
    });

    mongoProcess.on('exit', (code) => console.log(`MongoDB process exited with code ${code}`));

    app.on('before-quit', () => {
      if (mongoProcess && !mongoProcess.killed) {
        mongoProcess.kill('SIGTERM');
        console.log('MongoDB process terminated');
      }
    });
  }).catch((err) => {
    console.error(`Failed to create MongoDB data directory: ${err.message}`);
    throw err;
  });
}

function startFlaskServer() {
  const flaskExePath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '..', 'dist', 'flask_server_dist', 'flask_server.exe')
    : path.join(process.resourcesPath, 'flask_server.exe');

  console.log(`Flask server path: ${flaskExePath}`);

  flaskProcess = execFile(flaskExePath, { windowsHide: true }, (err, stdout, stderr) => {
    if (err) console.error(`Flask server error: ${err.message}`);
    if (stdout) console.log(`Flask stdout: ${stdout}`);
    if (stderr) console.error(`Flask stderr: ${stderr}`);
  });

  flaskProcess.on('spawn', () => console.log('Flask process spawned successfully'));
  flaskProcess.on('error', (err) => {
    console.error(`Failed to start Flask server: ${err.message}`);
    app.quit();
  });
  flaskProcess.on('exit', (code) => console.log(`Flask process exited with code ${code}`));

  app.on('before-quit', async (event) => {
    event.preventDefault();
    if (flaskProcess && !flaskProcess.killed) {
      try {
        await shutdownFlaskServer();
        setTimeout(() => {
          if (!flaskProcess.killed) {
            flaskProcess.kill('SIGTERM');
            console.log('Flask server terminated with SIGTERM');
          }
          app.quit();
        }, 2000);
      } catch (err) {
        flaskProcess.kill('SIGKILL');
        console.log('Flask server forcefully terminated with SIGKILL');
        app.quit();
      }
    } else {
      app.quit();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: { nodeIntegration: true, contextIsolation: false, devTools: true, webSecurity: false },
    autoHideMenuBar: true,
    show: false,
  });

  const startUrl = 'http://127.0.0.1:5000';
  mainWindow.loadURL(startUrl).catch((err) => {
    console.error(`Failed to load URL: ${err.message}`);
    setTimeout(() => mainWindow.loadURL(startUrl), 2000);
  });
  console.log('Main window loaded with URL:', startUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.executeJavaScript(`window.dispatchEvent(new Event('forceReactRerender'));`).catch((err) => console.error('Failed to execute JS:', err));
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== 'http://127.0.0.1:5000') {
      event.preventDefault();
      mainWindow.loadURL(startUrl);
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Load failed: ${errorCode} - ${errorDescription}`);
    setTimeout(() => mainWindow.loadURL(startUrl), 2000);
  });

  mainWindow.on('closed', () => (mainWindow = null));
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.on('checking-for-update', () => console.log('Checking for updates...'));
  autoUpdater.on('update-available', (info) => console.log('Update available:', info.version));
  autoUpdater.on('update-not-available', () => console.log('No update available.'));
  autoUpdater.on('download-progress', (progress) => console.log(`Download progress: ${progress.percent}%`));
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', (err) => console.error('Auto-update error:', err.message));
  autoUpdater.checkForUpdates().catch((err) => console.error('Failed to check for updates:', err.message));
}

ipcMain.on('open-print-preview', (event, content) => {
  if (printPreviewWindow) printPreviewWindow.close();
  printPreviewWindow = new BrowserWindow({ width: 600, height: 800, parent: mainWindow, modal: true, webPreferences: { nodeIntegration: true, contextIsolation: false }, autoHideMenuBar: true });
  const htmlContent = `<html><head><title>Print Preview</title><style>body { margin: 0; padding: 20px; font-family: Arial, sans-serif; } .print-container { width: 80mm; margin: auto; } @media print { body { margin: 0; } .print-container { margin: 0; } .no-print { display: none; } }</style></head><body><div class="print-container">${content}</div><div class="no-print" style="text-align: center; margin-top: 20px;"><button onclick="window.print()">Print</button><button onclick="window.close()" style="margin-left: 10px;">Close</button></div></body></html>`;
  printPreviewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  printPreviewWindow.on('closed', () => {
    printPreviewWindow = null;
    event.reply('print-preview-response', { success: true });
    if (mainWindow) mainWindow.focus();
  });
});

ipcMain.on('send-email', async (event, emailContent) => {
  try {
    await isFlaskServerRunning();
    const response = await axios.post('http://127.0.0.1:5000/api/send-email', emailContent, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
    event.sender.send('email-response', { success: response.data.success, message: response.data.message });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error('Email sending failed:', errorMessage);
    event.sender.send('email-response', { success: false, error: errorMessage });
  }
});

ipcMain.on('reload-page', async () => {
  if (mainWindow) {
    try {
      await isFlaskServerRunning();
      mainWindow.reload();
      mainWindow.focus();
    } catch (err) {
      console.error('Flask server not running during reload:', err);
      setTimeout(() => mainWindow.loadURL('http://127.0.0.1:5000'), 2000);
    }
  }
});

app.whenReady().then(() => {
  console.log('App is ready, starting MongoDB...');
  startMongoDB().then(() => {
    console.log('MongoDB started, waiting 5 seconds before checking Flask...');
    setTimeout(() => {
      isFlaskServerRunning().then(() => {
        console.log('Flask server already running');
        createWindow();
        if (autoUpdater) setupAutoUpdater();
      }).catch(() => {
        console.log('Starting Flask server...');
        startFlaskServer();
        setTimeout(() => {
          isFlaskServerRunning().then(() => {
            console.log('Flask server started successfully');
            createWindow();
            if (autoUpdater) setupAutoUpdater();
          }).catch((err) => {
            console.error(`Failed to start Flask: ${err.message}`);
            app.quit();
          });
        }, 5000);
      });
    }, 5000);
  }).catch((err) => {
    console.error(`MongoDB startup failed: ${err.message}`);
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});



if __name__ == "__main__":
    start_scheduler()
    create_backup()
    logger.info("Starting Flask server on http://127.0.0.1:5000")
    if getattr(sys, 'frozen', False):
        logger.info("Running in frozen mode with Waitress")
        waitress.serve(app, host='0.0.0.0', port=5000, threads=8)
    else:
        logger.info("Running in development mode")
        app.run(host='0.0.0.0', port=5000, debug=True)