const SV = new google.maps.StreetViewService();

export function SVreq(loc, settings) {
	return new Promise(async (resolve, reject) => {
		await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, (res, status) => {
			if (status != google.maps.StreetViewStatus.OK) return reject();
			if (settings.rejectUnofficial) {
				if (!res.copyright.includes(" Google") || !res.links.length) return reject();
			}
			if (Date.parse(res.imageDate) < Date.parse(settings.fromDate) || Date.parse(res.imageDate) > Date.parse(settings.toDate)) return reject();
			if (settings.adjustHeading && res.links.length) {
				loc.heading = parseInt(res.links[0].heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
			}
			if (settings.adjustPitch) loc.pitch = settings.pitchDeviation;
			loc.lat = res.location.latLng.lat();
			loc.lng = res.location.latLng.lng();
			resolve(loc);
		}).catch((e) => reject(e.message));
	});
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
