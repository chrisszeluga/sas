$(function() {
  var socket = io();

  // Refresh every day to grab any new updates
  function refreshPage() {
    window.location.reload(true);
  }
  window.setInterval(refreshPage, 86400000);

  // This key is intended to be public. Domain restrictions are in place to prevent abuse.
  $.getScript(
    "https://maps.googleapis.com/maps/api/js?key=AIzaSyAjQ2wRficR7ckwNsD2KBU3Zi4p8tESr38",
    function() {
      initMap();
    }
  );

  // Function to create directions

  var directionsService;
  var directionsRenderer;
  var endResultRenderer;
  var station;
  var directionsMap;
  var endResultMap;
  function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      hideRouteList: true
    });
    endResultRenderer = new google.maps.DirectionsRenderer({
      preserveViewport: true,
      hideRouteList: true
    });
    station = new google.maps.LatLng(39.047031, -77.051403);
    directionsMap = new google.maps.Map(
      document.getElementById("directionsMap"),
      {
        center: station,
        scaleControl: false,
        rotateControl: false,
        zoomControl: false
      }
    );
    endResultMap = new google.maps.Map(
      document.getElementById("endResultMap"),
      {
        center: station,
        zoom: 17,
        scaleControl: false,
        rotateControl: false,
        zoomControl: false
      }
    );
    directionsRenderer.setMap(directionsMap);
    endResultRenderer.setMap(endResultMap);
  }

  function updateMap(inputAddress) {
    // Unhides the call
    // Needed before map drawing so Microsoft can size and zoom correctly
    // Using visibility as a proxy for hiding, to minimize map jumpiness
    $("#no-call").addClass("hide");

    var request = {
      origin: station,
      destination:
        inputAddress + ", Montgomery County, Maryland, United States",
      travelMode: "DRIVING"
    };
    directionsService.route(request, function(result, status) {
      if (status !== "OK") {
        directionsError(status);
        return;
      }

      endResultRenderer.setDirections(result);
      directionsRenderer.setDirections(result);

      endResultMap.setCenter(result.routes[0].legs[0].end_location);
      endResultMap.setZoom(17);
      sanityCheckDirections(result.routes[0].legs[0]);
    });

    $("#new-call").removeClass("hide");
    $("#disclaimer").removeClass("hide");
  }

  function sanityCheckDirections(currentRoute) {
    // Sanity check route length and duration
    var routeDistance = currentRoute.distance.value;
    var routeTime = currentRoute.duration.value;

    var errorText = "";
    var errors = 0;

    if (routeDistance >= 16000) {
      errors++;
      errorText += "Distance is greater than 10 miles. ";
    }

    if (routeTime >= 1200) {
      errors++;
      errorText += "Driving time is greater than 20 minutes. ";
    }

    if (errors > 0) {
      $("#top").append(
        `<div class="error"><strong>Warning:</strong> ${errorText}Map may not be accurate.</div>`
      );
    }
  }

  function directionsError(e) {
    $("#top").append(
      `<div class="error"><strong>Warning:</strong> ${e.message}</div>`
    );
    $("#new-call").addClass("hide");
  }

  // Adds a leading 0
  function pad(str, max) {
    str = str.toString();
    return str.length < max ? pad("0" + str, max) : str;
  }

  // Resets the screen to a starting state
  function reset() {
    $("#top .error").remove();
    $("#top .call").remove();
    $("#counter").addClass("hide");
    $("#new-call").addClass("hide");
    $("#no-call").removeClass("hide");
    $("#waiting").removeClass("hide");
    $("#disclaimer").addClass("hide");
  }

  reset();

  var minutes = 0;
  var seconds = 0;
  var timer;

  // Initiaties a new call
  function newCall(call) {
    reset();

    // Starts the timer
    $("#waiting").addClass("hide");
    $("#counter #minutes").html("0");
    $("#counter #seconds").html("00");
    $("#counter").removeClass("hide");

    var tick = function() {
      if (minutes >= 4) {
        reset();
        clearInterval(timer);
      } else {
        if (seconds >= 59) {
          seconds = 0;
          minutes++;
        } else {
          seconds++;
        }
        $("#counter #minutes").html(minutes);
        $("#counter #seconds").html(pad(seconds, 2));
      }
    };

    // Resets the timer if a new call is initiatied
    if (timer) {
      clearInterval(timer);
      minutes = 0;
      seconds = 0;
    }
    // Starts the timer
    timer = setInterval(tick, 1000);

    // Populates the call details
    var callDom = `<div class="call">
      <div class="time">${moment(call.time).format("h:mma")}</div>
      <ul class="address">
        ${call.address.map(i => `<li>` + i + `</li>`).join("")}
      </ul>
      <div class="type">${call.type}</div>
      <div class="box">Box Area: ${call.box}</div>
      <div class="units">${call.units}</div>
    </div>`;

    $("#top").append(callDom);

    // Generates the map
    updateMap(call.address[0]);
  }

  // When socket is received, start a new call
  socket.on("new call", function(msg) {
    newCall(msg);
    window.scrollTo(0, 0);
  });
});
