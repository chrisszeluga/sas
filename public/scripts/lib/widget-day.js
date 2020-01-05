/* Load the timeline */

var width = (window.innerWidth < 800) ? window.innerWidth : 860;
var step = (window.innerWidth < 800) ? 4 : 2;
var fontSize = (window.innerWidth < 800) ? 12 : 14;
var uvIndex = parseInt($(".uv_index .val .num").text(), 10);
if (!isNaN(uvIndex)) {
  $('#currentDetails .section .uv_index').removeClass('uv0 uv1 uv2 uv3 uv4').addClass(uvClass(uvIndex));
}

new Timeline($('#timeline'), {
  width: $(".scroll-container").width(),
  label_width: 100,
  hour_spacing: 3,
  units: units,
  reversed: languageReversed,
  format24: (timeFormat == '24'),
  conditionStrs: conditions
}).load(hours, tz_offset)

$(window).on("resize", function () {
  new Timeline($('#timeline'), {
    width: $(".scroll-container").width(),
    label_width: 100,
    hour_spacing: 3,
    units: units,
    reversed: languageReversed,
    format24: (timeFormat == '24'),
    conditionStrs: conditions
  }).load(hours, tz_offset)
})


/* Create charts */

var temps = { vals: [], range: [] },
  apparent = { vals: [], range: [] },
  precipProbs = { vals: [], range: [] },
  windSpeeds = { vals: [], range: [] },
  humidities = { vals: [], range: [] },
  dewPoints = { vals: [], range: [] },
  pressures = { vals: [], range: [] },
  uvs = { vals: [], range: [] },
  visibilities = { vals: [], range: [] }

