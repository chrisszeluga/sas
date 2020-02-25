$(function() {
	function updateHospitalStatuses(data) {
		var hospitals = data.hospitals;

		function updateColor(hospitalEl, color, show) {
			if (show) {
				$("#" + hospitalEl + " .statuses ." + color).show();
			} else {
				$("#" + hospitalEl + " .statuses ." + color).hide();
			}
		}

		// Update Statuses
		$("#chats .hospital").each(function(index) {
			var slug = $(this).attr("id");

			var selectedHospital = hospitals.find(function(hospital) {
				return hospital.slug === slug;
			});

			["yellow", "red", "green", "orange", "purple"].forEach(function(
				item
			) {
				selectedHospital.statuses[item]
					? updateColor(slug, item, true)
					: updateColor(slug, item, false);
			});

			if (
				Object.keys(selectedHospital.statuses).every(
					k => !selectedHospital.statuses[k]
				)
			) {
				$("#" + slug + " .statuses .no").show();
			} else {
				$("#" + slug + " .statuses .no").hide();
			}
		});

		// Update blue alert
		var montgomeryBlue = data.blue.find(function(county) {
			return county.title === 'Montgomery County';
		})

		if (montgomeryBlue.blue == true) {
			$('#blue').removeClass("hide");
		} else {
			$('#blue').addClass("hide");
		}

		// Update time
		var updatedAt = moment(data.updatedAt).format("h:mma");
		$(".updated span").text(updatedAt);
	}

	function getHospitals() {
		$.get("/api/hospitals", function(data) {
			updateHospitalStatuses(data);
		});
	}

	getHospitals();
	var runHospitals = window.setInterval(getHospitals, 360000);
});
