$(function() {
  var socket = io();

  // Refresh every day to grab any new updates
  function refreshPage() {
    window.location.reload(true);
  }
  window.setInterval(refreshPage, 86400000);

  // Function to create directions
  var directionsMap;
  var directionsManager;
  function GetMap(inputAddress) {
    // Unhides the call
    // Needed before map drawing so Microsoft can size and zoom correctly
    // Using visibility as a proxy for hiding, to minimize map jumpiness
    $("#no-call").addClass("hide");
    $("#new-call").css("visibility", "hidden");
    $("#new-call").removeClass("hide");

    if (typeof directionsMap !== "undefined") {
      directionsMap = undefined;
    }
    directionsMap = new Microsoft.Maps.Map("#directionsMap", {
      showDashboard: false,
      minZoom: 14,
      maxZoom: 17
    });
    //Load the directions module and map
    Microsoft.Maps.loadModule("Microsoft.Maps.Directions", function() {
      //Create an instance of the directions manager.
      directionsManager = new Microsoft.Maps.Directions.DirectionsManager(
        directionsMap
      );
      //Create waypoints to route between.
      var wvrsWaypoint = new Microsoft.Maps.Directions.Waypoint({
        address: "Wheaton Rescue Squad",
        location: new Microsoft.Maps.Location(39.04698, -77.05028)
      });
      directionsManager.addWaypoint(wvrsWaypoint);
      var callWaypoint = new Microsoft.Maps.Directions.Waypoint({
        address: inputAddress + ", Montgomery County, Maryland, United States"
      });
      directionsManager.addWaypoint(callWaypoint);
      //Specify the element in which the itinerary will be rendered.
      directionsManager.setRenderOptions({
        // autoUpdateMapView: false,
        displayDisclaimer: false,
        displayRouteSelector: false,
        firstWaypointPushpinOptions: {
          color: Microsoft.Maps.Color.fromHex("#3498DB")
        },
        lastWaypointPushpinOptions: {
          title: "Dispatched Address"
        }
      });
      directionsManager.setRequestOptions({
        maxRoutes: 1,
        routeDraggable: false
      });
      //Error handling
      Microsoft.Maps.Events.addHandler(
        directionsManager,
        "directionsError",
        directionsError
      );
      //Calculate directions.
      directionsManager.calculateDirections();

      Microsoft.Maps.Events.addHandler(
        directionsManager,
        "directionsUpdated",
        function(e) {
          var currentRoute = directionsManager.getCurrentRoute();

          setDirectionMapView(currentRoute);
          setBirdseyeMap(currentRoute);
          setStreetsideMap(currentRoute);
          sanityCheckDirections(currentRoute);
        }
      );
    });
    $("#disclaimer").removeClass("hide");
  }
  function setDirectionMapView(currentRoute) {
    directionsMap.setView({
      bounds: Microsoft.Maps.LocationRect.fromLocations(currentRoute.routePath)
    });
    $("#new-call").css("visibility", "visible");
  }
  function setBirdseyeMap(currentRoute) {
    var endLocation =
      currentRoute.routeLegs[currentRoute.routeLegs.length - 1]
        .endWaypointLocation;

    var birdseyeMap = new Microsoft.Maps.Map("#birdseyeMap", {
      showDashboard: false,
      center: endLocation,
      mapTypeId: Microsoft.Maps.MapTypeId.aerial
    });
    birdseyeMap.setView({
      zoom: 17
    });
    // Uset birdseye imagery if available
    Microsoft.Maps.getIsBirdseyeAvailable(
      birdseyeMap.getCenter(),
      birdseyeMap.getHeading(),
      function(isAvailable) {
        if (isAvailable) {
          birdseyeMap.setView({ mapTypeId: Microsoft.Maps.MapTypeId.birdseye });
        }
      }
    );
    var birdseyeLayer = new Microsoft.Maps.Layer();
    var birdseyePushpin = new Microsoft.Maps.Pushpin(endLocation);
    birdseyeLayer.add(birdseyePushpin);
    var birdseyePolyline = new Microsoft.Maps.Polyline(currentRoute.routePath, {
      strokeColor: Microsoft.Maps.Color.fromHex("#3498DB"),
      strokeThickness: 6
    });
    birdseyeLayer.add(birdseyePolyline);
    birdseyeMap.layers.insert(birdseyeLayer);
  }

  function setStreetsideMap(currentRoute) {
    var endLocation =
      currentRoute.routeLegs[currentRoute.routeLegs.length - 1]
        .endWaypointLocation;

    var streetsideMap = new Microsoft.Maps.Map("#streetsideMap", {
      center: endLocation,
      mapTypeId: Microsoft.Maps.MapTypeId.streetside,
      streetsideOptions: {
        locationToLookAt: endLocation,
        overviewMapMode: Microsoft.Maps.OverviewMapMode.hidden,
        showCurrentAddress: false,
        showHeadingCompass: false,
        showProblemReporting: false,
        showExitButton: false,
        showZoomButtons: false,
        disablePanoramaNavigation: true
      }
    });
  }

  function sanityCheckDirections(currentRoute) {
    // Sanity check route length and duration
    var routeDistance =
      currentRoute.routeLegs[currentRoute.routeLegs.length - 1].summary
        .distance;
    var routeTime =
      currentRoute.routeLegs[currentRoute.routeLegs.length - 1].summary.time;

    var errorText = "";
    var errors = 0;

    if (routeDistance >= 10) {
      errors++;
      errorText += "Distance is greater than 10 miles. ";
    }

    if (routeTime >= 900) {
      errors++;
      errorText += "Driving time is greater than 15 minutes. ";
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
      if (minutes >= 2) {
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
    GetMap(call.address[0]);
  }

  // When socket is received, start a new call
  socket.on("new call", function(msg) {
    newCall(msg);
    window.scrollTo(0, 0);
  });
});
