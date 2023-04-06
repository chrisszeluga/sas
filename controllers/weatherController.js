const cachios = require("cachios");
const axios = require("axios");

const darkskyKey = process.env.DARK_SKY;

// New caching instance
const cachiosInstance = cachios.create(
	axios.create({
		timeout: 10000,
	})
);

const getWeatherData = async () => {
	const response = await cachiosInstance.get(
		`https://api.openweathermap.org/data/3.0/onecall?lat=39.04698&lon=-77.05028&exclude=minutely,daily&units=imperial&appid=${darkskyKey}`,
		{
			ttl: 600,
		}
	);

	return response.data;
};

exports.getWeatherJson = async (req, res) => {
	res.json(await getWeatherData());
};
