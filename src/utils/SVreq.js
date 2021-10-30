const SV = new google.maps.StreetViewService();

export function SVreq(loc, settings) {
	return new Promise(async (resolve, reject) => {
		await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), 1000, (res, status) => {
			if (status != google.maps.StreetViewStatus.OK) return reject();
			if (settings.rejectUnofficial && !res.copyright.includes(" Google")) return reject();
			if (settings.rejectUnofficial && res.links.length == 0) return reject();
			if (Date.parse(res.imageDate) < Date.parse(settings.fromDate) || Date.parse(res.imageDate) > Date.parse(settings.toDate)) return reject();
			if (settings.adjustHeading) {
				loc.heading = parseInt(res.links[0]?.heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
			}
			if (settings.adjustPitch) {
				loc.pitch = settings.pitchDeviation;
			}
			loc.lat = res.location.latLng.lat();
			loc.lng = res.location.latLng.lng();
			resolve(loc);
		}).catch((e) => reject(e.message));
	});
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
