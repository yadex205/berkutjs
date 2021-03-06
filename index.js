'use strict'

if (process.platform === 'win32') {
    process.env['VLC_PLUGIN_PATH'] = require('path').join(
        __dirname,
        'node_modules/wcjs-prebuilt/bin/plugins'
    )
}

const electron = require('electron')
const {app} = electron
const {BrowserWindow} = electron
const {ipcMain} = electron
const useExperimentalCanvasFeature = false

if (process.platform === 'darwin') {
    app.commandLine.appendSwitch('enable-unsafe-es3-apis')
}

global.dashboardWindow
let outputWindow

function createWindow () {
    global.dashboardWindow = new BrowserWindow({
        width: 1024,
        minWidth: 1024,
        height: 700,
        minHeight: 700,
        webPreferences: {
            experimentalCanvasFeatures: useExperimentalCanvasFeature
        }
    })
    outputWindow = new BrowserWindow({
        width: 960,
        height: 540,
        autoHideMenuBar: true,
        webPreferences: {
            experimentalCanvasFeatures: useExperimentalCanvasFeature
        }
    })

    global.dashboardWindow.loadURL(`file://${__dirname}/htdocs/index.html`)
    outputWindow.loadURL(`file://${__dirname}/htdocs/output.html`)
    ipcMain.on('berkut-output:updated', (event, pid, address, width, height) => {
        outputWindow.webContents.send('berkut-output:updated', pid, address, width, height)
    })
    app.on('closed', () => {
        global.dashboardWindow = null
        quit()
    })
}

function quit() {
    global.playerManager.reset(true)
    app.quit()
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    switch(process.platform) {
    case 'darwin': quit()
    }
})

app.on('activate', (global.dashboardWindow === null) ? createWindow : ()=>{})
