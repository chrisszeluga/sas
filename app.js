const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const routes = require("./routes/index");
const helpers = require("./helpers");
const errorHandlers = require("./handlers/errorHandlers");
const multer = require("multer")();
const morgan = require("morgan");
const logger = require("./logger.js");

const app = express();

// logs
// app.use(morgan("combined", { stream: logger.stream }));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// serves up static files from the public folder. Anything in public/ will just be served up as the file it is
app.use(express.static(path.join(__dirname, "public")));

// Takes the raw requests and turns them into usable properties on req.body
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer.array());

// pass variables to our templates + all requests
app.use((req, res, next) => {
	res.locals.h = helpers;
	res.locals.currentPath = req.path;
	next();
});

app.use("/", routes);

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

if (app.get("env") === "development") {
	/* Development Error Handler - Prints stack trace */
	app.use(errorHandlers.developmentErrors);
}

// production error handler
app.use(errorHandlers.productionErrors);

module.exports = app;
