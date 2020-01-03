const parseCall = msg => {
	// Expecting a string in this format:
	// CAD MSG: F1900154598 * TROUBLE BREATHING - ALS1 * 8206 GEORGIA AVE * SILVER SPRING PRI MOVE * Box Area: 0102 * Units: PE701, M701, FS01
	if (!msg) {
		return;
	}
	if (msg.indexOf("CAD MSG") == -1) {
		return;
	}

	var msgSplit = msg.split(" * ");
	var msgLength = msgSplit.length;

	var call = {
		incident: msgSplit[0].split(" ")[2],
		type: msgSplit[1],
		units: msgSplit[msgLength - 1].replace("Units: ", ""),
		box: msgSplit[msgLength - 2].replace("Box Area: ", "")
	};

	var location = [];
	for (var i = 2; i <= msgLength - 3; i++) {
		location.push(msgSplit[i]);
	}
	call["address"] = location;

	var today = new Date();
	var time =
		today.getHours() -
		5 +
		":" +
		(today.getMinutes() < 10 ? "0" : "") +
		today.getMinutes();

	call["time"] = time;

	return call;
};

exports.getDispatches = async (req, res) => {
	res.render("dispatch");
};

exports.broadcastDispatch = async (req, res) => {
	let io = req.app.get("socketio");

	io.emit("new call", parseCall(req.body));
	res.send({});
};
