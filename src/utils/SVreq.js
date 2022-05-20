const SV = new google.maps.StreetViewService();

export default function SVreq(loc, settings) {
	return new Promise(async (resolve, reject) => {
		await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, (res, status) => {
			if (status != google.maps.StreetViewStatus.OK) return reject();
			if (settings.rejectUnofficial) {
				if (!/^\xA9 (?:\d+ )?Google$/.test(res.copyright)) return reject();
				if (settings.rejectNoDescription && !res.location.description && !res.location.shortDescription) return reject();
				if (settings.rejectDateless && !res.imageDate) return reject();
				if (settings.getIntersection && res.links.length < 3) return reject();
			}

			const fromDate = Date.parse(settings.fromDate);
			const toDate = Date.parse(settings.toDate);
			
			(async() => {
			if (settings.checkAllDates) {
				if (!res.time?.length) return reject();

				let dateWithin = false;
				let generation_ne = false;
				for (var i = 0; i < res.time.length; i++) {
					
					 const genCheck = async() => {
					    // GET request using fetch with async/await
					    const api_url = "https://cbk0.google.com/cbk?output=json&panoid=" + res.time[i].pano;
    					    const response = await fetch(api_url);
					    const data = await response.json();
				            // Gen 4?
					    if (data.Data.imagery_type == 5){
						return "trekker";
					    }
					    if (data.Data.image_width == 3328){
						return "gen1";
					    }
					    if (data.Data.image_width == 13312){
						return "gen2/3";
					    }
					    if (data.Data.image_width == 16384){
						return "gen4";
					    }
					};
					console.log(genCheck_result);
					const genCheck_result = await genCheck();
					if (genCheck_result != "gen4") continue;
					if (genCheck_result == "gen4"){
						loc.panoId = res.time[i].pano;
						break;
					}

					
					const timeframeDate = Object.values(res.time[i]).find((val) => isDate(val));

					if (settings.rejectUnofficial && res.time[i].pano.length != 22) continue; // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
					const iDate = Date.parse(timeframeDate.getFullYear() + "-" + (timeframeDate.getMonth() > 8 ? "" : "0") + (timeframeDate.getMonth() + 1));

					if (iDate >= fromDate && iDate <= toDate) {
						dateWithin = true;
						loc.panoId = res.time[i].pano;
						break;
					}
					

					
				}
				if (!dateWithin) return reject();
			} else {
				if (Date.parse(res.imageDate) < fromDate || Date.parse(res.imageDate) > toDate) return reject();
			}
			})();
			loc.lat = res.location.latLng.lat();
			loc.lng = res.location.latLng.lng();

			if (settings.adjustHeading && res.links.length > 0) {
				loc.heading = parseInt(res.links[0].heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
			}

			if (settings.adjustPitch) loc.pitch = settings.pitchDeviation;

			resolve(loc);
		}).catch((e) => reject(e.message));
	});
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const isDate = (date) => {
	return new Date(date) !== "Invalid Date" && !isNaN(new Date(date));
};
