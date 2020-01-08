const logger = require("./logger.js");

// import environmental variables from our variables.env file
require("dotenv").config({ path: ".env" });

// Start our app!
const app = require("./app");
app.set("port", process.env.PORT || 7777);
const server = app.listen(app.get("port"), () => {
	logger.info(`Express running → PORT ${server.address().port}`);
});

// Attach socketio
const io = require("socket.io").listen(server);
app.set("socketio", io);


