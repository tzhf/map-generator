const SV = new google.maps.StreetViewService();

export default function SVreq(loc, settings) {
    return new Promise(async (resolve, reject) => {
        await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, (res, status) => {
            if (status != google.maps.StreetViewStatus.OK) return reject();
            if (settings.rejectUnofficial) {
                if (!/^\xA9 (?:\d+ )?Google$/.test(res.copyright)) return reject();
                if (settings.rejectNoDescription && !res.location.description && !res.location.shortDescription)
                    return reject();
                if (settings.rejectDateless && !res.imageDate) return reject();
                if (settings.getIntersection && res.links.length < 3) return reject();
                if (settings.deadEndsOnly && res.links.length > 1) return reject();
            }

            const fromDate = Date.parse(settings.fromDate);
            const toDate = Date.parse(settings.toDate);

            if (settings.checkAllDates) {
                if (!res.time?.length) return reject();

                let dateWithin = false;
                for (var i = 0; i < res.time.length; i++) {
                    const timeframeDate = Object.values(res.time[i]).find((val) => isDate(val));

                    if (settings.rejectUnofficial && res.time[i].pano.length != 22) continue; // Checks if pano ID is 22 characters long. Otherwise, it's an Ari
                    const iDate = Date.parse(
                        timeframeDate.getFullYear() +
                            "-" +
                            (timeframeDate.getMonth() > 8 ? "" : "0") +
                            (timeframeDate.getMonth() + 1)
                    );

                    if (iDate >= fromDate && iDate <= toDate) {
                        dateWithin = true;
                        if (settings.exportPanoId) loc.panoId = res.time[i].pano;
                        break;
                    }
                }
                if (!dateWithin) return reject();
            } else {
                if (Date.parse(res.imageDate) < fromDate || Date.parse(res.imageDate) > toDate) return reject();
                if (settings.exportPanoId) loc.panoId = res.time[res.time.length - 1].pano;
            }

            loc.lat = res.location.latLng.lat();
            loc.lng = res.location.latLng.lng();

            if (settings.setHeading && res.links.length > 0) {
                if (settings.randomHeadingDeviation) {
                    loc.heading =
                        parseInt(
                            settings.deadEndsOnly && settings.lookBackwards
                                ? res.links[0].heading - 180
                                : res.links[0].heading
                        ) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
                } else {
                    loc.heading =
                        parseInt(
                            settings.deadEndsOnly && settings.lookBackwards
                                ? res.links[0].heading - 180
                                : res.links[0].heading
                        ) + settings.headingDeviation;
                }
            }

            if (settings.setPitch) loc.pitch = settings.pitchDeviation;

            if (settings.setZoom) loc.zoom = settings.zoom;

            resolve(loc);
        }).catch((e) => reject(e.message));
    });
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const isDate = (date) => {
    return new Date(date) !== "Invalid Date" && !isNaN(new Date(date));
};
