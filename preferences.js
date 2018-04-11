const {dialog} = require('electron').remote
const mainProcess = require('electron').remote.require('./main');
const settings = require('electron').remote.require('electron-settings')
var path = require('path')

function openDialog() {
	var result = dialog.showOpenDialog({properties: ['openFile']})

	if(result) {
		filepath = result[0]
		filename = path.basename(filepath)
		document.getElementById("label").querySelector("span").innerHTML = filename
		save = document.getElementById("save")
		message = document.getElementById("message")
		save.classList.remove("disabled")

		save.addEventListener("click", function() {
			settings.set("default", {
				"path":filepath
			})

			message.style.opacity = 1;
			setTimeout(function() {
				message.style.opacity = 0;
			}, 3000);
		})
	}
}

var back = document.getElementById("back")
back.addEventListener("click", function() {
	mainProcess.loadIndex();
})
