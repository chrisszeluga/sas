const parseCall = msg => {
	// Expecting a string in this format:
	// CAD MSG: F1900154598 * TROUBLE BREATHING - ALS1 * 8206 GEORGIA AVE * SILVER SPRING PRI MOVE * Box Area: 0102 * Units: PE701, M701, FS01
	if (!msg) {
		return;
	}
	if (msg.indexOf("CAD MSG") == -1) {
		return;
	}

	let msgSplit = msg.split(" * ");
	let msgLength = msgSplit.length;

	let call = {
		incident: msgSplit[0].split(" ")[2],
		type: msgSplit[1],
		// prettier-ignore
		units: msgSplit[msgLength - 1]
			.replace(/(, FS)\w\w/, "")
			.replace(/(, ECC)\w/, "")
			.replace("Units: ", ""),
		box: msgSplit[msgLength - 2].replace("Box Area: ", "")
	};

	let location = [];
	for (let i = 2; i <= msgLength - 3; i++) {
		location.push(msgSplit[i]);
	}
	call["address"] = location;

	call["time"] = new Date();

	return call;
};

exports.getDispatches = async (req, res) => {
	res.render("dispatch");
};

exports.broadcastDispatch = async (req, res) => {
	let io = req.app.get("socketio");

	console.log(req.body);

	//io.emit("new call", parseCall(req.body));
	res.send({});
};
