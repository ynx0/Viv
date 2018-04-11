const {app, BrowserWindow, Menu, MenuItem, globalShortcut, ipcMain, dialog} = require('electron')

const url = require('url')
const path = require('path')
const settings = require('electron-settings')
const robot = require('robotjs')
const fs = require('fs')

/* Variables */
let win

global.fileName

/* Boolean: if keybinds are active */
global.keysActive = true

/* By default toggle is \ */
global.toggle = {"keybind":"\\", "action":"toggle"}

global.rows = []
var keys = []
global.commands = []

/* This is shitty but good enough for now */
var keyboard = ["backspace", "delete", "enter", "tab", "escape", "up", "down", "right", "left", "home", "end", "pageUp", "pageDown", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12", "command", "alt", "control", "shift", "right_shift", "space", "audio_mute", "audio_vol_down", "audio_vol_up", "audio_play", "audio_stop", "audio_pause", "audio_prev", "audio_next", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "`", "\\", "/", "]", "[", "-", "=", ",", "." ]

var actions = ["rightclick", "move", "click", "toggle"]

/* _____________________________________________
 * ________________FUNCTIONS____________________
 * _____________________________________________
 */

const parseKeybind = function(s) {

  /* In case keybinds are strung together */
  /* ie: Command+Shift+Down+9             */
  var split = s.split("+")

  for(var string of split) {

    /* Check keybind is supported */
    if(keyboard.indexOf(string.toLowerCase()) == -1)
      throw "[parseKeybind]: Keybind not supported"

    /* Check keybind not already used */
    if(keys.indexOf(string) != -1 || string == toggle["keybind"])
      throw "[parseKeybind]: Keybind already used"
  }

  return s

}

const parseAction = function(arr) {

  arr.splice(0, 1)

  /* Action not supported */
  if(actions.indexOf(arr[0]) == -1)
    throw "[parseAction]: Unsupported action found."
  else
    return arr

}

const lineIsComment = function(line) {
  if(line.trim().charAt(0) == "#")
    return true
  else
    return false
}

const parseFile = function(content) {
  var lines = content.split("\n")
  var command, keybind, action

  /* Loop through each line: parse command into object */
  for(var i = 0; i < lines.length; i++) {
    if(!lines[i] || lines[i] == "")
      continue

    /* Line is not empty, parse command */
    if(lineIsComment(lines[i])) {
      rows.push({"type":"comment", "value":lines[i]})
      continue
    } else
      var tmp = lines[i].split(" ")

    try {
      keybind = parseKeybind(tmp[0])
      action = parseAction(tmp)
    } catch (error) {
      console.log("ERROR: " + error)
      continue
    }

    /* If action is move, store x/y */
    if(action.length > 1) {
      command = {
        keybind : keybind,
        action : action[0],
        x : parseInt(action[1]),
        y : parseInt(action[2])
      }
    } else {
      command = {
        keybind : keybind,
        action : action[0]
      }
    }

    /* Toggle must be handled seperately */
    /* so that it is never unregistered  */
    if(action == "toggle")
      toggle = command
    else {

      /* Update list of keybinds in use */
      keys.push(command["keybind"])

      /* Add command to list of commands */
      commands.push(command)

      rows.push({"type":"command", "value":command})
    }
  }
}

const reset = function() {
  /* Reset variables in main */
  toggle = {"keybind":"\\", "action":"toggle"}
  rows = []
  commands = []
  keys = []
  keysActive = true

  /* Reset all shortcuts including toggler */
  globalShortcut.unregisterAll()

  /* Reset table in renderer */
  win.webContents.executeJavaScript('resetTable()')

}

const openFile = function(path) {

  fileName = path

  /* Reset state */
  reset()

  /* Read in file and parse */
  var content = fs.readFileSync(path).toString()
  parseFile(content)

  /* Register the parsed keybinds */
  registerAll()

  /* Register the toggle key */
  globalShortcut.register(toggle["keybind"], function() {
    if(keysActive) {
      unregisterAll()
    } else {
      registerAll()
    }

    keysActive = !keysActive
    win.webContents.send('keysToggle', keysActive)
  })

  /* Setup complete, print keybind table */
  win.webContents.executeJavaScript('printTable()')


}

const registerKey = function(command) {
  globalShortcut.register(command["keybind"], function() {
    win.webContents.send('command', command)
  })
}

const registerAll = function() {

  /* Register user keys */
  for(var i = 0; i < commands.length; i++) {
    registerKey(commands[i])
  }

}

const unregisterAll = function() {

  for(var s of keys) {
    globalShortcut.unregister(s)
  }

}

const toggler = function(state) {
  keysActive = state
}

const loadIndex = function() {
  win.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))
  openFile(settings.get("default.path"))
}

exports.loadIndex = loadIndex
exports.toggler = toggler
exports.unregisterAll = unregisterAll
exports.registerAll = registerAll
exports.openFile = openFile


/* _____________________________________________
 * ________________INITIALIZE___________________
 * _____________________________________________
 */

  const template = [
    {
      label: 'View',
      submenu: [
        {role: 'reload'},
        {role: 'forcereload'},
        {role: 'toggledevtools'},
      ]
    },
    {
      role: 'window',
      submenu: [
        {role: 'minimize'},
        {role: 'close'}
      ]
    }
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {
          label: 'Preferences',
          accelerator: 'Cmd+,',
          click: () => {
            unregisterAll()
            win.loadURL(url.format({
              pathname: path.join(__dirname, 'preferences.html'),
              protocol: 'file:',
              slashes: true
            }))
          }
        },
        {type: 'separator'},
        {role: 'services', submenu: []},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
    })
  }




/* Setup main window */
function createWindow () {

  win = new BrowserWindow({
    width: 960,
    height: 544,
    frame: false,
    x: 0,
    y: 0,
    title: 'viv',
    icon: './app-icon.icns'
  })

  let webContents = win.webContents
  webContents.on('did-finish-load', () => {
    webContents.setZoomFactor(1)
    webContents.setVisualZoomLevelLimits(1, 1)
    webContents.setLayoutZoomLevelLimits(0, 0)
  })

  webContents.on('new-window', function(event, url){
    event.preventDefault()
    open(url)
  })

  if(settings.has('default.path')) {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    }))
    fileName = settings.get('default.path')
    openFile(settings.get('default.path'))
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'preferences.html'),
      protocol: 'file:',
      slashes: true
    }))
  }

  win.webContents.on('will-navigate', ev => {
    ev.preventDefault()
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  win.on('closed', () => {
    win = null
  })

}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
