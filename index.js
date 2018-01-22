const {ipcRenderer, remote} = require('electron');
const robot = require('robotjs');
const mainProcess = remote.require('./main');

const notify = function(keysActive) {
  var n = {title: "viv", body: "Keybinds toggled "};

  if(keysActive)
    n.body = n.body + "ON";
  else
    n.body = n.body + "OFF";

  new Notification("viv", n);
}

const click = function() {
  robot.mouseClick();
}

const rightclick = function() {
  robot.mouseClick("right");
}

const move = function(x, y) {
  var mouse = robot.getMousePos();
  robot.moveMouse(mouse.x + x, mouse.y + y);
}


/* Handlers */

ipcRenderer.on('command', function(arg, command) {
  switch(command["action"]) {
    case "click":
      click();
      break;
    case "rightclick":
      rightclick();
      break;
    case "move":
      move(command["x"], command["y"]);
      break;
    default:
      break;
  }
});

/* Handle toggle */
ipcRenderer.on('keysToggle', function(arg, keysActive) {
  updateIcon(keysActive);
  notify(keysActive);
});

/* Display the table */
ipcRenderer.on('printTable', function(arg, commands) {
  printTable();
});


/* _____________________________________________
 * _____________TABLE FUNCTIONS_________________
 * _____________________________________________
 */

var fileName = document.getElementById("fileName")
var table = document.getElementById("tableInsert");

const parseDirection = function(x, y) {
  if(x > 0)
    return "right";
  if(x < 0)
    return "left";
  if(y > 0)
    return "down";
  if(y < 0)
    return "up";
}

const parseAmount = function(direction, x, y) {
  if(direction == "up" || direction == "down")
    return Math.abs(y);
  else
    return Math.abs(x);
}

const printTable = function() {

  var rows = remote.getGlobal('rows');
  var commands = remote.getGlobal('commands');
  var toggle = remote.getGlobal('toggle');

  var row = table.insertRow(0);
  var action_th = document.createElement('th');
  var keybind_th = document.createElement('th');

  var action_cell, keybind_cell;

  /* Table Headers */
  action_th.innerHTML = "Action";
  keybind_th.innerHTML = "Keybind";
  row.appendChild(action_th);
  row.appendChild(keybind_th);

  /* Table Rows */
  for(var entry of rows) {
    row = table.insertRow(-1);
    action_cell = row.insertCell(0);
    keybind_cell = row.insertCell(1);

    /* Print a command line */
    if(entry["type"] == "command") {

      command = entry["value"];
      if(command["action"] == "move") {
        var direction = parseDirection(command["x"], command["y"]);
        var amount = parseAmount(direction, command["x"], command["y"]);

        action_cell.innerHTML = command["action"]+" <span class='details'><i class='fa fa-caret-"+direction+" icon' aria-hidden='true'></i> "+amount;
      } else {
        action_cell.innerHTML = command["action"];
      }

      keybind_cell.innerHTML = command["keybind"];
    } else {

      /* Print a comment line */
      action_cell.innerHTML = entry["value"];
      row.className = "separator";
    }
  }

  /* Print toggle last */
  row = table.insertRow(-1);
  action_cell = row.insertCell(0);
  action_cell.innerHTML = "globals";
  row.className = "separator";

  row = table.insertRow(-1);
  action_cell = row.insertCell(0);
  keybind_cell = row.insertCell(1);
  action_cell.innerHTML = toggle["action"];
  keybind_cell.innerHTML = toggle["keybind"];

  /* Update current path name in bottom right */
  fileName.innerHTML = remote.getGlobal("fileName");

}

const resetTable = function() {
  table.innerHTML = "";
}


/* _____________________________________________
 * ________________PAUSE PLAY___________________
 * _____________________________________________
 */

 var icon = document.getElementById('pausePlayIcon');

document.getElementById('pausePlay').addEventListener("click", function() {

  /* Change icon and pause/play viv */
  if(icon.classList.contains('fa-pause')) {
    icon.classList.remove('fa-pause');
    icon.classList.add('fa-play');

    mainProcess.toggler(false);
    mainProcess.unregisterAll();
    notify(false);
  } else {
    icon.classList.add('fa-pause');
    icon.classList.remove('fa-play');

    mainProcess.toggler(true);
    mainProcess.registerAll();
    notify(true);
  }
});

const updateIcon = function(keysActive) {
  if(keysActive) {
    icon.classList.add('fa-pause');
    icon.classList.remove('fa-play');
  } else {
    icon.classList.remove('fa-pause');
    icon.classList.add('fa-play');

  }
}


/* _____________________________________________
 * ______________DRAG AND DROP__________________
 * _____________________________________________
 */

const importFile = function(path) {
  mainProcess.openFile(path);
}
