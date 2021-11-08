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

			if (!res.time?.length) return reject();
			const fromDate = Date.parse(settings.fromDate);
			const toDate = Date.parse(settings.toDate);
			let dateWithin = false;
			for (var i = 0; i < res.time.length; i++) {
				const iDate = Date.parse(res.time[i].jm.getFullYear() + "-" + (res.time[i].jm.getMonth() + 1));
				if (iDate >= fromDate && iDate <= toDate) {
					dateWithin = true;
					break;
				}
			}
			if (!dateWithin) return reject();

			if (settings.adjustHeading && res.links.length > 0) {
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
