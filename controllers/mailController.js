const mailin = require("mailin");

exports.startMailServer = () => {
	mailin.start({
		port: 25,
		disableWebhook: true
	});
};

mailin.on("message", function(connection, data, content) {
	console.log(data);
});
