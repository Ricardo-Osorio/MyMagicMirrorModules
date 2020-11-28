Module.register("customweather", {
	// Default module config.
	defaults: {
		lat: null,
		lon: null,
		apiKey: "",
		units: config.units,
		updateInterval: 10 * 60 * 1000, // every 10 minutes
		animationSpeed: 1000,
		showWindDirection: true,
		showWindDirectionAsArrow: false,
		showHumidity: false,
		showRainChance: true,
		useBeaufort: true,
		useKMPHwind: false,
		lang: config.language,
		decimalSymbol: ".",
		degreeLabel: false,
		showFeelsLike: true,

		initialLoadDelay: 0, // 0 seconds delay
		retryDelay: 2500,

		apiVersion: "2.5",
		apiBase: "https://api.openweathermap.org/data/",
		weatherEndpoint: "onecall",

		onlyTemp: false,
		hideTemp: false,
		roundTemp: false,

		iconTable: {
			"01d": "wi-day-sunny",
			"02d": "wi-day-cloudy",
			"03d": "wi-cloudy",
			"04d": "wi-cloudy-windy",
			"09d": "wi-showers",
			"10d": "wi-rain",
			"11d": "wi-thunderstorm",
			"13d": "wi-snow",
			"50d": "wi-fog",
			"01n": "wi-night-clear",
			"02n": "wi-night-cloudy",
			"03n": "wi-night-cloudy",
			"04n": "wi-night-cloudy",
			"09n": "wi-night-showers",
			"10n": "wi-night-rain",
			"11n": "wi-night-thunderstorm",
			"13n": "wi-night-snow",
			"50n": "wi-night-alt-cloudy-windy"
		}
	},

	// Define required scripts.
	getScripts: function () {
		return ["moment.js"];
	},

	// Define required scripts.
	getStyles: function () {
		return ["weather-icons-wind.css", "weather-icons.css", "customweather.css"];
	},

	// Define start sequence.
	start: function () {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

		this.windSpeed = null;
		this.windDirection = null;
		this.windDeg = null;
		this.temperature = null;
		this.weatherType = null;
		this.feelsLike = null;
		this.loaded = false;
		this.chanceOfRainChange = 0
		this.chanceOfRainNextHour = 0
		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	// add extra information of current weather
	addExtraInfoWeather: function (wrapper) {
		var small = document.createElement("div");
		small.className = "bright medium";

		var windIcon = document.createElement("span");
		windIcon.className = "wi wi-strong-wind";
		small.appendChild(windIcon);

		var windSpeed = document.createElement("span");
		windSpeed.className = "extra-info-font-size"
		windSpeed.innerHTML = " " + this.windSpeed;
		small.appendChild(windSpeed);

		if (this.config.showWindDirection) {
			var windDirection = document.createElement("span");
			if (this.config.showWindDirectionAsArrow && this.windDeg !== null) {
				// add 90 to the angle as the icon used is not on
				// the right starting angle
				angle = this.windDeg + 90
				windDirection.innerHTML = ' <span style="display: inline-block; transform:rotate(' + angle + 'deg);">&#x27A4;</span>';
				// Using wind icons
				//windDirection.className = "wi wi-wind wi-from-" + this.windDirection
			} else {
				windDirection.innerHTML = this.windDirection;
			}
			small.appendChild(windDirection);
		}

		var spacer = document.createElement("span");
		spacer.innerHTML = "&nbsp;&nbsp;&nbsp;";
		small.appendChild(spacer);


		if (this.config.showHumidity) {
			var humidity = document.createElement("span");
			humidity.className = "extra-info-font-size"
			humidity.innerHTML = this.humidity;
			small.appendChild(humidity);

			var supspacer = document.createElement("sup");
			supspacer.innerHTML = "&nbsp;";
			small.appendChild(supspacer);

			var humidityIcon = document.createElement("span");
			humidityIcon.className = "wi wi-humidity humidityIcon";
			humidityIcon.innerHTML = "&nbsp;";
			small.appendChild(humidityIcon);
		}

		if (this.config.showRainChance) {
			var spacer = document.createElement("span");
			spacer.innerHTML = "&nbsp;&nbsp;";
			small.appendChild(spacer);

			var chanceOfRain = document.createElement("span");
			chanceOfRain.className = "extra-info-font-size"
			chanceOfRain.innerHTML = this.chanceOfRainNextHour
			small.appendChild(chanceOfRain);

			var chanceOfRainPercentage = document.createElement("span");
			chanceOfRainPercentage.innerHTML = "%"
			small.appendChild(chanceOfRainPercentage);

			// Display wether the chance of rainning
			// increases, decreases or maintains in the
			// next hour
			var changeOfRainChange = document.createElement("sup")
			if (this.chanceOfRainAfter > this.chanceOfRainNextHour) {
				changeOfRainChange.innerHTML = "&#x2197;"
			} else if (this.chanceOfRainAfter < this.chanceOfRainNextHour) {
				changeOfRainChange.innerHTML = "&#x2198;"
			}
			small.appendChild(changeOfRainChange);
		}

		wrapper.appendChild(small);
	},

	// Override dom generator.
	getDom: function () {
		var wrapper = document.createElement("div");
		wrapper.className = "large"

		if (this.config.apiKey === "") {
			wrapper.innerHTML = "API Key missing.";
			wrapper.className = "light small";
			return wrapper;
		}

		if (this.config.lat === "" || this.config.lon === "") {
			wrapper.innerHTML = "Coordinates missing.";
			wrapper.className = "light small";
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "light small";
			return wrapper;
		}

		if (this.config.onlyTemp === false) {
			this.addExtraInfoWeather(wrapper);
		}

		var large = document.createElement("div");
		large.className = "light";

		var degreeLabel = "";
		if (this.config.units === "metric" || this.config.units === "imperial") {
			degreeLabel += "°";
		}
		if (this.config.degreeLabel) {
			switch (this.config.units) {
				case "metric":
					degreeLabel += "C";
					break;
				case "imperial":
					degreeLabel += "F";
					break;
				case "default":
					degreeLabel += "K";
					break;
			}
		}

		if (this.config.decimalSymbol === "") {
			this.config.decimalSymbol = ".";
		}

		if (this.config.hideTemp === false) {
			var weatherIcon = document.createElement("span");
			weatherIcon.className = "weather-icon-font-size wi " + this.weatherType;
			large.appendChild(weatherIcon);

			var temperature = document.createElement("span");
			temperature.className = "custom-temperature"
			temperature.innerHTML = " " + this.temperature.replace(".", this.config.decimalSymbol);
			large.appendChild(temperature);

			var temperatureLabel = document.createElement("span");
			temperatureLabel.innerHTML = degreeLabel;
			large.appendChild(temperatureLabel);
		}

		wrapper.appendChild(large);

		if (this.config.showFeelsLike && this.config.onlyTemp === false) {
			var small = document.createElement("div");
			small.className = "medium";

			var feelsLike = document.createElement("span");
			feelsLike.innerHTML = "Feels like " + this.feelsLike + degreeLabel;
			small.appendChild(feelsLike);

			wrapper.appendChild(small);
		}

		return wrapper;
	},

	/* updateWeather
	 * Requests new data from openweather.org.
	 * Calls processWeather on succesfull response.
	 */
	updateWeather: function () {
		if (this.config.lat === "" || this.config.lon === "") {
			Log.error("Weather: Coordinates not set!");
			return;
		}

		if (this.config.apiKey === "") {
			Log.error("Weather: API Key not set!");
			return;
		}

		var url = this.config.apiBase + this.config.apiVersion + "/" + this.config.weatherEndpoint + this.getParams();
		var self = this;
		var retry = true;

		var weatherRequest = new XMLHttpRequest();
		weatherRequest.open("GET", url, true);
		weatherRequest.onreadystatechange = function () {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processWeather(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": Incorrect api key.");
					retry = true;
				} else {
					Log.error(self.name + ": Could not load weather.");
				}

				if (retry) {
					self.scheduleUpdate(self.loaded ? -1 : self.config.retryDelay);
				}
			}
		};
		weatherRequest.send();
	},

	/* getParam
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams: function () {
		var params = "?";
		if (this.config.lat && this.config.lon) {
			params += "lat=" + this.config.lat + "&lon=" + this.config.lon
		} else {
			this.hide(this.config.animationSpeed, { lockString: this.identifier });
			return;
		}

		params += "&exclude=minutely,alerts,daily"
		params += "&units=" + this.config.units;
		params += "&lang=" + this.config.lang;
		params += "&APPID=" + this.config.apiKey;

		return params;
	},

	/* processWeather(data)
	 * Uses the received data to set the various values.
	 *
	 * argument data object - Weather information received form openweather.org.
	 */
	processWeather: function (data) {
		if (!data || !data.current || !data.hourly) {
			Log.error("Weather: API request has no data!");
			return;
		}

		this.humidity = parseFloat(data.current.humidity);
		this.temperature = this.roundValue(data.current.temp);

		// If we make a request at 14h15 the
		// hourly forecast starts with the interval from
		// 14h to 15h and the current weather with the most
		// up to date time.
		//
		// Examples for better understanding:
		// current time: 13h50
		// current weather is for 13h50
		// hourly forecast[0] is for 13h - 14h
		// -
		// current time: 14h05
		// current weather is for 14h05
		// hourly forecast[0] is for 14h - 15h
		//
		// If at 13h50 we use the hourly foreceast[0]
		// we will be displaying data that is almost
		// certain to be outdated and won't be useful
		//
		// To display adequate results I consider 30m
		// to be a adequate timeframe before starting
		// to look at the next hour forecast
		tsCurrent = new Date(data.current.dt * 1000)
		tsHourlyForecast = new Date(data.hourly[0].dt * 1000)
		if (new Date(tsCurrent - tsHourlyForecast).getMinutes() > 30) {
			this.chanceOfRainNextHour = (parseFloat(data.hourly[1].pop) * 100).toFixed(0);
			this.chanceOfRainAfter = (parseFloat(data.hourly[2].pop) * 100).toFixed(0);
		} else {
			this.chanceOfRainNextHour = (parseFloat(data.hourly[0].pop) * 100).toFixed(0);
			this.chanceOfRainAfter = (parseFloat(data.hourly[1].pop) * 100).toFixed(0);
		}

		this.feelsLike = 0;

		if (this.config.useKMPHwind) {
			this.windSpeed = parseFloat((data.current.wind_speed * 60 * 60) / 1000).toFixed(0);
		} else {
			this.windSpeed = parseFloat(data.current.wind_speed).toFixed(0);
		}

		// ONLY WORKS IF TEMP IN C //
		var windInMph = parseFloat(data.current.wind_speed * 2.23694);

		var tempInF = 0;
		switch (this.config.units) {
			case "metric":
				tempInF = 1.8 * this.temperature + 32;
				break;
			case "imperial":
				tempInF = this.temperature;
				break;
			case "default":
				tempInF = 1.8 * (this.temperature - 273.15) + 32;
				break;
		}

		if (windInMph > 3 && tempInF < 50) {
			// windchill
			var windChillInF = Math.round(35.74 + 0.6215 * tempInF - 35.75 * Math.pow(windInMph, 0.16) + 0.4275 * tempInF * Math.pow(windInMph, 0.16));
			var windChillInC = (windChillInF - 32) * (5 / 9);
			// this.feelsLike = windChillInC.toFixed(0);

			switch (this.config.units) {
				case "metric":
					this.feelsLike = windChillInC.toFixed(0);
					break;
				case "imperial":
					this.feelsLike = windChillInF.toFixed(0);
					break;
				case "default":
					this.feelsLike = (windChillInC + 273.15).toFixed(0);
					break;
			}
		} else if (tempInF > 80 && this.humidity > 40) {
			// heat index
			var Hindex =
				-42.379 +
				2.04901523 * tempInF +
				10.14333127 * this.humidity -
				0.22475541 * tempInF * this.humidity -
				6.83783 * Math.pow(10, -3) * tempInF * tempInF -
				5.481717 * Math.pow(10, -2) * this.humidity * this.humidity +
				1.22874 * Math.pow(10, -3) * tempInF * tempInF * this.humidity +
				8.5282 * Math.pow(10, -4) * tempInF * this.humidity * this.humidity -
				1.99 * Math.pow(10, -6) * tempInF * tempInF * this.humidity * this.humidity;

			switch (this.config.units) {
				case "metric":
					this.feelsLike = parseFloat((Hindex - 32) / 1.8).toFixed(0);
					break;
				case "imperial":
					this.feelsLike = Hindex.toFixed(0);
					break;
				case "default":
					var tc = parseFloat((Hindex - 32) / 1.8) + 273.15;
					this.feelsLike = tc.toFixed(0);
					break;
			}
		} else {
			this.feelsLike = parseFloat(this.temperature).toFixed(0);
		}

		this.windDirection = this.deg2Cardinal(data.current.wind_deg);
		this.windDeg = data.current.wind_deg;
		this.weatherType = this.config.iconTable[data.current.weather[0].icon];

		this.show(this.config.animationSpeed, { lockString: this.identifier });
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
		this.sendNotification("WEATHER_DATA", { data: data });
	},

	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function (delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		setTimeout(function () {
			self.updateWeather();
		}, nextLoad);
	},

	deg2Cardinal: function (deg) {
		if (deg > 11.25 && deg <= 33.75) {
			return "NNE";
		} else if (deg > 33.75 && deg <= 56.25) {
			return "NE";
		} else if (deg > 56.25 && deg <= 78.75) {
			return "ENE";
		} else if (deg > 78.75 && deg <= 101.25) {
			return "E";
		} else if (deg > 101.25 && deg <= 123.75) {
			return "ESE";
		} else if (deg > 123.75 && deg <= 146.25) {
			return "SE";
		} else if (deg > 146.25 && deg <= 168.75) {
			return "SSE";
		} else if (deg > 168.75 && deg <= 191.25) {
			return "S";
		} else if (deg > 191.25 && deg <= 213.75) {
			return "SSW";
		} else if (deg > 213.75 && deg <= 236.25) {
			return "SW";
		} else if (deg > 236.25 && deg <= 258.75) {
			return "WSW";
		} else if (deg > 258.75 && deg <= 281.25) {
			return "W";
		} else if (deg > 281.25 && deg <= 303.75) {
			return "WNW";
		} else if (deg > 303.75 && deg <= 326.25) {
			return "NW";
		} else if (deg > 326.25 && deg <= 348.75) {
			return "NNW";
		} else {
			return "N";
		}
	},

	/* function(temperature)
	 * Rounds a temperature to 1 decimal or integer (depending on config.roundTemp).
	 *
	 * argument temperature number - Temperature.
	 *
	 * return string - Rounded Temperature.
	 */
	roundValue: function (temperature) {
		var decimals = this.config.roundTemp ? 0 : 1;
		return parseFloat(temperature).toFixed(decimals);
	}
});
