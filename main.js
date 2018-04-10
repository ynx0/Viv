const {app, BrowserWindow, Menu, globalShortcut, ipcMain, dialog} = require('electron');

const settings = require('electron-settings');
const robot = require('robotjs');
const fs = require('fs');

/* Variables */
let mainWindow;

global.fileName;

/* Boolean: if keybinds are active */
global.keysActive = true;

/* By default toggle is \ */
global.toggle = {"keybind":"\\", "action":"toggle"};

global.rows = [];
var keys = [];
global.commands = [];

/* This is shitty but good enough for now */
var keyboard = ["backspace", "delete", "enter", "tab", "escape", "up", "down", "right", "left", "home", "end", "pageUp", "pageDown", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12", "command", "alt", "control", "shift", "right_shift", "space", "audio_mute", "audio_vol_down", "audio_vol_up", "audio_play", "audio_stop", "audio_pause", "audio_prev", "audio_next", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "`", "\\", "/", "]", "[", "-", "=", ",", "." ];

var actions = ["rightclick", "move", "click", "toggle"];

/* _____________________________________________
 * ________________FUNCTIONS____________________
 * _____________________________________________
 */

const parseKeybind = function(s) {

  /* In case keybinds are strung together */
  /* ie: Command+Shift+Down+9             */
  var split = s.split("+");

  for(var string of split) {

    /* Check keybind is supported */
    if(keyboard.indexOf(string.toLowerCase()) == -1)
      throw "[parseKeybind]: Keybind not supported";

    /* Check keybind not already used */
    if(keys.indexOf(string) != -1 || string == toggle["keybind"])
      throw "[parseKeybind]: Keybind already used";
  }

  return s;

}

const parseAction = function(arr) {

  arr.splice(0, 1);

  /* Action not supported */
  if(actions.indexOf(arr[0]) == -1)
    throw "[parseAction]: Unsupported action found.";
  else
    return arr;

}

const lineIsComment = function(line) {
  if(line.trim().charAt(0) == "#")
    return true;
  else
    return false;
}

const parseFile = function(content) {
  var lines = content.split("\n");
  var command, keybind, action;

  /* Loop through each line: parse command into object */
  for(var i = 0; i < lines.length; i++) {
    if(!lines[i] || lines[i] == "")
      continue;

    /* Line is not empty, parse command */
    if(lineIsComment(lines[i])) {
      rows.push({"type":"comment", "value":lines[i]});
      continue;
    } else
      var tmp = lines[i].split(" ");

    try {
      keybind = parseKeybind(tmp[0]);
      action = parseAction(tmp);
    } catch (error) {
      console.log("ERROR: " + error);
      continue;
    }

    /* If action is move, store x/y */
    if(action.length > 1) {
      command = {
        keybind : keybind,
        action : action[0],
        x : parseInt(action[1]),
        y : parseInt(action[2])
      };
    } else {
      command = {
        keybind : keybind,
        action : action[0]
      };
    }

    /* Toggle must be handled seperately */
    /* so that it is never unregistered  */
    if(action == "toggle")
      toggle = command;
    else {

      /* Update list of keybinds in use */
      keys.push(command["keybind"]);

      /* Add command to list of commands */
      commands.push(command);

      rows.push({"type":"command", "value":command});
    }
  }
}

const reset = function() {
  /* Reset variables in main */
  toggle = {"keybind":"\\", "action":"toggle"};
  rows = [];
  commands = [];
  keys = [];
  keysActive = true;

  /* Reset all shortcuts including toggler */
  globalShortcut.unregisterAll();

  /* Reset table in renderer */
  mainWindow.webContents.executeJavaScript('resetTable()');

}

const openFile = function(path) {

  /* Reset state */
  reset();

  /* Read in file and parse */
  var content = fs.readFileSync(path).toString();
  parseFile(content);

  /* Register the parsed keybinds */
  registerAll();

  /* Register the toggle key */
  globalShortcut.register(toggle["keybind"], function() {
    if(keysActive) {
      unregisterAll();
    } else {
      registerAll();
    }

    keysActive = !keysActive;
    mainWindow.webContents.send('keysToggle', keysActive);
  });

  /* Setup complete, print keybind table */
  mainWindow.webContents.executeJavaScript('printTable()');


}

const registerKey = function(command) {
  globalShortcut.register(command["keybind"], function() {
    mainWindow.webContents.send('command', command);
  });
}

const registerAll = function() {

  /* Register user keys */
  for(var i = 0; i < commands.length; i++) {
    registerKey(commands[i]);
  }

}

const unregisterAll = function() {

  for(var s of keys) {
    globalShortcut.unregister(s);
  }

}

const toggler = function(state) {
  keysActive = state;
}

exports.toggler = toggler;
exports.unregisterAll = unregisterAll;
exports.registerAll = registerAll;
exports.openFile = openFile;


/* _____________________________________________
 * ________________INITIALIZE___________________
 * _____________________________________________
 *


/* Setup main window */
app.on('ready', function() {

  mainWindow = new BrowserWindow({
    width: 960,
    height: 544,
    frame: false,
    x: 0,
    y: 0,
    title: 'viv',
    icon: './app-icon.icns'
  });

  if(settings.has('default')) {
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    openFile(settings.get('default'));
  } else {
    mainWindow.loadURL('file://' + __dirname + '/preferences.html');
  }

  var application_menu = [
    {
      label: 'File',
      submenu: [
        {
          type: 'separator'
        },
        {
          label: 'Close Window',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        },
        {
          label: 'Minimize Window',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        }
      ]
    }
  ];

  if (process.platform == 'darwin') {
    const name = app.getName();
    application_menu.unshift({
      label: name,
      submenu: [
        {
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide ' + name,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => { app.quit(); }
        },
      ]
    });
  }

  menu = Menu.buildFromTemplate(application_menu);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

});


/* Handle window closing and graceful exits */

app.on('window-all-closed', () => {
  //if (process.platform != 'darwin')
    app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
})