var format12Labels = ['12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm', '12pm'],
  format24Labels = ['0:00', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00']

// Add an extra hour for plotting purposes
var pt0 = hours[hours.length - 2],
  pt1 = hours[hours.length - 1],
  pt = {}

// Date info used for highlighting current hour in graphs
var date = new Date(),
  militaryHour = date.getHours(),
  standardHour = (militaryHour > 12) ? militaryHour - 12 + "pm" : militaryHour + "am";

for (var field in pt1) {
  if (isNaN(parseFloat(pt1[field]))) continue
  pt[field] = 2 * pt1[field] - pt0[field]
}
hours.push(pt)

function populateData(hour, data, field) {

  // To highlight current hour: if index matches military hour, highlight node
  if (militaryHour === i) {
    data.vals.push(
      {
        marker: {
          fillColor: "#d4d4d4",
          lineWidth: 3,
          lineColor: "#d4d4d4"
        },
        y: hour[field]
      }
    );
  } else {
    data.vals.push(hour[field])
  }


  var error = hour[field + 'Error']
  if (error) {
    data.range.push([hour[field] - error, hour[field] + error])
  }
}

for (var i = 0; i < hours.length; i++) {
  populateData(hours[i], temps, 'temperature')
  populateData(hours[i], apparent, 'apparentTemperature')
  populateData(hours[i], precipProbs, 'precipProbability')
  populateData(hours[i], windSpeeds, 'windSpeed')
  populateData(hours[i], humidities, 'humidity')
  populateData(hours[i], dewPoints, 'dewPoint')
  populateData(hours[i], pressures, 'pressure')
  populateData(hours[i], uvs, 'uvIndex')
  populateData(hours[i], visibilities, 'visibility')
}

function createChart($container, data, units, multiple, numDigits, zeroIsMin, minSpan, maxValue) {

  if (typeof units != 'object') {
    data = [data]
    units = [units]
    multiple = [multiple]
    numDigits = [numDigits]
    zeroIsMin = [zeroIsMin]
    minSpan = [minSpan]
    maxValue = [maxValue]
  }

  if (data[0].vals[0] == null) {
    $container.parent().hide()
    return
  }

  var numFields = data.length,
    roundMult = [],
    yAxis = [],
    series = [];

  for (var i = 0; i < numFields; i++) {
    multiple[i] = multiple[i] || 1
    numDigits[i] = numDigits[i] || 0
    units[i] = units[i] || ''
    zeroIsMin[i] = zeroIsMin[i] || false
    minSpan[i] = minSpan[i] || 0.0
    maxValue[i] = maxValue[i] || null

    roundMult.push(Math.pow(10, numDigits[i]))

    yAxis.push({
      title: null,
      labels: {
        formatter: function () {
          var i = this.axis.opposite ? (languageReversed ? 0 : 1) : (languageReversed ? 1 : 0)
          var val = Math.round(roundMult[i] * multiple[i] * this.value) / roundMult[i]
          return val + units[i]
        }
      },
      opposite: (i == 0) ? (languageReversed ? true : false) : (languageReversed ? false : true),
      min: zeroIsMin[i] ? 0.0 : null,
      minRange: minSpan[i],
      max: maxValue[i]
    })

    series.push({
      showInLegend: false,
      marker: { enabled: true, radius: 5 },
      lineWidth: 5,
      color: (i == 0) ? '#111' : 'rgba(0, 0, 0, 0.25)',
      yAxis: i,
      data: data[i].vals
    })

  }

  if (data.length > 1)
    $container.addClass('double')

  $container.highcharts({
    chart: {
      type: 'spline',
      backgroundColor: 'transparent',
      marginLeft: languageReversed ? (data.length > 1 ? 70 : 0) : (innerWidth < 800) ? 40 : 70,
      marginRight: languageReversed ? 70 : (data.length > 1 ? 70 : 0)

    },
    title: null,
    subtitle: null,
    xAxis: [{
      reversed: languageReversed,
      categories: (timeFormat == '12') ? format12Labels : format24Labels,
      labels: {

        style: {
          color: '#111',
          font: fontSize + 'px "Lato", sans-serif'
        }
      },
      tickmarkPlacement: 'on',
      min: 0.5,
      max: hours.length - 1.5,
      showLastLabel: false
    }],
    yAxis: yAxis,
    tooltip: {
      formatter: function () {
        var i = this.series._i
        var val = Math.round(roundMult[i] * multiple[i] * this.y) / roundMult[i]
        return this.x + ': ' + val + units[i]
      }
    },
    plotOptions: {
      line: {
        enableMouseTracking: true,
        marker: {
          enabled: false
        }
      }
    },
    series: series,
    responsive: {
      rules: [{
        condition: {
          maxWidth: 500
        },
        chartOptions: {
          legend: {
            enabled: false
          }
        }
      }]
    }
  })
}

createChart($('#temperature_graph'), temps, '˚', 1, 0, false, 10.0, null)
createChart($('#precip_graph'), precipProbs, '%', 100, 0, true, 0.05, 1.0)
createChart($('#humidity_graph'), [humidities, dewPoints], ['%', '˚'], [100, 1], [0, 0], [true, false], [0.1, 10.0], [1.0, null])
createChart($('#wind_graph'), windSpeeds, ' ' + unitsList.speed, 1, 0, true, 5.0, null)
createChart($('#pressure_graph'), pressures, ' ' + unitsList.pressure, 1, 0, false, 0.0, null)
createChart($('#uv_graph'), uvs, '', 1, 0, true, 8.0, null)
createChart($('#visibility_graph'), visibilities, ' ' + unitsList.distance, 1, 0, true, 8.0, (units === "si" || units === "ca") ? 16.0 : 10.0)

/* Slider */

function uvClass(uvIndex) {
  if (uvIndex < 2.5) {
    return 'uv0'
  } else if (uvIndex < 5.5) {
    return 'uv1'
  } else if (uvIndex < 7.5) {
    return 'uv2'
  } else if (uvIndex < 10.5) {
    return 'uv3'
  } else {
    return 'uv4'
  }
}

function setCurrentDetailVal(field, val) {
  if (val == null || isNaN(val)) {
    $('#currentDetails .' + field + ' .val .num').html('—')
  } else {
    $('#currentDetails .' + field + ' .val .num').html(val)
  }
}

function sliderChange(percent) {
  if (languageReversed)
    percent = 1.0 - percent

  var hourI = percent * (hours.length - 1),
    hour0 = Math.floor(hourI),
    hour1 = Math.min(hours.length - 1, Math.ceil(hourI)),
    p = hourI % 1

  var temperature = (1.0 - p) * hours[hour0].temperature + p * hours[hour1].temperature,
    precipProbability = (1.0 - p) * hours[hour0].precipProbability + p * hours[hour1].precipProbability,
    humidity = (1.0 - p) * hours[hour0].humidity + p * hours[hour1].humidity,
    dewPoint = (1.0 - p) * hours[hour0].dewPoint + p * hours[hour1].dewPoint,
    windSpeed = (1.0 - p) * hours[hour0].windSpeed + p * hours[hour1].windSpeed,
    pressure = (1.0 - p) * hours[hour0].pressure + p * hours[hour1].pressure,
    uvIndex = (1.0 - p) * hours[hour0].uvIndex + p * hours[hour1].uvIndex,
    visibility = (1.0 - p) * hours[hour0].visibility + p * hours[hour1].visibility

  var degPerRad = 57.2957795,
    windBearing0 = hours[hour0].windBearing / degPerRad,
    windBearing1 = hours[hour1].windBearing / degPerRad,
    windX = (1.0 - p) * Math.cos(windBearing0) + p * Math.cos(windBearing1),
    windY = (1.0 - p) * Math.sin(windBearing0) + p * Math.sin(windBearing1),
    windBearing = (degPerRad * Math.atan2(windY, windX) + 180) % 360

  setCurrentDetailVal('temperature', Math.round(temperature))
  setCurrentDetailVal('precipProbability', Math.round(100 * precipProbability))
  setCurrentDetailVal('wind', Math.round(windSpeed))
  setCurrentDetailVal('pressure', Math.round(pressure))
  setCurrentDetailVal('humidity', Math.round(100 * humidity))
  setCurrentDetailVal('dew_point', Math.round(dewPoint))
  setCurrentDetailVal('uv_index', Math.round(uvIndex))
  setCurrentDetailVal('visibility', Math.round(visibility) + (visibility == 10 ? '+' : ''))
  $('#currentDetails .wind .val .direction').css({
    '-ms-transform': 'rotate(' + windBearing + 'deg)',
    '-webkit-transform': 'rotate(' + windBearing + 'deg)',
    'transform': 'rotate(' + windBearing + 'deg)'
  })
  $('#currentDetails .section .uv_index').removeClass('uv0 uv1 uv2 uv3 uv4').addClass(uvClass(uvIndex))
}
