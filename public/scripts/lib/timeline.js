var Timeline = function ($container, params) {
  // Params list:
  //   {
  //     width: null,              // [optional] Width of the whole timeline. When set, it will remove labels as necessary in order to fit.
  //     label_width: 100,         // Width of each label. You're responsible for making sure the label content fits within this size.
  //     hour_spacing: 2,          // Minimum time between labels. Defaults to 1 hour.
  //     first_hour_width: 200     // [optional] Manually set the width of the first hour (for use with the wobble chart)
  //   }

  const CLEAR = 0,
    PARTLY_CLOUDY = 1,
    MOSTLY_CLOUDY = 2,
    OVERCAST = 3,
    LIGHT_RAIN = 4,
    RAIN = 5,
    LIGHT_SNOW = 6,
    SNOW = 7;

  params.label_width = params.label_width || 100;
  params.hour_spacing = params.hour_spacing || null;
  params.first_hour_width = params.first_hour_width || 0;
  params.units = params.units || "us";
  params.reversed = params.reversed || false;
  params.format24 = params.format24 || false;
  params.conditionStrs = params.conditionStrs || {};
  params.now = params.now || false;
  params.redline = params.redline || false;
  params.numHours = params.numHours || 24;
  params.event = params.event || false;
  params.labelInt = params.labelInt || 2;

  if (params.reversed) {
    $container.addClass("reversed");
  }

  if (params.event === true && params.numHours > 12) {
    params.numHours = 12;
  }

  if (params.event === true && params.numHours > 1 && params.numHours < 12) {
    params.numHours--;
  }

  var timeline_width = params.width,
    timeline = {},
    $hours = $container.find(".hours"),
    $night = $container.find(".night"),
    start_time,
    timezone_offset = 0;

  // Convert cloud cover percentage into range (clear, partly cloudy, or overcast)
  var cloud_cover_range = function (obj) {
    if (obj.clouds < 25) {
      return CLEAR; // Clear
    } else if (obj.clouds < 59.375) {
      return PARTLY_CLOUDY; // Partly Cloudy
    } else if (obj.clouds < 93.75) {
      return MOSTLY_CLOUDY; // Mostly Cloudy
    } else {
      return OVERCAST; // Overcast
    }
  };

  // Some meteo functions

  /* Gives the snow-to-water ratio at a given temperature. (Adam says this is a
   * best-fit to some NOAA data.) */
  var snowToWaterRatio = function (t) {
    var r;
    if (t) {
      r = Math.max(
        8.0,
        Math.min(
          75.0,
          (0.014666443251269316 * t + -1.4349642980102439) * t +
            41.593227138990002
        )
      );
    } else {
      r = 10.0;
    }
    return r;
  };

  // Convert inches/hr to intensity
  var inchesPerHourToIntensity = function (inches, hourly) {
    var exp = hourly ? -3.0 : -2.209389806;
    return 4.0 * (1.0 - Math.exp(exp * Math.sqrt(inches)));
  };

  // Convert inches/hr to estimated dBZ
  var inPerHourToEstimatedDBZ = function (inches_per_hour) {
    return inches_per_hour <= 0
      ? 0
      : 10.0 * Math.log10(200 * Math.pow(25.4 * inches_per_hour, 1.6));
  };

  var estimatedDBZ = function (obj) {
    if (!obj.rain["1h"]) {
      return 0;
    }

    var precip_intensity = obj.rain["1h"],
      temperature = obj.temp;

    if (params.units != "us") {
      precip_intensity /= 25.4;
      temperature = temperature * 1.8 + 32;
    }

    if (obj.weather[0].main === "Snow") {
      precip_intensity *= 0.34 * snowToWaterRatio(temperature);
    }

    // Convert from inches/hr to estimated dBZ
    return inPerHourToEstimatedDBZ(precip_intensity);
  };

  var precipIntensity = function (data_point, for_hourly) {
    if (!data_point.rain) {
      return 0;
    }

    var precip_intensity = data_point.rain["1h"],
      temperature = data_point.temp;

    if (params.units != "us") {
      precip_intensity /= 25.4;
      temperature = temperature * 1.8 + 32;
    }

    if (data_point.precipType === "snow") {
      precip_intensity *= 0.34 * snowToWaterRatio(temperature);
    }

    // Convert from inches/hr to estimated dBZ
    var dBZ = inPerHourToEstimatedDBZ(precip_intensity);

    // NOTE: 2,3,4 represent light, med, and heavy intensity
    if (dBZ <= 25) {
      return 2;
    } else {
      return 3;
    }
  };

  // Convert precip intensity into a range (light, medium, heavy, etc)
  var precip_range = function (obj) {
    var min_intensity = params.units == "us" ? 0.005 : 0.127;
    if (!obj.rain["1h"] || obj.rain["1h"] < min_intensity) {
      return 0;
    }
    var intensity = precipIntensity(obj, true);
    if (!intensity) {
      return 0;
    }
    return intensity;
  };

  // Get the hour of the day
  var get_hour = function (time) {
    var date = new Date(1000 * time);
    date.setHours(date.getHours() + timezone_offset);

    var hour = date.getHours();

    if (date.getMinutes() > 30) {
      hour++;
      if (hour == 24) hour = 0;
    }

    return hour;
  };

  // Convert a timestamp to an hour string
  var hour_str = function (time) {
    var hour = get_hour(time) + 1;

    if (params.format24) {
      return hour + ":00";
    }

    if (hour == 0) hour = "12am";
    else if (hour < 12) hour += "am";
    else if (hour == 12) hour = "12pm";
    else {
      hour -= 12;
      hour += "pm";
    }

    return hour;
  };

  var capitalize = function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Create hour tick marks
  var create_hour_ticks = function (hourly) {
    var $ticks = $container.find(".hour_ticks");
    $ticks.empty();

    var spacing = timeline_width / hourly.length,
      x = 0;

    for (var i = 0; i < hourly.length; i++) {
      if (x > timeline_width) x = timeline_width;
      $("<span />")
        .addClass(i % 2 == 0 ? "even" : "odd")
        .css(params.reversed ? "right" : "left", x)
        .appendTo($ticks);
      x += spacing;
    }

    $ticks.find("span").eq(0).addClass("first");
    $ticks.find("span").eq(1).addClass("second");
  };

  // Check if an element is truncated
  var truncated = function ($elem, callback) {
    var $c = $elem
      .clone()
      .css({ display: "inline", width: "auto", visibility: "hidden" })
      .appendTo($elem.parent());

    setTimeout(function () {
      var isTruncated = false;
      if ($c.width() > $elem.width()) isTruncated = true;

      $c.remove();

      return callback(isTruncated);
    }, 0);
  };

  var create_hours = function (hourly) {
    $hours.empty();

    var date = new Date(1000 * start_time),
      time,
      left;

    date.setHours(date.getHours(), 0, 0, 0);

    for (var i = 0; i < hourly.length; i++) {
      time = hourly[i].dt;
      left = i == 0 ? 1 : position_in_timeline(time);

      if (left >= 0 && left < timeline_width) {
        var $hour = $("<span />")
          .addClass("hour")
          .css(params.reversed ? "right" : "left", left);

        if (params.event === true && hourly.length < 10) {
          if (i == 0 && params.now) {
            var hr = "Now";
          } else {
            var hr = hour_str(time);
          }

          var span = $("<span />")
            .html(hr)
            .addClass(hr.replace(" ", ""))
            .appendTo($hour);
        } else {
          if (i == 0 || (i > 1 && i % 2 == 0)) {
            if (i == 0 && params.now) {
              var hr = "Now";
            } else {
              var hr = hour_str(time);
            }

            var span = $("<span />")
              .html(hr)
              .addClass(hr.replace(" ", ""))
              .appendTo($hour);
          }
        }

        if (i == 0 || (i > 1 && i % 2 == 0)) {
          if (i == 0 && params.now) {
            var hr = "Now";
          } else {
            var hr = hour_str(time);
          }

          var span = $("<span />")
            .html(hr)
            .addClass(hr.replace(" ", ""))
            .appendTo($hour);
        }

        $hour.appendTo($hours);
      }

      date.setHours(date.getHours() + 1);
    }

    $hours.find(".hour").eq(0).addClass("first").html("<span>Now</span>");
  };

  var create_stripes = function (stripes) {
    var $stripes_container = $container.find(".stripes");
    $stripes_container.empty();

    var hour_width = timeline_width / params.numHours,
      $label,
      label,
      num_intervals = 0,
      left,
      min_px_per_char = 8,
      hours_offset = 0;

    for (var i = 0; i < stripes.length; i++) {
      left = hours_offset * hour_width;
      if (left >= timeline_width) continue;

      var span_width = hour_width * stripes[i].num_hours + 1;

      if (1 + left + span_width > timeline_width)
        span_width -= 1 + left + span_width - timeline_width;

      var $span = $("<span />")
        .addClass("timeline-stripe-" + stripes[i].condition)
        .css("width", span_width);

      if (params.reversed) {
        $span.css("right", left);
      } else {
        $span.css("left", left);
      }

      $label = null;

      switch (stripes[i].condition) {
        case 0:
          label = "Clear";
          break;
        case 1:
          label = "Partly Cloudy";
          break;
        case 2:
          label = "Mostly Cloudy";
          break;
        case 3:
          label = "Overcast";
          break;
        case 4:
          label = "Light Rain";
          break;
        case 5:
          label = "Rain";
          break;
        case 6:
          label = "Light Snow";
          break;
        case 7:
          label = "Snow";
          break;
      }

      $label = $("<span />").html(label).appendTo($span);
      $span.appendTo($stripes_container);
      num_intervals++;
      hours_offset += stripes[i].num_hours;
    }

    $stripes_container.find("> span").eq(0).addClass("first");

    // Remove any labels that are truncated (if there are more than 12 hours)
    if (params.numHours > 12) {
      $stripes_container.find("> span > span").each(function (i, elem) {
        truncated($(elem), function (isTruncated) {
          if (isTruncated) $(elem).remove();
        });
      });
    }

    if (params.redline) {
      var redline_date = new Date(current.dt * 1000);
      redline_date.setHours(redline_date.getHours() + timezone_offset);
      var redline_hour = redline_date.getHours();
      var redline_minutes = redline_date.getMinutes();
      redline_minutes = redline_minutes / 60;

      var redline_time = redline_hour + redline_minutes;

      $redline = $("<div/>", {
        class: "redline",
      });
      $redline.css({
        position: "absolute",
        left: Math.round((redline_time / 24) * 100) + "%",
        width: "1px",
        height: "100%",
        background: "rgba(255,0,0,.5)",
      });
      $stripes_container.append($redline);
    }
  };

  var create_temperatures = function (hourly) {
    var $temps_container = $container.find(".temps");
    $temps_container.empty();

    if (params.event === true) {
      let icon_container = $("<div />")
        .addClass("icons")
        .appendTo($(".dtline"));
    }

    // Find min / max temperatures
    var min_temp = Infinity,
      max_temp = -Infinity;

    for (var i = 0; i < hourly.length; i++) {
      if (hourly[i].temp !== null) {
        if (hourly[i].temp < min_temp) min_temp = hourly[i].temp;

        if (hourly[i].temp > max_temp) max_temp = hourly[i].temp;
      }
    }

    var add_temp = function (i) {
      var time = hourly[i].dt,
        temp = hourly[i].temp,
        opacity = 0.25 + (0.75 * (temp - min_temp)) / (max_temp - min_temp);

      if (params.event === true) {
        var icon = hourly[i].weather[0].icon;
        opacity = 1;
      }

      if (temp == null) {
        temp = "-";
      } else {
        temp = Math.round(temp) + "&deg;";
      }

      var left = i == 0 ? 1 : position_in_timeline(time);
      if (left < 0 || left >= timeline_width) {
        return;
      }

      if (icon) {
        var $icon = $(
          '<span class="skycon icon" style="width:25px;height:25px"><canvas width="64" height="64" style="width:100%;height:100%" class=' +
            icon +
            "></canvas></span>"
        ).css("opacity", opacity);
      }

      var $elem = $("<span><span>" + temp + "</span></span>").css(
        "opacity",
        opacity
      );
      if (params.reversed) {
        $elem.css("right", left);
        if (icon) {
          if (i === 0) {
            $icon.css("right", left - 3);
          } else {
            $icon.css("right", left - 15);
          }
        }
      } else {
        $elem.css("left", left);
        if (icon) {
          if (i === 0) {
            $icon.css("left", left - 1);
          } else {
            $icon.css("left", left - 12);
          }
        }
      }
      $elem.appendTo($temps_container);
      if (icon) {
        $icon.appendTo($(".weather[0].icons"));
      }
    };

    add_temp(0);

    if (params.event === true && hourly.length < 10) {
      for (let i = 1; i < hourly.length; i++) {
        add_temp(i);
      }
    } else {
      for (let i = 2; i < hourly.length; i += 2) {
        add_temp(i);
      }
    }

    $temps_container.find("> span").eq(0).addClass("first");
  };

  var create_now_line = function () {
    $container.find(".now").remove();

    var now = new Date().getTime() / 1000,
      left = Math.round(position_in_timeline(now));

    if (left < 0 || left > timeline_width) return;

    $("<span />").addClass("now").css("left", left).appendTo($container);
  };

  // Calculate the position in the timeline for the given timestamp
  var position_in_timeline = function (time) {
    var pps = timeline_width / (params.numHours * 3600),
      sec_from_start = time - start_time;

    return sec_from_start * pps;
  };

  var add_icons = function (hourly) {
    var $icon_container = $("<div />")
      .addClass("icon-container")
      .css("width", timeline_width);
    for (let i = 0; i < hourly.length; i++) {}
  };

  var add_last_unit = function (eventLastHour) {
    // Conditions: this will only run if the event embed exists and the number of hours is less than or equal to 12
    // Add tick
    var class_name = $(".hour_ticks span:last-child").hasClass("even")
      ? "odd"
      : "even";
    var tick = $("<span />")
      .addClass(class_name)
      .css("left", timeline_width - 2 + "px");
    $(".hour_ticks").append(tick);
    // Add time
    var time = hour_str(eventLastHour.dt);
    var $hour = $("<span />")
      .addClass("hour")
      .css(params.reversed ? "right" : "left", timeline_width - 20 + "px");
    var span = $("<span />")
      .html(time)
      .addClass(time.replace(" ", ""))
      .appendTo($hour);
    $hours.append($hour);
    // add temp
    var temp = eventLastHour.temp;
    var $elem = $("<span><span>" + Math.round(temp) + "&deg;</span></span>");
    if (params.reversed) {
      $elem.css("right", timeline_width - 20 + "px");
    } else {
      $elem.css("left", timeline_width - 20 + "px");
    }
    $(".temps").append($elem);
    // Add icon
    var icon = eventLastHour.weather[0].icon;
    var $icon = $(
      '<span class="skycon icon" style="width:25px;height:25px"><canvas width="64" height="64" style="width:100%;height:100%" class=' +
        icon +
        "></canvas></span>"
    );
    $icon.css("left", timeline_width - 30 + "px");
    $(".weather[0].icons").append($icon);
  };

  var center_info = function () {
    $(".hour_ticks .first").css("left", timeline_width / 2 + "px");
    $(".hours .hour.first").css("left", timeline_width / 2 - 14 + "px");
    $(".temps .first").css("left", timeline_width / 2 - 11 + "px");
    $(".weather[0].icons .weather[0].icon").css(
      "left",
      timeline_width / 2 - 10 + "px"
    );
  };

  // Load the timeline for the given location
  timeline.load = function (hours, tz_offset, current) {
    start_time = hours[0].dt;
    timezone_offset =
      (tz_offset || 0) + new Date(1000 * start_time).getTimezoneOffset() / 60;

    var hourly = [],
      eventLastHour;
    for (var i = 0; i < Math.min(24, hours.length); i++) {
      hourly.push(JSON.parse(JSON.stringify(hours[i]))); // Ugh, how is there not a better way to clone an object?
    }

    if (params.event === true && params.numHours > 1 && params.numHours < 12) {
      eventLastHour = hourly.pop();
    }

    // Change the current hour in the timeline to match current, if provided
    if (current) {
      for (var i = 0; i < hourly.length; i++) {
        if (Math.abs(hourly[i].dt - current.dt) <= 1800) {
          for (var prop in hourly[i]) {
            if (prop == "time") continue;
            hourly[i][prop] =
              current[prop] != null ? current[prop] : hourly[i][prop];
          }
          break;
        }
      }
    }

    // If the timeline width is set, determine if the hour_spacing needs to be
    // increased in order to make sure the elements don't overlap
    if (params.width) {
      var single_hour_spacing = params.width / 24;
      var min_hour_spacing = Math.ceil(
        params.label_width / single_hour_spacing - 0.0001
      ); // subtract delta because of stupid float imprecision
      if (min_hour_spacing > params.hour_spacing)
        params.hour_spacing = min_hour_spacing;
    }

    // If no width has been specified, calculate it now
    if (!timeline_width)
      timeline_width = Math.ceil((24 * params.label_width) / 2);

    // Set timeline width explicitly
    $container.css("width", timeline_width);
    if (params.hour_spacing === null) params.hour_spacing = timeline_width / 24;

    // Create hour tick marks
    create_hour_ticks(hourly);
    create_hours(hourly);

    // Determine cloud cover and precipitation stripes
    var stripes = [],
      stripe = {},
      type,
      c_range,
      p_range,
      p_type,
      prev_p_type = "rain",
      previousSkyConditionType = -1;

    if (hourly[0].precipType) {
      prev_p_type = hourly[0].weather[0].icon;
    }

    for (var i = 0; i < hourly.length; i++) {
      let precipType =
        hourly[i].precipType != null ? hourly[i].precipType : "rain";
      let cloudCover = hourly[i].clouds;
      let weatherMain = hourly[i].weather[0].main;
      let skyConditionType = 0;
      let tmp_stripe = {};

      let isPrecip =
        weatherMain === "Rain" ||
        weatherMain === "Snow" ||
        weatherMain === "Drizzle" ||
        weatherMain === "Thunderstorm"
          ? true
          : false;

      if (isPrecip) {
        let isFreezingPrecip = precipType === "Snow";
        if (estimatedDBZ(hourly[i]) <= 25) {
          skyConditionType = isFreezingPrecip ? LIGHT_SNOW : LIGHT_RAIN;
        } else {
          skyConditionType = isFreezingPrecip ? SNOW : RAIN;
        }
      } else {
        skyConditionType = cloud_cover_range(hourly[i]);
      }

      tmp_stripe.condition = skyConditionType;
      tmp_stripe.num_hours = 0;

      if (previousSkyConditionType !== skyConditionType) {
        if (i > 0) {
          stripes.push(stripe);
        }
        stripe = tmp_stripe;
      }

      previousSkyConditionType = skyConditionType;
      stripe.num_hours++;
    }

    stripes.push(stripe);

    // Create the stripes
    create_stripes(stripes);

    // Create temperature entries
    create_temperatures(hourly);

    create_now_line();

    if (params.event === true && params.numHours > 1 && params.numHours < 12) {
      add_last_unit(eventLastHour);
    }

    if (params.event === true && params.numHours === 1) {
      center_info();
    }

    timeline.params = params;
  };

  return timeline;
};
