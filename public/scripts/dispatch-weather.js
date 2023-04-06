$(function () {
	function updateTimeline(data) {
		var hours = data.hourly;

		new Timeline($("#timeline"), {
			width: $(".right").width(),
			label_width: 100,
			hour_spacing: 3,
			units: "us",
			reversed: false,
			format24: false,
			conditionStrs: {
				clear: "clear",
				"light-clouds": "partly cloudy",
				"heavy-clouds": "overcast",
				"medium-rain": "rain",
				"very-light-rain": "drizzle",
				"light-rain": "light rain",
				"heavy-rain": "heavy rain",
				"medium-sleet": "sleet",
				"very-light-sleet": "light sleet",
				"light-sleet": "light sleet",
				"heavy-sleet": "heavy sleet",
				"medium-snow": "snow",
				"very-light-snow": "flurries",
				"light-snow": "light snow",
				"heavy-snow": "heavy snow",
			},
		}).load(hours, -5);
	}

	function updateCurrentText(data) {
		var currently = data.current;

		// $("#summary").text(data.hourly.summary);

		$("#currentDetails .temperature .num").text(currently.temp.toFixed());
		$("#currentDetails .feels_like .num").text(
			currently.feels_like.toFixed()
		);
		$("#currentDetails .wind .num").text(currently.wind_speed.toFixed());
		if (currently.wind_speed >= 32) {
			$("#currentDetails .wind .val").css("color", "red");
			$("#currentDetails .wind .val").css("font-weight", "bold");
		}
		$("#currentDetails .wind .direction").css(
			"transform",
			`rotate(${currently.wind_deg}deg)`
		);
		$("#currentDetails .clouds .num").text(currently.clouds.toFixed());
		$("#currentDetails .humidity .num").text(currently.humidity.toFixed());
		$("#currentDetails .dew_point .num").text(
			currently.dew_point.toFixed()
		);
		$("#currentDetails .uv_index .num").text(currently.uvi);
		$("#currentDetails .visibility .num").text(
			(currently.visibility * 0.00062137).toFixed(2)
		);
	}

	function updateAlerts(alerts) {
		if (!alerts) {
			$("#weather").removeClass("condensed");
			$("#weather-alerts").addClass("hide");
			$("#weather-alerts").html("");
			return;
		}
		$("#weather").addClass("condensed");
		$("#weather-alerts").html("");
		alerts.forEach(function (alert) {
			$("#weather-alerts").append(`
				<div class="weather-alert col">
                	<div class="alert-title font-weight-bold text-danger">${
						alert.event
					}</div>
	                <div class="times">
		                <div class="expires-at small d-inline-block">Expires ${moment(
							alert.end * 1000
						).format("ddd MMM Do h:mma")}</div>
					</div>
	                <div class="description clearfix small font-italic text-muted">${
						alert.description
					}</div>
                </div>
			`);
		});
		$("#weather-alerts").removeClass("hide");
	}

	function getWeather() {
		$.get("/api/weather", function (data) {
			updateTimeline(data);
			updateCurrentText(data);
			updateAlerts(data.alerts);
		});
	}

	getWeather();
	var runWeather = window.setInterval(getWeather, 660000);
});
