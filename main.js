const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure Auto Updater Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Set User Data Path for Server before requiring it
process.env.USER_DATA_PATH = app.getPath('userData');

// Start the Backend Server
// This effectively runs the node script in the background of the Electron App
require('./server/index.js');

let tray = null;
let isQuitting = false;

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        title: 'SendMessenger Pro',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false // Keep running in background
        },
        icon: path.join(__dirname, 'build/icon.png'),
        autoHideMenuBar: true
    });

    // Load the App
    // Since we start the server on 3001, we load localhost
    // The server is configured to serve the 'dist' files as static
    setTimeout(() => {
        win.loadURL('http://localhost:3001');
    }, 1500); // Give Express a moment to bind

    // Auto Updater Events
    autoUpdater.on('checking-for-update', () => {
        win.webContents.send('update_status', 'Checking for update...');
    });
    autoUpdater.on('update-available', (info) => {
        win.webContents.send('update_status', 'Update available.');
    });
    autoUpdater.on('update-not-available', (info) => {
        win.webContents.send('update_status', 'Update not available.');
    });
    autoUpdater.on('error', (err) => {
        win.webContents.send('update_status', 'Error in auto-updater. ' + err);
    });
    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        win.webContents.send('update_status', log_message);
    });
    autoUpdater.on('update-downloaded', (info) => {
        win.webContents.send('update_status', 'Update downloaded');
        // Optional: Ask user to restart
        // dialog.showMessageBox({
        //   type: 'info',
        //   title: 'Update Ready',
        //   message: 'Install and restart now?',
        //   buttons: ['Yes', 'Later']
        // }).then((buttonIndex) => {
        //   if (buttonIndex.response === 0) autoUpdater.quitAndInstall(false, true);
        // });
    });

    // Validar check updates once window is ready
    win.once('ready-to-show', () => {
        autoUpdater.checkForUpdatesAndNotify();
    });

    // Prevent new windows from opening (target="_blank" fixes)
    win.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'deny' };
    });

    // Handle Close (Minimize to Tray)
    win.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            win.hide();
            return false;
        }
    });

    return win;
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();

        // Setup Tray
        const iconPath = path.join(__dirname, 'build/icon.png');
        tray = new Tray(iconPath);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Abrir SendMessenger', click: () => {
                    const win = BrowserWindow.getAllWindows()[0];
                    if (win) {
                        win.show();
                        win.focus();
                    } else {
                        createWindow();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Encerrar', click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('SendMessenger Pro');
        tray.setContextMenu(contextMenu);

        tray.on('double-click', () => {
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
                win.show();
                win.focus();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    // Manual Update Check IPC
    ipcMain.on('check_for_updates', () => {
        autoUpdater.checkForUpdates();
    });

    // Restart App IPC
    ipcMain.on('restart_app', () => {
        autoUpdater.quitAndInstall();
    });

    // Do not quit when all windows are closed (because we might be hidden)
    app.on('window-all-closed', () => {
        // on macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            // We do NOT quit here anymore, user must use Tray -> Encerrar
        }
    });
