$(function() {
  var socket = io();

  // Refresh every day to grab any new updates
  function refreshPage() {
    window.location.reload(true);
  }
  window.setInterval(refreshPage, 86400000);

  // Refresh page when we get refresh server call
  socket.on("refresh", function() {
    refreshPage();
  });

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
      hideRouteList: true,
    });
    endResultRenderer = new google.maps.DirectionsRenderer({
      preserveViewport: true,
      hideRouteList: true,
    });
    station = new google.maps.LatLng(39.047031, -77.051403);
    directionsMap = new google.maps.Map(
      document.getElementById("directionsMap"),
      {
        center: station,
        scaleControl: false,
        rotateControl: false,
        zoomControl: false,
      }
    );
    endResultMap = new google.maps.Map(
      document.getElementById("endResultMap"),
      {
        center: station,
        zoom: 17,
        scaleControl: false,
        rotateControl: false,
        zoomControl: false,
      }
    );
    directionsRenderer.setMap(directionsMap);
    endResultRenderer.setMap(endResultMap);
  }

  function updateMap(lat, lon) {
    // Unhides the call
    // Needed before map drawing so Microsoft can size and zoom correctly
    // Using visibility as a proxy for hiding, to minimize map jumpiness
    $("#no-call").addClass("hide");

    destination = new google.maps.LatLng(lat, lon);

    var request = {
      origin: station,
      destination: destination,
      travelMode: "DRIVING",
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

    if (routeDistance >= 32000) {
      errors++;
      errorText += "Distance is greater than 20 miles. ";
    }

    if (routeTime >= 1500) {
      errors++;
      errorText += "Driving time is greater than 25 minutes. ";
    }

    if (errors > 0) {
      $("#error-box").html(
        `<div class="error"><strong>Warning:</strong> ${errorText}Map may not be accurate.</div>`
      );
    }
  }

  function directionsError(e) {
    $("#error-box").html(
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
    $("#error-box").html("");
    $(".call").remove();
    $("#logo").show();
    $("#notice").show();
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

    $("#logo").hide();
    $("#notice").hide();

    // Populates the call details
    var callDom = `<div class="call">
      <div class="meta">
        <div class="type">${call.type}</div>
        <div class="box">Box Area: ${call.box}</div>
        <div class="units">${call.units}</div>
      </div>
      <ul class="address">
        ${call.address.map((i) => `<li>` + i + `</li>`).join("")}
      </ul>
      <div id="counter">
          <span id="minutes">0</span>:<span id="seconds">00</span>
      </div>
    </div>`;

    $("#stripe").prepend(callDom);

    var tick = function() {
      if (minutes >= 3) {
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

    // Generates the map
    updateMap(call.lat, call.lon);
  }

  // When socket is received, start a new call
  socket.on("new call", function(msg) {
    newCall(msg);
    window.scrollTo(0, 0);
  });
});
