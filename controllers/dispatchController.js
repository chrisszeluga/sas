const logger = require("../logger.js");

const parseCall = msg => {
	// Expecting a string in this format:
	// CAD MSG: F1900154598 * TROUBLE BREATHING - ALS1 * 8206 GEORGIA AVE * SILVER SPRING PRI MOVE * Box Area: 0102 * X/Y: 39.03009608 / -77.03256077 * Units: PE701, M701, FS01
	if (!msg) {
		return;
	}
	if (msg.indexOf("CAD MSG") == -1) {
		return;
	}

	let msgSplit = msg.split(" * ");
	let msgLength = msgSplit.length;

	let box = "";
	let xy = null;
	let addressLen = 4;
	let tg = null;

	// The talkgroup is included in some cases. Therefore, we need to look one element prior for the box
	// and edit the address field length
	if (msgSplit[msgLength - 2].includes("TG")) {
		box = msgSplit[msgLength - 4].replace("Box Area: ", "");
		xy = msgSplit[msgLength - 3].replace("X/Y: ", "");
		tg = msgSplit[msgLength - 2].replace("TG: ", "");
		addressLen = 5;
	} else {
		box = msgSplit[msgLength - 3].replace("Box Area: ", "");
		xy = msgSplit[msgLength - 2].replace("X/Y: ", "");
	}

	if (xy != null) {
		xycomps = xy.split(" / ");
		lat = xycomps[0];
		lon = xycomps[1];
	}

	let call = {
		incident: msgSplit[0].split(" ")[2],
		type: msgSplit[1],
		// prettier-ignore
		units: msgSplit[msgLength - 1]
			.replace(/(, FS)\w\w/, "")
			.replace(/(, ECC)\w/, "")
			.replace(/(, ZALRT)\w/, "")
			.replace(/(, CEALRM)/, "")
			.replace(/(, CWEMS)/, "")
			.replace(/(, CWFULL)/, "")
			.replace("Units: ", ""),
		box: box,
		lat: lat,
		lon: lon,
		tg: tg
	};

	let location = [];
	for (let i = 2; i <= msgLength - addressLen; i++) {
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

	let reqBody = JSON.stringify(req.body);

	// Expects incoming request body to be a multi-part form data object,
	// like the one produced from AWS SES Incoming Mail Functions.
	// Regex is custom to match MCEN's email HTML template.
	let callString = reqBody
		.replace(/(\\r\\n|\\n|\\r|=)/gm, "")
		.replace(/(\\)/gm, "")
		.match(/<p> (.*)<\/p>/gm)[0]
		.replace("<p> ", "")
		.replace("</p>", "");

	const units = [
		"A742",
		"M742",
		"A742B",
		"M742B",
		"A742C",
		"M742C",
		"A742D",
		"M742D",
		"A742E",
		"M742E",
		"A742F",
		"M742F",
		"ALS742",
		"ALS742B",
		"RS742",
		"RS742B",
		"PRS742",
		"PRS742B",
		"UTV742",
		"BUTV742",
		"RD2"
	];
	if (
		units.some(function(v) {
			return callString.indexOf(v) >= 0;
		})
	) {
		const newCall = parseCall(callString);
		logger.info("server.call.new", newCall);
		io.emit("new call", newCall);
	}

	res.send({});
};
