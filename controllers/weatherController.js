const cachios = require("cachios");
const axios = require("axios");

const darkskyKey = process.env.DARK_SKY;

// New caching instance
const cachiosInstance = cachios.create(
	axios.create({
		timeout: 10000
	})
);

const getWeatherData = async () => {
	const response = await cachiosInstance.get(
		`https://api.darksky.net/forecast/${darkskyKey}/39.04698,-77.05028?exclude=minutely,daily`,
		{
			ttl: 600
		}
	);

	return response.data;
};

exports.getWeatherJson = async (req, res) => {
	res.json(await getWeatherData());
};
