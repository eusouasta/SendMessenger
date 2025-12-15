const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

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
}

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

// Do not quit when all windows are closed (because we might be hidden)
app.on('window-all-closed', () => {
    // on macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        // We do NOT quit here anymore, user must use Tray -> Encerrar
    }
});
