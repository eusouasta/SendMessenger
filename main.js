const { app, BrowserWindow } = require('electron');
const path = require('path');

// Set User Data Path for Server before requiring it
process.env.USER_DATA_PATH = app.getPath('userData');

// Start the Backend Server
// This effectively runs the node script in the background of the Electron App
require('./server/index.js');

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
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
